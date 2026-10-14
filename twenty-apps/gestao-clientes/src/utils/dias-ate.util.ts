// Diferença em dias corridos entre hoje e uma data 'AAAA-MM-DD' (negativo = passou).
export const diasAte = (data: string, hoje = new Date()): number => {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86_400_000);
};
