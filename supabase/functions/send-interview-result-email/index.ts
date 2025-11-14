import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterviewResultRequest {
  entrevistaId: string;
  aprovado: boolean;
  observacoes?: string;
  motivo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { entrevistaId, aprovado, observacoes, motivo }: InterviewResultRequest = await req.json();

    console.log("Processing interview result:", { entrevistaId, aprovado });

    // 1. Atualizar status da entrevista
    const novoStatus = aprovado ? "Aprovado" : "Reprovado";
    const { error: updateError } = await supabaseClient
      .from("agendamentos")
      .update({ 
        status: novoStatus,
        observacoes: observacoes || motivo || null
      })
      .eq("id", entrevistaId)
      .eq("tipo", "entrevista");

    if (updateError) throw updateError;

    // 2. Buscar dados da entrevista
    const { data: entrevista, error: fetchError } = await supabaseClient
      .from("agendamentos")
      .select("cpf, cca_user_id")
      .eq("id", entrevistaId)
      .single();

    if (fetchError) throw fetchError;

    // 3. Se aprovado, atualizar conformidade
    if (aprovado && entrevista.cpf) {
      const normalizedCPF = entrevista.cpf.replace(/\D/g, '');
      
      console.log('[INTERVIEW_APPROVAL]', {
        entrevistaId,
        aprovado,
        cpf: entrevista.cpf,
        normalized: normalizedCPF,
        cca_user_id: entrevista.cca_user_id
      });
      
      const { data: conformidades, error: confError } = await supabaseClient
        .from("conformidades")
        .select("id")
        .or(`cpf.eq.${normalizedCPF},cpf.eq.${entrevista.cpf}`)
        .eq("cca_user_id", entrevista.cca_user_id);

      if (confError) {
        console.error("Error fetching conformidades:", confError);
      } else if (conformidades && conformidades.length > 0) {
        console.log(`[INTERVIEW_APPROVAL] Found ${conformidades.length} conformidades to update`);
        for (const conf of conformidades) {
          const { error: updateConfError } = await supabaseClient
            .from("conformidades")
            .update({
              entrevista_aprovada: true,
              entrevista_id: entrevistaId,
              observacoes: observacoes || null,
            })
            .eq("id", conf.id);

          if (updateConfError) {
            console.error("Error updating conformidade:", updateConfError);
          } else {
            console.log(`[INTERVIEW_APPROVAL] Successfully updated conformidade ${conf.id}`);
          }
        }
      }
    }

    // 4. Buscar email do CCA
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email_preferencia, full_name")
      .eq("user_id", entrevista.cca_user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // 5. Enviar e-mail
    if (profile?.email_preferencia) {
      const subject = aprovado 
        ? "✅ Entrevista Aprovada - Contrato Liberado para Assinatura"
        : "❌ Entrevista Reprovada";

      const emailBody = aprovado
        ? `
          <h2>Olá ${profile.full_name},</h2>
          <p>Temos uma ótima notícia! A entrevista do cliente <strong>CPF: ${entrevista.cpf}</strong> foi aprovada.</p>
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>O contrato está liberado para assinatura</li>
            <li>Todos os documentos foram verificados</li>
            <li>Você pode prosseguir com o agendamento da assinatura</li>
          </ul>
          ${observacoes ? `<p><strong>Observações:</strong> ${observacoes}</p>` : ""}
          <p>Atenciosamente,<br>Equipe de Conformidade</p>
        `
        : `
          <h2>Olá ${profile.full_name},</h2>
          <p>Infelizmente, a entrevista do cliente <strong>CPF: ${entrevista.cpf}</strong> foi reprovada.</p>
          ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
          <p>Por favor, entre em contato com o setor de conformidade para mais informações.</p>
          <p>Atenciosamente,<br>Equipe de Conformidade</p>
        `;

      const emailResponse = await resend.emails.send({
        from: "Sistema de Conformidade <onboarding@resend.dev>",
        to: [profile.email_preferencia],
        subject,
        html: emailBody,
      });

      console.log("Email sent:", emailResponse);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: aprovado ? "Entrevista aprovada e conformidade atualizada" : "Entrevista reprovada"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-interview-result-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
