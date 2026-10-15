let contador = 0;

export const novoId = (): string => {
  contador += 1;
  return `${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export const formatarMoeda = (valor: number, curto = false) =>
  (curto ? moedaCurta : moeda).format(Number.isFinite(valor) ? valor : 0);

export const hojeISO = (base = new Date()) => {
  const d = new Date(base.getTime() - base.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
};

export const somarDias = (iso: string, dias: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d + dias));
  return data.toISOString().slice(0, 10);
};

// Dias corridos de hoje até a data (negativo = já passou).
export const diasAte = (iso: string, hoje = hojeISO()) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const [a1, m1, d1] = hoje.split('-').map(Number);
  const [a2, m2, d2] = iso.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const formatarData = (iso: string, comAno = false) => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  const base = `${Number(d)} ${MESES[Number(m) - 1]}`;
  return comAno ? `${base} ${a}` : base;
};

export const nomeMes = (mesISO: string) => {
  const [a, m] = mesISO.split('-');
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
};

export const prazoRelativo = (iso: string, hoje = hojeISO()) => {
  if (!iso) return 'sem prazo';
  const dias = diasAte(iso, hoje);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  if (dias < 0) return `${-dias} dias atrasada`;
  return `em ${dias} dias`;
};

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || '?';
