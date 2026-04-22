import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone: string;
  message: string;
  // Campos opcionais para log/auditoria
  contexto?: string; // ex: "demanda", "agendamento_entrevista"
  referencia_id?: string;
  referencia_tipo?: string;
  cpf?: string;
  codigo_cca?: string;
  destinatario_nome?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cliente para logging (service role para ignorar RLS no insert)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let logPayload: any = {
    contexto: "desconhecido",
    destino: "",
    sucesso: false,
  };

  const writeLog = async (extra: Record<string, any>) => {
    try {
      await supabase.from("whatsapp_logs").insert({ ...logPayload, ...extra });
    } catch (e) {
      console.error("Falha ao gravar whatsapp_logs:", e);
    }
  };

  try {
    const instanceId = Deno.env.get("GREENAPI_INSTANCE_ID");
    const token = Deno.env.get("GREENAPI_TOKEN");

    if (!instanceId || !token) {
      console.error("Missing Green API credentials");
      await writeLog({ erro: "Missing Green API credentials" });
      return new Response(
        JSON.stringify({ error: "Missing Green API credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: WhatsAppRequest = await req.json();
    const {
      phone, message,
      contexto, referencia_id, referencia_tipo,
      cpf, codigo_cca, destinatario_nome,
    } = body;

    logPayload = {
      contexto: contexto || "desconhecido",
      referencia_id: referencia_id || null,
      referencia_tipo: referencia_tipo || null,
      cpf: cpf || null,
      codigo_cca: codigo_cca || null,
      destinatario_nome: destinatario_nome || null,
      destino: phone || "",
      mensagem_preview: message ? message.substring(0, 500) : null,
      sucesso: false,
    };

    if (!phone || !message) {
      await writeLog({ erro: "Phone and message are required" });
      return new Response(
        JSON.stringify({ error: "Phone and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }
    logPayload.destino = formattedPhone;

    const greenApiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
    console.log("Sending WhatsApp message to:", formattedPhone);

    const response = await fetch(greenApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        message: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Green API error:", responseData);
      await writeLog({
        erro: `HTTP ${response.status}: ${JSON.stringify(responseData)}`,
        api_response: responseData,
      });
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: responseData }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp message sent successfully:", responseData);
    await writeLog({ sucesso: true, api_response: responseData });

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    await writeLog({ erro: error?.message || String(error) });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
