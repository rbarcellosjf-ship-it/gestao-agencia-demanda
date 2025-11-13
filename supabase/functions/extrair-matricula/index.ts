import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatriculaData {
  tipo_imovel: string;
  endereco_imovel: string;
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

    const { pdfBase64, fileType } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Arquivo base64 é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando extração de matrícula de imóvel...');
    console.log('Tipo de arquivo:', fileType);
    console.log('Tamanho do base64:', pdfBase64.length);

    // For PDFs, we need to use inline_data format instead of image_url
    const isPdf = fileType === 'application/pdf';
    const mimeType = isPdf ? 'application/pdf' : (fileType?.startsWith('image/') ? fileType : 'image/png');
    
    console.log('MIME type usado:', mimeType);
    console.log('Formato:', isPdf ? 'inline_data (PDF)' : 'image_url (imagem)');

    // Build content array based on file type
    const contentArray: any[] = [
      {
        type: 'text',
        text: 'Analise este documento de matrícula de imóvel e extraia: tipo do imóvel (apartamento, casa, terreno, lote, sala comercial, etc.) e endereço completo do imóvel incluindo rua, número, bairro, cidade e estado. Retorne apenas as informações encontradas.'
      }
    ];

    if (isPdf) {
      // For PDFs, use inline_data format
      contentArray.push({
        type: 'inline_data',
        inline_data: {
          mime_type: mimeType,
          data: pdfBase64
        }
      });
    } else {
      // For images, use image_url format
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${pdfBase64}`
        }
      });
    }

    // Call Lovable AI to extract data using Pro model for better document handling
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
            content: 'Você é um assistente especializado em extrair informações de matrículas de imóveis brasileiras. Analise cuidadosamente o documento e extraia as informações solicitadas com precisão.'
          },
          {
            role: 'user',
            content: contentArray
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extrair_matricula',
              description: 'Extrai dados estruturados de uma matrícula de imóvel',
              parameters: {
                type: 'object',
                properties: {
                  tipo_imovel: { 
                    type: 'string', 
                    description: 'Tipo do imóvel (ex: apartamento, casa, terreno, lote, sala comercial)' 
                  },
                  endereco_imovel: { 
                    type: 'string', 
                    description: 'Endereço completo do imóvel' 
                  }
                },
                required: ['tipo_imovel', 'endereco_imovel']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extrair_matricula' } }
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

    const dadosExtraidos: MatriculaData = JSON.parse(toolCall.function.arguments);

    // Generate standardized text according to Lei 7.433/1985
    const textoGerado = `Imóvel tipo ${dadosExtraidos.tipo_imovel}, localizado em ${dadosExtraidos.endereco_imovel}, dispensando sua inteira descrição nos termos do art. 2º da Lei nº 7.433/1985.`;

    // Save to database
    const { error: insertError } = await supabase
      .from('documentos_extraidos')
      .insert({
        tipo_documento: 'matricula_imovel',
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
    console.error('Erro na função extrair-matricula:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});