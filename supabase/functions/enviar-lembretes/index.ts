import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const greenApiInstanceId = Deno.env.get('GREENAPI_INSTANCE_ID')!;
    const greenApiToken = Deno.env.get('GREENAPI_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar agendamentos pendentes há mais de 24 horas sem lembrete enviado
    const vinteQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: agendamentos, error: searchError } = await supabase
      .from('entrevistas_agendamento')
      .select('*')
      .eq('status', 'pendente')
      .lt('created_at', vinteQuatroHorasAtras)
      .is('lembrete_enviado_em', null);

    if (searchError) {
      console.error('Erro ao buscar agendamentos:', searchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar agendamentos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agendamentos || agendamentos.length === 0) {
      console.log('Nenhum agendamento pendente para enviar lembrete');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum lembrete para enviar', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${agendamentos.length} agendamentos para enviar lembrete`);

    let sucessos = 0;
    let falhas = 0;

    // Enviar lembretes
    for (const agendamento of agendamentos) {
      try {
        const message = `Olá, ${agendamento.cliente_nome}!
Apenas relembrando que ainda precisamos confirmar o melhor horário para a assinatura do seu contrato.
Por favor, responda "1" ou "2" para confirmar.`;

        const greenApiUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/sendMessage/${greenApiToken}`;
        
        const greenResponse = await fetch(greenApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: agendamento.chat_id,
            message: message,
          }),
        });

        if (greenResponse.ok) {
          // Atualizar timestamp do lembrete
          await supabase
            .from('entrevistas_agendamento')
            .update({ lembrete_enviado_em: new Date().toISOString() })
            .eq('id', agendamento.id);

          console.log(`Lembrete enviado para ${agendamento.cliente_nome}`);
          sucessos++;
        } else {
          console.error(`Falha ao enviar lembrete para ${agendamento.cliente_nome}:`, await greenResponse.text());
          falhas++;
        }

        // Aguardar 1 segundo entre mensagens para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Erro ao processar agendamento ${agendamento.id}:`, error);
        falhas++;
      }
    }

    console.log(`Lembretes enviados: ${sucessos} sucessos, ${falhas} falhas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lembretes processados',
        total: agendamentos.length,
        sucessos,
        falhas
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
