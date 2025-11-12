import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendSignedDocumentRequest {
  demandId: string;
  ccaUserId: string;
  cpf: string;
  matricula: string;
  pdfPath: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 [Send Signed Document] Starting email send process...");
    
    const { demandId, ccaUserId, cpf, matricula, pdfPath }: SendSignedDocumentRequest = await req.json();

    if (!ccaUserId || !pdfPath) {
      throw new Error("ID do usuário CCA e caminho do PDF são obrigatórios");
    }

    console.log("✓ [Send Signed Document] Request validated");

    // Create Supabase client with service role to access auth and storage
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("📧 [Send Signed Document] Fetching CCA user data...");

    // Get CCA profile
    const { data: ccaProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', ccaUserId)
      .single();

    if (profileError) {
      console.error("❌ [Send Signed Document] Error fetching profile:", profileError);
      throw new Error(`Erro ao buscar perfil do CCA: ${profileError.message}`);
    }

    // Get CCA email from auth
    const { data: { user: ccaUser }, error: authError } = await supabaseClient.auth.admin.getUserById(ccaUserId);

    if (authError || !ccaUser) {
      console.error("❌ [Send Signed Document] Error fetching user:", authError);
      throw new Error(`Erro ao buscar usuário do CCA: ${authError?.message || 'Usuário não encontrado'}`);
    }

    const ccaEmail = ccaUser.email;
    const ccaName = ccaProfile?.full_name || 'CCA';

    if (!ccaEmail) {
      throw new Error('Email do CCA não encontrado');
    }

    console.log("✓ [Send Signed Document] CCA data fetched:", { email: ccaEmail, name: ccaName });

    console.log("📄 [Send Signed Document] Downloading PDF from storage...");

    // Download the PDF file from Supabase storage
    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from('demand-pdfs')
      .download(pdfPath);

    if (downloadError) {
      console.error("❌ [Send Signed Document] Error downloading PDF:", downloadError);
      throw new Error(`Erro ao baixar PDF: ${downloadError.message}`);
    }

    const pdfSize = pdfData.size;
    console.log(`✓ [Send Signed Document] PDF downloaded successfully (${(pdfSize / 1024).toFixed(2)} KB)`);

    // Generate email content FIRST
    const dataAssinatura = new Date().toLocaleDateString('pt-BR');
    
    // Fetch email template from database
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_key', 'autorizacao_assinada')
      .single();

    console.log("📧 [Send Signed Document] Template fetch result:", { found: !!template, error: templateError });

    let emailSubject = `Autorização Assinada - MO ${matricula || 'N/A'}`;
    let emailBodyText = '';

    if (template && !templateError) {
      // Replace template variables
      const variables: Record<string, string> = {
        nome_cca: ccaName,
        cpf: cpf || 'N/A',
        matricula: matricula || 'N/A',
        data_assinatura: dataAssinatura
      };
      
      emailSubject = template.subject.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => variables[key] || match);
      emailBodyText = template.body.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => variables[key] || match);
      
      // Convert line breaks to HTML
      emailBodyText = emailBodyText.replace(/\n/g, '<br>');
      
      console.log("✓ [Send Signed Document] Template variables replaced");
    } else {
      // Fallback to hardcoded HTML content
      console.log("⚠️ [Send Signed Document] Using fallback HTML content");
      emailBodyText = `
        <p>Olá <strong>${ccaName}</strong>,</p>
        
        <p>A autorização de vendedor com restrição foi assinada digitalmente e está pronta para uso.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div class="detail">
            <span class="label">📋 CPF:</span> ${cpf || 'N/A'}
          </div>
          <div class="detail">
            <span class="label">🏠 Matrícula:</span> ${matricula || 'N/A'}
          </div>
          <div class="detail">
            <span class="label">📅 Data da Assinatura:</span> ${dataAssinatura}
          </div>
        </div>
        
        <p>O <strong>PDF assinado digitalmente</strong> está anexado a este email para sua conveniência.</p>
        
        <p>Você também pode acessar o documento diretamente no sistema de gestão a qualquer momento.</p>
      `;
    }

    // Check if PDF is too large for email attachment (10MB limit for reliability)
    const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
    interface EmailAttachment {
      filename: string;
      content: string;
    }
    let attachments: EmailAttachment[] = [];

    if (pdfSize > MAX_ATTACHMENT_SIZE) {
      console.log(`⚠️ [Send Signed Document] PDF too large (${(pdfSize / 1024 / 1024).toFixed(2)} MB), creating signed URL instead`);
      
      // Create a signed URL valid for 7 days
      const { data: signedUrlData, error: urlError } = await supabaseClient.storage
        .from('demand-pdfs')
        .createSignedUrl(pdfPath, 604800); // 7 days in seconds

      if (urlError) {
        console.error("❌ [Send Signed Document] Error creating signed URL:", urlError);
        throw new Error(`Erro ao criar URL assinada: ${urlError.message}`);
      }

      console.log("✓ [Send Signed Document] Signed URL created successfully");

      // Add download link to email body
      emailBodyText += `\n\n<p style="margin-top: 30px;"><a href="${signedUrlData.signedUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">📥 Baixar PDF Assinado</a></p>\n<p style="font-size: 12px; color: #666;">O link de download é válido por 7 dias.</p>`;
    } else {
      // Convert PDF to base64 using Deno's standard library (robust and efficient)
      const arrayBuffer = await pdfData.arrayBuffer();
      const base64Pdf = base64Encode(arrayBuffer);

      console.log(`✓ [Send Signed Document] PDF converted to base64 (${(pdfSize / 1024).toFixed(2)} KB)`);

      attachments = [
        {
          filename: `autorizacao_assinada_${matricula || 'documento'}.pdf`,
          content: base64Pdf,
        },
      ];
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Autorização Assinada Digitalmente</h1>
            </div>
            <div class="content">
              ${emailBodyText}
              
              <div class="footer">
                <p>Este é um email automático do Sistema de Gestão.</p>
                <p>Em caso de dúvidas, entre em contato com a gerência.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("📤 [Send Signed Document] Sending email via Resend...");

    // Send email with PDF attachment or download link
    const emailResponse = await resend.emails.send({
      from: "Sistema de Gestão <onboarding@resend.dev>",
      to: [ccaEmail],
      subject: emailSubject,
      html: htmlContent,
      attachments: attachments,
    });

    console.log("✅ [Send Signed Document] Email sent successfully:", emailResponse);

    // Send WhatsApp notification
    console.log("📱 [Send Signed Document] Sending WhatsApp notification...");
    
    try {
      const { data: ccaProfilePhone } = await supabaseClient
        .from('profiles')
        .select('phone')
        .eq('user_id', ccaUserId)
        .single();

      if (ccaProfilePhone?.phone) {
        const whatsappMessage = `🔐 *Autorização Assinada Digitalmente*\n\nOlá ${ccaName}!\n\nA autorização de vendedor com restrição foi assinada digitalmente e enviada para seu email.\n\n📋 *CPF:* ${cpf || 'N/A'}\n🏠 *Matrícula:* ${matricula || 'N/A'}\n📅 *Data da Assinatura:* ${dataAssinatura}\n\nO PDF assinado foi enviado para ${ccaEmail}`;

        const { error: whatsappError } = await supabaseClient.functions.invoke('send-whatsapp', {
          body: {
            phone: ccaProfilePhone.phone,
            message: whatsappMessage
          }
        });

        if (whatsappError) {
          console.error("⚠️ [Send Signed Document] WhatsApp notification failed:", whatsappError);
        } else {
          console.log("✅ [Send Signed Document] WhatsApp notification sent");
        }
      } else {
        console.log("⚠️ [Send Signed Document] No phone number found for CCA");
      }
    } catch (whatsappError) {
      console.error("⚠️ [Send Signed Document] WhatsApp notification error:", whatsappError);
    }

    return new Response(JSON.stringify({ 
      success: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ [Send Signed Document] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
