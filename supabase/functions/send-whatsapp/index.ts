import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone: string;
  message: string;
}

// Test mode: use this number for all messages during testing
const TEST_MODE = true;
const TEST_PHONE = "32999610741";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const instanceId = Deno.env.get("GREENAPI_INSTANCE_ID");
    const token = Deno.env.get("GREENAPI_TOKEN");

    if (!instanceId || !token) {
      console.error("Missing Green API credentials");
      return new Response(
        JSON.stringify({ error: "Missing Green API credentials" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { phone, message }: WhatsAppRequest = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use test phone if in test mode
    let phoneToUse = TEST_MODE ? TEST_PHONE : phone;
    
    // Format phone number (remove non-digits and ensure it has country code)
    let formattedPhone = phoneToUse.replace(/\D/g, "");
    // Always add 55 (Brazil country code) if not present
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }
    
    console.log(`Test mode: ${TEST_MODE}, Original phone: ${phone}, Using phone: ${formattedPhone}`);

    // Green API endpoint for sending messages
    const greenApiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

    console.log("Sending WhatsApp message to:", formattedPhone);

    const response = await fetch(greenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        message: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Green API error:", responseData);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: responseData }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("WhatsApp message sent successfully:", responseData);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
