import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
const DEBUG_INBOUND = Deno.env.get("DEBUG_INBOUND") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Extrai o distribuicao_id do endereço de email (ex: tarefa-uuid@domain.com)
 * Deve aceitar UUID/IDs com '-' '_' etc.
 */
function extractDistribuicaoId(toAddress: string): string | null {
  const match = toAddress.match(/tarefa-([0-9a-zA-Z_-]+)@/);
  return match ? match[1] : null;
}

function stripQuotedHtml(html: string): string {
  const idx = html.toLowerCase().indexOf("<blockquote");
  return idx >= 0 ? html.slice(0, idx) : html;
}

function htmlToText(html: string): string {
  return html
    // quebras de linha
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6)\s*>/gi, "\n")
    // remover tags
    .replace(/<[^>]*>/g, "")
    // entidades comuns
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // numéricas
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // colapsar espaços/linhas
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hasConfirmation(candidateText: string): { confirmed: boolean; matched: string | null } {
  const normalized = normalizeForMatch(candidateText);

  // termos (sem acento porque já normalizamos)
  const pattern =
    /(^|[^a-z0-9])(ok|feito|feita|concluido|concluida|done|finalizado|finalizada|conclui|concluindo)([^a-z0-9]|$)/i;

  const match = normalized.match(pattern);
  return { confirmed: !!match, matched: match?.[2] ?? null };
}

