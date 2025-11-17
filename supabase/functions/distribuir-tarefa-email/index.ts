import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DistribuirTarefaRequest {
  tipoTarefa: "demanda" | "assinatura" | "comite";
  referenciaId: string;
  empregadosIds: string[];
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

    const { tipoTarefa, referenciaId, empregadosIds }: DistribuirTarefaRequest = await req.json();

    console.log("Distribuindo tarefa:", { tipoTarefa, referenciaId, empregadosIds });

    const results = [];

    for (const empregadoId of empregadosIds) {
      // 1. Registrar distribuição
      const { error: insertError } = await supabaseClient
        .from("distribuicao_tarefas")
        .insert({
          tipo_tarefa: tipoTarefa,
          referencia_id: referenciaId,
          user_id: empregadoId,
          status: "em_andamento",
        });

      if (insertError) {
        console.error("Error inserting task:", insertError);
        continue;
      }

      // 2. Buscar dados do empregado da tabela profiles
      const { data: empregado, error: empError } = await supabaseClient
        .from("profiles")
        .select("full_name, email_preferencia")
        .eq("user_id", empregadoId)
        .single();

      if (empError || !empregado?.email_preferencia) {
        console.error("Error fetching empregado:", empError);
        continue;
      }

      // 3. Determinar a chave do template baseado no tipo de tarefa
      let templateKey = `task_${tipoTarefa}`;

      // Se for demanda, buscar detalhes para encontrar o tipo específico
      if (tipoTarefa === "demanda") {
        const { data: demandaData } = await supabaseClient
          .from("demands")
          .select("type")
          .eq("id", referenciaId)
          .single();
        
        if (demandaData?.type) {
          templateKey = `task_demanda_${demandaData.type}`;
        }
      }

      console.log("Looking for template with key:", templateKey);

      // 4. Buscar template de e-mail
      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("subject, body")
        .eq("template_key", templateKey)
        .single();

      // Fallback para template genérico
      const subject = template?.subject || `Nova Tarefa: ${tipoTarefa}`;
      const body = template?.body || `
        <h2>Olá ${empregado.full_name},</h2>
        <p>Você recebeu uma nova tarefa do tipo <strong>${tipoTarefa}</strong>.</p>
        <p>Por favor, acesse o sistema para mais detalhes.</p>
        <p>Atenciosamente,<br>Sistema de Gestão</p>
      `;

      // 4. Enviar e-mail
      try {
        const emailResponse = await resend.emails.send({
          from: "Sistema de Tarefas <onboarding@resend.dev>",
          to: [empregado.email_preferencia],
          subject,
          html: body,
        });

        console.log("Email sent to:", empregado.email_preferencia, emailResponse);
        results.push({ empregadoId, success: true });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        results.push({ empregadoId, success: false, error: emailError });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Tarefa distribuída para ${empregadosIds.length} empregado(s)`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in distribuir-tarefa-email:", error);
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
