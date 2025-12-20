import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Palavras-chave que indicam confirmação de conclusão
const CONFIRMATION_KEYWORDS = [
  "ok", "feito", "feita", "concluido", "concluído", "concluida", "concluída", 
  "done", "finalizado", "finalizada", "pronto", "pronta", "realizado", "realizada"
];

/**
 * Extrai o distribuicao_id do endereço de email (ex: tarefa-uuid@domain.com)
 */
function extractDistribuicaoId(toAddress: string): string | null {
  // Suporta UUID e IDs numéricos
  const match = toAddress.match(/tarefa-([a-zA-Z0-9-]+)@/);
  return match ? match[1] : null;
}

/**
 * Normaliza o texto removendo acentos e convertendo para lowercase
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se o texto contém palavras-chave de confirmação
 */
function hasConfirmationKeyword(text: string): { confirmed: boolean; matchedKeyword: string | null } {
  const normalizedText = normalizeText(text);
  const words = normalizedText.split(" ");
  
  for (const keyword of CONFIRMATION_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    // Verificar se a palavra-chave existe como palavra inteira
    if (words.includes(normalizedKeyword)) {
      return { confirmed: true, matchedKeyword: keyword };
    }
  }
  
  return { confirmed: false, matchedKeyword: null };
}

/**
 * Verifica se todas as distribuições de uma referência estão concluídas
 */
