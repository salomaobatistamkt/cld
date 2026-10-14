export const formatarMoeda = (valor: number, moeda = 'BRL'): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
    maximumFractionDigits: 0,
  }).format(valor);
