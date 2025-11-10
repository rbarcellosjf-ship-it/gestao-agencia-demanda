export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }
  
  // Valida os dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Validação do primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
    return false;
  }
  
  sum = 0;
  
  // Validação do segundo dígito verificador
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
    return false;
  }
  
  return true;
};

export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length <= 3) {
    return cleanCPF;
  } else if (cleanCPF.length <= 6) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3)}`;
  } else if (cleanCPF.length <= 9) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6)}`;
  } else {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9, 11)}`;
  }
};