async function checkAllTasksCompleted(
  supabase: any, 
  referenciaId: string, 
  tipoTarefa: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("distribuicao_tarefas")
    .select("status")
    .eq("referencia_id", referenciaId)
    .eq("tipo_tarefa", tipoTarefa);
  
  if (error || !data) return false;
  
  return data.every((task: any) => task.status === "concluida");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas aceitar POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Validar webhook secret (flexível para aceitar Resend que não envia header por padrão)
    const webhookSecret = req.headers.get("x-webhook-secret");
    const userAgent = req.headers.get("user-agent") || "";
    const resendWebhookId = req.headers.get("x-resend-webhook-id");
    
    // Log para debug
    console.log("Request headers info:", { 
      hasWebhookSecret: !!webhookSecret,
      userAgent,
      hasResendWebhookId: !!resendWebhookId
    });
    
    // Se um secret está configurado E um header foi enviado, validar
    // Se nenhum header foi enviado, permitir (o Resend não envia header secret por padrão)
    if (WEBHOOK_SECRET && webhookSecret && webhookSecret !== WEBHOOK_SECRET) {
      console.error("Invalid webhook secret - header provided but doesn't match");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Aviso em dev quando secret configurado mas não enviado
    if (WEBHOOK_SECRET && !webhookSecret) {
      console.log("Note: RESEND_WEBHOOK_SECRET is configured but no x-webhook-secret header received. Allowing request (Resend default behavior).");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse o payload do webhook
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload));

    // Estrutura esperada do Resend: { type: "email.received", data: {...} }
    const eventType = payload.type;
    const eventData = payload.data || payload;

    if (eventType !== "email.received") {
      console.log("Ignoring non-email.received event:", eventType);
      return new Response(
        JSON.stringify({ success: true, action: "ignored", reason: "Not email.received event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair informações do evento
    const emailId = eventData.email_id || eventData.id;
    const toAddresses = eventData.to || [];
    const fromAddress = eventData.from || "";
    const subject = eventData.subject || "";

    console.log("Processing email:", { emailId, to: toAddresses, from: fromAddress, subject });

    // Encontrar o endereço de tarefa no campo "to"
    let distribuicaoId: string | null = null;
    let targetAddress: string | null = null;

    for (const addr of toAddresses) {
      const extracted = extractDistribuicaoId(typeof addr === 'string' ? addr : addr.email || addr);
      if (extracted) {
        distribuicaoId = extracted;
        targetAddress = typeof addr === 'string' ? addr : addr.email || addr;
        break;
      }
    }

    if (!distribuicaoId) {
      console.log("No distribuicao_id found in to addresses:", toAddresses);
      
      // Registrar evento mesmo sem ID válido
      await supabase.from("task_email_events").insert({
        event_type: "email_received_invalid",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: toAddresses.join(", "),
        subject: subject,
        action_taken: "ignored_no_id",
        raw_payload: payload,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "ignored", 
          reason: "No valid distribuicao_id found in to address" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found distribuicao_id:", distribuicaoId);

    // Buscar a distribuição para verificar se existe e está em andamento
    const { data: distribuicao, error: distError } = await supabase
      .from("distribuicao_tarefas")
      .select("*")
      .eq("id", distribuicaoId)
      .single();

    if (distError || !distribuicao) {
      console.error("Distribuição não encontrada:", distError);
      
      await supabase.from("task_email_events").insert({
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject: subject,
        action_taken: "ignored_not_found",
        raw_payload: payload,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "ignored", 
          reason: "Distribuição não encontrada",
          distribuicao_id: distribuicaoId
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se já está concluída, ignorar
    if (distribuicao.status === "concluida") {
      console.log("Distribuição já concluída, ignorando");
      
      await supabase.from("task_email_events").insert({
        distribuicao_id: distribuicaoId,
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject: subject,
        action_taken: "ignored_already_completed",
        raw_payload: payload,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "ignored", 
          reason: "Tarefa já concluída",
          distribuicao_id: distribuicaoId
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tentar buscar o conteúdo do email via API Resend
    let emailContent = "";
    let emailBodyPreview = "";
    
    try {
      // Resend API para buscar email recebido
      // Nota: Dependendo da API do Resend, pode ser necessário ajustar
      const emailDetails = await resend.emails.get(emailId);
      console.log("Email details from Resend:", JSON.stringify(emailDetails));
      
      if (emailDetails.data) {
        emailContent = emailDetails.data.text || emailDetails.data.html || "";
        emailBodyPreview = emailContent.substring(0, 500);
      }
    } catch (fetchError) {
      console.log("Could not fetch email content from Resend:", fetchError);
      // Usar o subject como fallback para verificação
      emailContent = subject;
      emailBodyPreview = `[Subject only] ${subject}`;
    }

    // Verificar se há palavra-chave de confirmação
    const { confirmed, matchedKeyword } = hasConfirmationKeyword(emailContent || subject);
    console.log("Confirmation check:", { confirmed, matchedKeyword, textChecked: emailContent || subject });

    if (confirmed) {
      // Atualizar a distribuição como concluída
      const { error: updateError } = await supabase
        .from("distribuicao_tarefas")
        .update({
          status: "concluida",
          concluida_em: new Date().toISOString(),
          concluida_por_email: true,
          inbound_email_id: emailId,
          inbound_from: fromAddress,
        })
        .eq("id", distribuicaoId);

      if (updateError) {
        console.error("Error updating distribuicao:", updateError);
        throw updateError;
      }

      console.log("Tarefa concluída via email:", distribuicaoId);

      // Registrar evento de conclusão
      await supabase.from("task_email_events").insert({
        distribuicao_id: distribuicaoId,
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject: subject,
        body_preview: emailBodyPreview,
        action_taken: `completed_via_keyword:${matchedKeyword}`,
        raw_payload: payload,
      });

      // Verificar se todas as tarefas da referência estão concluídas
      // e atualizar a demanda se for o caso
      if (distribuicao.tipo_tarefa === "demanda") {
        const allCompleted = await checkAllTasksCompleted(
          supabase, 
          distribuicao.referencia_id, 
          "demanda"
        );

        if (allCompleted) {
          const { error: demandError } = await supabase
            .from("demands")
            .update({
              status: "concluida",
              concluded_at: new Date().toISOString(),
            })
            .eq("id", distribuicao.referencia_id);

          if (demandError) {
            console.error("Error updating demand status:", demandError);
          } else {
            console.log("Demanda também concluída:", distribuicao.referencia_id);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "completed", 
          distribuicao_id: distribuicaoId,
          matched_keyword: matchedKeyword,
          reason: "Tarefa concluída via resposta de email"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Não confirmou - apenas registrar o evento
      await supabase.from("task_email_events").insert({
        distribuicao_id: distribuicaoId,
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject: subject,
        body_preview: emailBodyPreview,
        action_taken: "ignored_no_keyword",
        raw_payload: payload,
      });

      console.log("Email recebido mas sem palavra-chave de confirmação");

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "ignored", 
          distribuicao_id: distribuicaoId,
          reason: "Nenhuma palavra-chave de confirmação encontrada"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
