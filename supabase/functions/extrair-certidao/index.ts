import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertidaoData {
  livro: string;
  folha: string;
  numero: string;
  cartorio: string;
  cidade: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF base64 é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando extração de certidão de casamento...');
    console.log('Tamanho do base64:', pdfBase64.length);

    // Call Lovable AI to extract data from PDF
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em extrair informações de certidões de casamento brasileiras. Extraia as informações com precisão máxima do documento PDF fornecido.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise cuidadosamente este documento PDF de certidão de casamento e extraia: número do livro, número da folha, número do registro (se houver), nome completo do cartório e cidade do cartório. Se algum dado não estiver visível, deixe o campo vazio.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extrair_certidao',
              description: 'Extrai dados estruturados de uma certidão de casamento',
              parameters: {
                type: 'object',
                properties: {
                  livro: { type: 'string', description: 'Número do livro' },
                  folha: { type: 'string', description: 'Número da folha' },
                  numero: { type: 'string', description: 'Número do registro' },
                  cartorio: { type: 'string', description: 'Nome completo do cartório' },
                  cidade: { type: 'string', description: 'Cidade do cartório' }
                },
                required: ['livro', 'folha', 'cartorio', 'cidade']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extrair_certidao' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Erro na IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('Resposta da IA:', JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('IA não retornou dados estruturados');
    }

    const dadosExtraidos: CertidaoData = JSON.parse(toolCall.function.arguments);

    // Generate standardized text
    const textoGerado = `Casado sob o regime de comunhão parcial de bens, conforme certidão de casamento lavrada no Livro ${dadosExtraidos.livro}, Folha ${dadosExtraidos.folha}${dadosExtraidos.numero ? `, sob nº ${dadosExtraidos.numero}` : ''}, do ${dadosExtraidos.cartorio} de ${dadosExtraidos.cidade}.`;

    // Save to database
    const { error: insertError } = await supabase
      .from('documentos_extraidos')
      .insert({
        tipo_documento: 'certidao_casamento',
        dados_extraidos: dadosExtraidos,
        texto_gerado: textoGerado,
        user_id: userId
      });

    if (insertError) {
      console.error('Erro ao salvar no banco:', insertError);
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        texto_gerado: textoGerado,
        dados_extraidos: dadosExtraidos
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função extrair-certidao:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});