// Removida função checkAllTasksCompleted - agora fechamos a demanda na primeira resposta

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validar webhook secret (flexível)
    const webhookSecret = req.headers.get("x-webhook-secret");
    console.log("Request headers info:", {
      hasWebhookSecret: !!webhookSecret,
      userAgent: req.headers.get("user-agent") || "",
    });

    if (WEBHOOK_SECRET && webhookSecret && webhookSecret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload));

    const eventType = payload.type;
    const event = payload.data || payload;

    if (eventType !== "email.received") {
      return new Response(JSON.stringify({ success: true, action: "ignored", reason: "Not email.received event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailId: string = event.email_id;
    const toAddresses: any[] = event.to || [];
    const fromAddress: string = event.from || "";
    const subject: string = event.subject || "";

    console.log("[INBOUND] subject:", subject);

    // encontrar distribuicao_id no alias
    let distribuicaoId: string | null = null;
    let targetAddress: string | null = null;

    for (const addr of toAddresses) {
      const email = typeof addr === "string" ? addr : addr.email || addr;
      const extracted = extractDistribuicaoId(email);
      if (extracted) {
        distribuicaoId = extracted;
        targetAddress = email;
        break;
      }
    }

    if (!distribuicaoId) {
      await supabase.from("task_email_events").insert({
        event_type: "email_received_invalid",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: toAddresses.map((a) => (typeof a === "string" ? a : a.email || a)).join(", "),
        subject,
        action_taken: "ignored_no_id",
        raw_payload: payload,
      });

      return new Response(JSON.stringify({ success: true, action: "ignored", reason: "No valid distribuicao_id found in to address" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Found distribuicao_id:", distribuicaoId);

    const { data: distribuicao, error: distError } = await supabase
      .from("distribuicao_tarefas")
      .select("*")
      .eq("id", distribuicaoId)
      .single();

    if (distError || !distribuicao) {
      await supabase.from("task_email_events").insert({
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject,
        action_taken: "ignored_not_found",
        raw_payload: payload,
      });

      return new Response(JSON.stringify({ success: true, action: "ignored", reason: "Distribuição não encontrada", distribuicao_id: distribuicaoId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (distribuicao.status === "concluida") {
      await supabase.from("task_email_events").insert({
        distribuicao_id: distribuicaoId,
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject,
        action_taken: "ignored_already_completed",
        raw_payload: payload,
      });

      return new Response(JSON.stringify({ success: true, action: "ignored", reason: "Tarefa já concluída", distribuicao_id: distribuicaoId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Buscar email completo via Resend receiving API
    let text = "";
    let html = "";

    try {
      const { data: email } = await resend.emails.receiving.get(emailId);
      text = email?.text ?? "";
      html = email?.html ?? "";
    } catch (e) {
      console.log("[INBOUND] Failed to fetch receiving email:", e);
    }

    // 2-5) candidateText com subject + text + html convertido (apenas topo)
    const htmlTop = stripQuotedHtml(html);
    const htmlTopText = htmlToText(htmlTop);
    const candidateText = [subject, text, htmlTopText].filter(Boolean).join("\n\n");

    // 9) logs
    console.log("[INBOUND] text_len:", text.length);
    console.log("[INBOUND] html_len:", html.length);
    console.log("[INBOUND] candidate_preview:", candidateText.slice(0, 200));

    const { confirmed, matched } = hasConfirmation(candidateText);

    const debugPayload = DEBUG_INBOUND
      ? {
          preview_subject: subject.slice(0, 120),
          preview_text: candidateText.slice(0, 400),
          lens: { text_len: text.length, html_len: html.length, htmlTop_len: htmlTop.length },
        }
      : {};

    if (!confirmed) {
      await supabase.from("task_email_events").insert({
        distribuicao_id: distribuicaoId,
        event_type: "email_received",
        email_id: emailId,
        from_addr: fromAddress,
        to_addr: targetAddress,
        subject,
        body_preview: candidateText.slice(0, 500),
        action_taken: "ignored_no_keyword",
        raw_payload: payload,
      });

      return new Response(
        JSON.stringify({ success: true, action: "ignored", reason: "Nenhuma palavra-chave de confirmação encontrada", distribuicao_id: distribuicaoId, ...debugPayload }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7) atualizar tarefa
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

    if (updateError) throw updateError;

    await supabase.from("task_email_events").insert({
      distribuicao_id: distribuicaoId,
      event_type: "email_received",
      email_id: emailId,
      from_addr: fromAddress,
      to_addr: targetAddress,
      subject,
      body_preview: candidateText.slice(0, 500),
      action_taken: `completed_via_keyword:${matched ?? "unknown"}`,
      raw_payload: payload,
    });

    // NOVA REGRA: Fechar a demanda IMEDIATAMENTE na primeira resposta
    let demandUpdated = false;
    let demandId: string | null = null;

    let whatsappSent = false;

    if (distribuicao.tipo_tarefa === "demanda" && distribuicao.referencia_id) {
      demandId = distribuicao.referencia_id;
      
      // 1) Buscar dados completos da demanda
      const { data: demandData, error: demandFetchError } = await supabase
        .from("demands")
        .select("type, cpf, cca_user_id")
        .eq("id", demandId)
        .single();

      if (demandFetchError) {
        console.error("[INBOUND] Erro ao buscar demanda:", demandFetchError);
      }

      // 2) Atualizar a demanda para concluída imediatamente
      const { error: demandError } = await supabase
        .from("demands")
        .update({
          status: "concluida",
          concluded_at: new Date().toISOString(),
          response_text: `Concluída via e-mail (${matched}).`,
        })
        .eq("id", demandId);

      if (demandError) {
        console.error("[INBOUND] Erro ao atualizar demanda:", demandError);
      } else {
        demandUpdated = true;
        console.log("[INBOUND] Demanda atualizada para concluída:", demandId);
      }

      // 3) Atualizar TODAS as distribuições dessa demanda para concluída (consistência)
      const { error: allDistError } = await supabase
        .from("distribuicao_tarefas")
        .update({
          status: "concluida",
          concluida_em: new Date().toISOString(),
          concluida_por_email: true,
        })
        .eq("tipo_tarefa", "demanda")
        .eq("referencia_id", demandId);

      if (allDistError) {
        console.error("[INBOUND] Erro ao atualizar todas distribuições:", allDistError);
      } else {
        console.log("[INBOUND] Todas distribuições da demanda atualizadas:", demandId);
      }

      // 4) Enviar WhatsApp para o CCA que abriu a demanda
      if (demandData?.cca_user_id && demandUpdated) {
        try {
          // Buscar telefone do CCA
          const { data: ccaData, error: ccaError } = await supabase
            .from("profiles")
            .select("phone, full_name")
            .eq("user_id", demandData.cca_user_id)
            .maybeSingle();

          if (ccaError) {
            console.error("[INBOUND] Erro ao buscar perfil do CCA:", ccaError);
          }

          if (ccaData?.phone) {
            // Buscar template de WhatsApp
            const { data: whatsappTemplate } = await supabase
              .from("whatsapp_templates")
              .select("*")
              .eq("template_key", "demanda_respondida")
              .maybeSingle();

            // Mapa de tipos para labels legíveis
            const demandTypeLabels: Record<string, string> = {
              autoriza_reavaliacao: "Autorização de Reavaliação",
              desconsidera_avaliacoes: "Desconsidera Avaliações",
              vincula_imovel: "Vincula Imóvel",
              cancela_avaliacao_sicaq: "Cancela Avaliação SICAQ",
              cancela_proposta_siopi: "Cancela Proposta SIOPI",
              solicitar_avaliacao_sigdu: "Solicitar Avaliação SIGDU",
              outras: "Outras",
              incluir_pis_siopi: "Incluir PIS SIOPI",
              autoriza_vendedor_restricao: "Autoriza Vendedor com Restrição",
            };

            const typeLabel = demandTypeLabels[demandData.type] || demandData.type;

            // Montar mensagem
            let whatsappMessage: string;
            if (whatsappTemplate?.message) {
              whatsappMessage = whatsappTemplate.message
                .replace(/\{\{status\}\}/g, "✅ Concluída")
                .replace(/\{\{tipo_demanda\}\}/g, typeLabel)
                .replace(/\{\{resposta\}\}/g, `Concluída via e-mail (${matched}).`);
            } else {
              whatsappMessage = `🔔 *Demanda Concluída*\n\n*Tipo:* ${typeLabel}\n*Status:* ✅ Concluída\n\nSua demanda foi concluída via resposta por e-mail.`;
            }

            // Enviar WhatsApp via edge function
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

            const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                phone: ccaData.phone,
                message: whatsappMessage,
              }),
            });

            if (whatsappResponse.ok) {
              whatsappSent = true;
              console.log("[INBOUND] WhatsApp enviado para CCA:", ccaData.phone);
            } else {
              const whatsappError = await whatsappResponse.text();
              console.error("[INBOUND] Erro ao enviar WhatsApp:", whatsappError);
            }
          } else {
            console.log("[INBOUND] CCA não possui telefone cadastrado");
          }
        } catch (whatsappErr) {
          console.error("[INBOUND] Exceção ao enviar WhatsApp:", whatsappErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "completed",
        distribuicao_id: distribuicaoId,
        matched_keyword: matched,
        demand_updated: demandUpdated,
        demand_id: demandId,
        whatsapp_sent: whatsappSent,
        ...debugPayload,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[INBOUND] Error processing inbound email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
