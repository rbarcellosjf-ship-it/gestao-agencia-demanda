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

    const payload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    // Verificar se é uma mensagem recebida
    if (payload.typeWebhook !== 'incomingMessageReceived') {
      console.log('Tipo de webhook não suportado:', payload.typeWebhook);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook ignorado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatId = payload.messageData?.chatId;
    const messageText = payload.messageData?.textMessageData?.textMessage?.trim();

    if (!chatId || !messageText) {
      console.log('Dados incompletos no webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar agendamento pendente para este chat
    const { data: agendamento, error: searchError } = await supabase
      .from('entrevistas_agendamento')
      .select('*')
      .eq('chat_id', chatId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error('Erro ao buscar agendamento:', searchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar agendamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agendamento) {
      console.log('Nenhum agendamento pendente encontrado para:', chatId);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum agendamento pendente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Agendamento encontrado:', agendamento.id);
    console.log('Resposta do cliente:', messageText);

    let responseMessage = '';
    let dataConfirmada = null;
    let opcaoEscolhida = null;
    let novoStatus = 'pendente';

    // Processar resposta
    if (messageText === '1') {
      dataConfirmada = agendamento.data_opcao_1;
      opcaoEscolhida = 1;
      novoStatus = 'confirmado';

      const dateFormatted = new Date(dataConfirmada + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      responseMessage = `Perfeito, ${agendamento.cliente_nome}! ✅
Sua entrevista para assinatura do contrato foi agendada para ${dateFormatted} entre ${agendamento.horario_inicio} e ${agendamento.horario_fim}.
📍 Local: ${agendamento.endereco_agencia}
Aguardamos você na Agência ${agendamento.agencia}. Até breve!`;

    } else if (messageText === '2') {
      dataConfirmada = agendamento.data_opcao_2;
      opcaoEscolhida = 2;
      novoStatus = 'confirmado';

      const dateFormatted = new Date(dataConfirmada + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      responseMessage = `Perfeito, ${agendamento.cliente_nome}! ✅
Sua entrevista para assinatura do contrato foi agendada para ${dateFormatted} entre ${agendamento.horario_inicio} e ${agendamento.horario_fim}.
📍 Local: ${agendamento.endereco_agencia}
Aguardamos você na Agência ${agendamento.agencia}. Até breve!`;

    } else {
      responseMessage = `Desculpe, não entendi sua resposta.
Por favor, envie "1" ou "2" para escolher uma das opções disponíveis.`;
    }

    // Enviar resposta via Green API
    const greenApiUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/sendMessage/${greenApiToken}`;
    
    const greenResponse = await fetch(greenApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: chatId,
        message: responseMessage,
      }),
    });

    if (!greenResponse.ok) {
      console.error('Erro ao enviar resposta Green API:', await greenResponse.text());
    } else {
      console.log('Resposta enviada com sucesso');
    }

    // Atualizar banco de dados se confirmado
    if (novoStatus === 'confirmado') {
      const { error: updateError } = await supabase
        .from('entrevistas_agendamento')
        .update({
          status: novoStatus,
          data_confirmada: dataConfirmada,
          opcao_escolhida: opcaoEscolhida,
        })
        .eq('id', agendamento.id);

      if (updateError) {
        console.error('Erro ao atualizar agendamento:', updateError);
      }

      // Atualizar também o status da conformidade
      if (agendamento.conformidade_id) {
        const { error: confError } = await supabase
          .from('conformidades')
          .update({
            status: 'Agendado',
            data_agendamento: dataConfirmada,
          })
          .eq('id', agendamento.conformidade_id);

        if (confError) {
          console.error('Erro ao atualizar conformidade:', confError);
        }
      }

      console.log('Agendamento confirmado com sucesso');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
