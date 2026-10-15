import { RECORRENCIA } from './constantes';
import { type Lancamento, type Servico } from './types';
import { hojeISO } from './util';

// Valor equivalente por mês de um serviço ativo (projetos pontuais não entram).
export const valorMensal = (servico: Servico) => {
  const meses = RECORRENCIA[servico.recorrencia].meses;
  if (!meses || servico.status !== 'ativo') return 0;
  return servico.valor / meses;
};

export const receitaRecorrente = (servicos: Servico[]) =>
  servicos.reduce((soma, servico) => soma + valorMensal(servico), 0);

const ultimoDiaDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

// Serviço cobra neste mês? Mensal sempre; trimestral/semestral/anual conforme o mês de início.
const cobraNoMes = (servico: Servico, ano: number, mes: number) => {
  const meses = RECORRENCIA[servico.recorrencia].meses;
  if (!meses || servico.status !== 'ativo') return false;
  if (meses === 1) return true;
  const [aI, mI] = (servico.inicio || hojeISO()).split('-').map(Number);
  const diferenca = (ano - aI) * 12 + (mes - mI);
  return diferenca >= 0 && diferenca % meses === 0;
};

export type CobrancaPrevista = {
  servico: Servico;
  data: string;
  lancamento: Lancamento | null;
};

// Cobranças do mês (AAAA-MM) com o lançamento correspondente, se já foi gerado.
export const cobrancasDoMes = (
  mesISO: string,
  servicos: Servico[],
  lancamentos: Lancamento[],
): CobrancaPrevista[] => {
  const [ano, mes] = mesISO.split('-').map(Number);
  return servicos
    .filter((servico) => cobraNoMes(servico, ano, mes))
    .map((servico) => {
      const dia = Math.min(Math.max(1, servico.diaPagamento || 1), ultimoDiaDoMes(ano, mes));
      const data = `${mesISO}-${String(dia).padStart(2, '0')}`;
      const lancamento =
        lancamentos.find(
          (item) => item.servicoId === servico.id && item.tipo === 'entrada' && item.data.slice(0, 7) === mesISO,
        ) ?? null;
      return { servico, data, lancamento };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
};

export const saldo = (lancamentos: Lancamento[], ateData = hojeISO()) =>
  lancamentos
    .filter((item) => item.pago && item.data <= ateData)
    .reduce((soma, item) => soma + (item.tipo === 'entrada' ? item.valor : -item.valor), 0);

export const totaisDoMes = (lancamentos: Lancamento[], mesISO: string) => {
  const doMes = lancamentos.filter((item) => item.data.slice(0, 7) === mesISO);
  const soma = (tipo: 'entrada' | 'saida', pago?: boolean) =>
    doMes
      .filter((item) => item.tipo === tipo && (pago === undefined || item.pago === pago))
      .reduce((total, item) => total + item.valor, 0);
  return {
    entradas: soma('entrada', true),
    saidas: soma('saida', true),
    aReceber: soma('entrada', false),
    aPagar: soma('saida', false),
  };
};

export const mesesAnteriores = (quantidade: number, base = hojeISO()) => {
  const [ano, mes] = base.split('-').map(Number);
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(Date.UTC(ano, mes - 1 - (quantidade - 1 - indice), 1));
    return data.toISOString().slice(0, 7);
  });
};
