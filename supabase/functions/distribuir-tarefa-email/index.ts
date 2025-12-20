import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const INBOUND_DOMAIN = Deno.env.get("RESEND_INBOUND_DOMAIN") || "reply.example.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DistribuirTarefaRequest {
  tipoTarefa: "demanda" | "assinatura" | "comite";
  referenciaId: string;
  empregadosIds: string[];
}

// Função para substituir variáveis no template
function replaceTemplateVariables(template: string, variables: Record<string, string | null | undefined>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
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

    // Buscar dados da referência para substituir variáveis no template
    let referenciaData: Record<string, any> = {};
    let templateKey = `task_${tipoTarefa}`;

    if (tipoTarefa === "demanda") {
      const { data: demandaData, error: demandaError } = await supabaseClient
        .from("demands")
        .select("*")
        .eq("id", referenciaId)
        .single();
      
      if (demandaData) {
        referenciaData = demandaData;
        templateKey = `task_demanda_${demandaData.type}`;
        console.log("Demanda data loaded:", { type: demandaData.type, cpf: demandaData.cpf });
      } else {
        console.error("Error fetching demanda:", demandaError);
      }
    } else if (tipoTarefa === "assinatura") {
      const { data: assinaturaData, error: assinaturaError } = await supabaseClient
        .from("assinaturas_agendamento")
        .select("*")
        .eq("id", referenciaId)
        .single();
      
      if (assinaturaData) {
        referenciaData = assinaturaData;
        console.log("Assinatura data loaded:", { cliente: assinaturaData.cliente_nome });
      } else {
        console.error("Error fetching assinatura:", assinaturaError);
      }
    } else if (tipoTarefa === "comite") {
      const { data: conformidadeData, error: conformidadeError } = await supabaseClient
        .from("conformidades")
        .select("*")
        .eq("id", referenciaId)
        .single();
      
      if (conformidadeData) {
        referenciaData = conformidadeData;
        console.log("Conformidade data loaded:", { cpf: conformidadeData.cpf });
      } else {
        console.error("Error fetching conformidade:", conformidadeError);
      }
    }

    console.log("Looking for template with key:", templateKey);

    const results = [];

    for (const empregadoId of empregadosIds) {
      // 1. Registrar distribuição e capturar o ID usando select().single()
      const { data: distribuicaoData, error: insertError } = await supabaseClient
        .from("distribuicao_tarefas")
        .insert({
          tipo_tarefa: tipoTarefa,
          referencia_id: referenciaId,
          user_id: empregadoId,
          status: "em_andamento",
        })
        .select("id")
        .single();

      if (insertError || !distribuicaoData) {
        console.error("Error inserting task:", insertError);
        results.push({ 
          empregadoId, 
          success: false, 
          error: "insert_failed",
          message: insertError?.message || "Falha ao registrar tarefa"
        });
        continue;
      }

      const distribuicaoId = distribuicaoData.id;
      console.log("Tarefa criada com ID:", distribuicaoId);

      // 2. Buscar dados do empregado da tabela profiles
      const { data: empregado, error: empError } = await supabaseClient
        .from("profiles")
        .select("full_name, email_preferencia")
        .eq("user_id", empregadoId)
        .single();

      if (empError || !empregado?.email_preferencia) {
        console.error("Error fetching empregado:", empError);
        results.push({ 
          empregadoId, 
          success: false, 
          error: "empregado_not_found",
          message: "Email do empregado não encontrado"
        });
        continue;
      }

      // 3. Buscar template de e-mail
      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("subject, body")
        .eq("template_key", templateKey)
        .single();

      // 4. Preparar variáveis para substituição
      const templateVariables: Record<string, string | null | undefined> = {
        // Dados do empregado
        empregado_nome: empregado.full_name,
        empregado_email: empregado.email_preferencia,
        
        // Dados comuns de demanda
        cpf: referenciaData.cpf,
        nome_cliente: referenciaData.nome_cliente,
        matricula: referenciaData.matricula,
        cartorio: referenciaData.cartorio,
        description: referenciaData.description,
        numero_pis: referenciaData.numero_pis,
        codigo_cca: referenciaData.codigo_cca,
        
        // Dados de assinatura
        cliente_nome: referenciaData.cliente_nome,
        telefone: referenciaData.telefone,
        data_opcao_1: referenciaData.data_opcao_1,
        data_opcao_2: referenciaData.data_opcao_2,
        horario_inicio: referenciaData.horario_inicio,
        horario_fim: referenciaData.horario_fim,
        agencia: referenciaData.agencia,
        endereco_agencia: referenciaData.endereco_agencia,
        modalidade_financiamento: referenciaData.modalidade_financiamento,
        tipo_contrato: referenciaData.tipo_contrato,
        
        // Dados de conformidade/comitê
        valor_financiamento: referenciaData.valor_financiamento?.toString(),
        modalidade: referenciaData.modalidade,
        
        // Tipo de tarefa
        tipo_tarefa: tipoTarefa,
      };

      console.log("Template variables prepared:", Object.keys(templateVariables).filter(k => templateVariables[k]));

      // 5. Substituir variáveis no template ou usar fallback
      let subject: string;
      let baseBody: string;

      if (template?.subject && template?.body) {
        subject = replaceTemplateVariables(template.subject, templateVariables);
        baseBody = replaceTemplateVariables(template.body, templateVariables);
        console.log("Template found and variables replaced");
      } else {
        // Fallback para template genérico
        subject = `Nova Tarefa: ${tipoTarefa}`;
        baseBody = `
          <h2>Olá ${empregado.full_name},</h2>
          <p>Você recebeu uma nova tarefa do tipo <strong>${tipoTarefa}</strong>.</p>
          <p>Por favor, acesse o sistema para mais detalhes.</p>
        `;
        console.log("Using fallback template");
      }

      // 6. Criar replyTo único com o ID da distribuição
      const replyToAddress = `tarefa-${distribuicaoId}@${INBOUND_DOMAIN}`;
      console.log("ReplyTo address:", replyToAddress);

      // Adicionar instruções de resposta ao corpo do email
      const bodyWithReplyInstructions = `
        ${baseBody}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          <strong>Dica:</strong> Ao concluir esta tarefa, você pode responder este e-mail com 
          <strong>"ok"</strong>, <strong>"feito"</strong> ou <strong>"concluído"</strong> 
          para finalizar automaticamente no sistema.
        </p>
        <p style="color: #999; font-size: 11px;">Atenciosamente,<br>Sistema de Gestão</p>
      `;

      // 7. Enviar e-mail com replyTo
      try {
        const emailResponse = await resend.emails.send({
          from: "Sistema de Tarefas <noreply@habitacao0126.com>",
          to: [empregado.email_preferencia],
          replyTo: replyToAddress,
          subject,
          html: bodyWithReplyInstructions,
        });

        console.log("Email response:", JSON.stringify(emailResponse));

        // Verificar se houve erro na resposta do Resend
        if (emailResponse.error) {
          console.error("Resend error:", emailResponse.error);
          
          const errorMessage = emailResponse.error.message || "Erro desconhecido";
          const errorName = emailResponse.error.name || "";
          
          // Verificar se é erro de domínio não verificado
          if (errorName === "validation_error" || errorMessage.includes("verify a domain")) {
            results.push({ 
              empregadoId, 
              distribuicaoId,
              success: false, 
              error: "domain_not_verified",
              message: "Domínio não verificado. Configure em resend.com/domains"
            });
          } else {
            results.push({ 
              empregadoId, 
              distribuicaoId,
              success: false, 
              error: errorName,
              message: errorMessage
            });
          }
        } else {
          // 8. Atualizar a tarefa com metadados do email enviado
          const resendSentId = emailResponse.data?.id;
          
          const { error: updateError } = await supabaseClient
            .from("distribuicao_tarefas")
            .update({
              resend_sent_id: resendSentId,
              reply_to_address: replyToAddress,
              last_email_sent_at: new Date().toISOString(),
            })
            .eq("id", distribuicaoId);

          if (updateError) {
            console.error("Error updating task with email metadata:", updateError);
          } else {
            console.log("Task updated with email metadata:", { resendSentId, replyToAddress });
          }

          console.log("Email sent successfully to:", empregado.email_preferencia);
          results.push({ 
            empregadoId, 
            distribuicaoId,
            success: true, 
            email: empregado.email_preferencia,
            replyTo: replyToAddress,
            resendId: resendSentId
          });
        }
      } catch (emailError: any) {
        console.error("Exception sending email:", emailError);
        results.push({ 
          empregadoId, 
          distribuicaoId,
          success: false, 
          error: "exception",
          message: emailError.message || "Erro ao enviar e-mail"
        });
      }
    }

    // Verificar se algum e-mail foi enviado com sucesso
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    // Se todos falharam por domínio não verificado, retornar erro específico
    const domainErrors = results.filter(r => r.error === "domain_not_verified");
    if (domainErrors.length === results.length && results.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "domain_not_verified",
          message: "Domínio de e-mail não verificado. Para enviar e-mails para qualquer destinatário, configure um domínio verificado em resend.com/domains. Atualmente só é possível enviar para o e-mail cadastrado na conta Resend.",
          results
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Se todos falharam por outro motivo
    if (successCount === 0 && failedCount > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "email_send_failed",
          message: `Falha ao enviar e-mails. ${results[0]?.message || "Verifique as configurações do Resend."}`,
          results
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successCount > 0 
          ? `Tarefa distribuída para ${successCount} empregado(s)${failedCount > 0 ? `, ${failedCount} falha(s)` : ""}`
          : "Tarefa registrada, mas nenhum e-mail foi enviado",
        successCount,
        failedCount,
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
