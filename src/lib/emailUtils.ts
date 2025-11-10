export const replaceVariables = (template: string, data: Record<string, string>): string => {
  let result = template;
  
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key] || '');
  });
  
  return result;
};

export const formatEmailData = (
  conformidade: any,
  profile: any
): Record<string, string> => {
  return {
    cpf: conformidade.cpf || '',
    valor_financiamento: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(conformidade.valor_financiamento || 0),
    modalidade: conformidade.modalidade === 'OUTRO' 
      ? conformidade.modalidade_outro 
      : conformidade.modalidade || '',
    codigo_cca: conformidade.codigo_cca || '',
    nome_cca: profile?.full_name || '',
    data_envio: new Date(conformidade.created_at).toLocaleDateString('pt-BR'),
    telefone_cca: profile?.phone || ''
  };
};

export const validateTemplate = (template: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for unclosed variables
  const openBraces = (template.match(/{{/g) || []).length;
  const closeBraces = (template.match(/}}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('Variáveis não fechadas corretamente. Use {{variavel}}');
  }
  
  // Check for invalid variable syntax
  const invalidPattern = /{[^{]|[^}]}/g;
  if (invalidPattern.test(template)) {
    errors.push('Sintaxe de variável inválida. Use {{variavel}} com duas chaves');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const extractVariables = (template: string): string[] => {
  const regex = /{{(\w+)}}/g;
  const matches = template.matchAll(regex);
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
};
