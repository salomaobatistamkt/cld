// Datas DATE chegam como 'AAAA-MM-DD'; exibe 'DD/MM' (ou 'DD/MM/AA' fora do ano).
export const formatarData = (data: string | null, hoje = new Date()): string => {
  if (!data) {
    return '—';
  }
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  if (!ano || !mes || !dia) {
    return data;
  }
  return Number(ano) === hoje.getFullYear()
    ? `${dia}/${mes}`
    : `${dia}/${mes}/${ano.slice(2)}`;
};
