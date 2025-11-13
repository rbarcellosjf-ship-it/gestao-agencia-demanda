import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgendamentoRequest {
  conformidade_id: string;
  nome_cliente: string;
  telefone_cliente: string;
  data_opcao_1: string;
  data_opcao_2: string;
  horario_inicio: string;
  horario_fim: string;
  contrato_id?: string;
}

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

    const body: AgendamentoRequest = await req.json();

    // Validar campos obrigatórios
    if (!body.nome_cliente || !body.telefone_cliente || !body.data_opcao_1 || 
        !body.data_opcao_2 || !body.horario_inicio || !body.horario_fim || !body.conformidade_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configurações
    const { data: config } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('chave', 'nome_empresa')
      .single();

    const nomeEmpresa = config?.valor || 'Manchester Financeira';

    // Formatar telefone
    let phoneFormatted = body.telefone_cliente.replace(/\D/g, '');
    if (!phoneFormatted.startsWith('55')) {
      phoneFormatted = '55' + phoneFormatted;
    }
    const chatId = `${phoneFormatted}@c.us`;

    // Formatar datas
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const dataOpcao1Formatada = formatDate(body.data_opcao_1);
    const dataOpcao2Formatada = formatDate(body.data_opcao_2);

    // Criar mensagem
    const message = `Olá, ${body.nome_cliente}! 👋
Aqui é o assistente da ${nomeEmpresa} - Agência Manchester.
Precisamos agendar a assinatura do seu contrato.

Temos as seguintes opções disponíveis:
📅 Opção 1: ${dataOpcao1Formatada}
📅 Opção 2: ${dataOpcao2Formatada}
⏰ Horário disponível: entre ${body.horario_inicio} e ${body.horario_fim}
📍 Local: Avenida Barao Do Rio Branco, 2340

Por gentileza, responda com "1" ou "2" para confirmar a opção desejada.`;

    console.log('Enviando mensagem para:', chatId);

    // Enviar mensagem via Green API
    const greenApiUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/sendMessage/${greenApiToken}`;
    
    const greenResponse = await fetch(greenApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: chatId,
        message: message,
      }),
    });

    if (!greenResponse.ok) {
      const errorText = await greenResponse.text();
      console.error('Erro Green API:', errorText);
      
      // Criar registro com falha
      await supabase.from('entrevistas_agendamento').insert({
        conformidade_id: body.conformidade_id,
        cliente_nome: body.nome_cliente,
        telefone: body.telefone_cliente,
        contrato_id: body.contrato_id,
        data_opcao_1: body.data_opcao_1,
        data_opcao_2: body.data_opcao_2,
        horario_inicio: body.horario_inicio,
        horario_fim: body.horario_fim,
        nome_empresa: nomeEmpresa,
        chat_id: chatId,
        status: 'falha_envio',
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao enviar mensagem WhatsApp' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const greenData = await greenResponse.json();
    console.log('Resposta Green API:', greenData);

    // Criar registro no banco
    const { data: agendamento, error: dbError } = await supabase
      .from('entrevistas_agendamento')
      .insert({
        conformidade_id: body.conformidade_id,
        cliente_nome: body.nome_cliente,
        telefone: body.telefone_cliente,
        contrato_id: body.contrato_id,
        data_opcao_1: body.data_opcao_1,
        data_opcao_2: body.data_opcao_2,
        horario_inicio: body.horario_inicio,
        horario_fim: body.horario_fim,
        nome_empresa: nomeEmpresa,
        chat_id: chatId,
        mensagem_id: greenData.idMessage,
        status: 'pendente',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar agendamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Agendamento criado com sucesso:', agendamento);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: agendamento,
        message: 'Mensagem enviada com sucesso via WhatsApp'
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
