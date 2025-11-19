// Design tokens padronizados para todo o sistema

// Espaçamentos consistentes
export const spacing = {
  xs: 'gap-2 p-2',
  sm: 'gap-3 p-3',
  md: 'gap-4 p-4',
  lg: 'gap-6 p-6',
  xl: 'gap-8 p-8',
};

// Tamanhos de container
export const container = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'w-full',
};

// Bordas e sombras
export const effects = {
  card: 'rounded-lg border bg-card shadow-sm',
  cardHover: 'rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow',
  elevated: 'rounded-lg bg-card shadow-lg',
};

// Espaçamento de cards compactos
export const cardSpacing = {
  header: 'pb-3',
  content: 'py-3 space-y-3',
  footer: 'pt-3 border-t',
};

// Bordas de status coloridas para cards
export const statusBorders = {
  pendente: 'border-l-4 border-l-yellow-500',
  em_andamento: 'border-l-4 border-l-blue-500',
  aguardando_assinatura: 'border-l-4 border-l-orange-500',
  assinado: 'border-l-4 border-l-purple-500',
  concluida: 'border-l-4 border-l-green-500',
  cancelada: 'border-l-4 border-l-red-500',
};

// Status colors
export const statusColors = {
  pendente: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800',
  concluida: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800',
  cancelada: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800',
  aguardando_assinatura: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
  assinado: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800',
  em_andamento: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800',
};
