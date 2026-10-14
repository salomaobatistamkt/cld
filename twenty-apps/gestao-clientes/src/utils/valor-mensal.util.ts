import { type ValorMoeda } from 'src/types/valor-moeda';

const MESES_POR_RECORRENCIA: Record<string, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

// Converte o valor do contrato para o equivalente mensal (em unidades, não micros).
// Projetos pontuais não entram na receita recorrente.
export const valorMensal = (
  valor: ValorMoeda,
  recorrencia: string | null,
): number => {
  const meses = MESES_POR_RECORRENCIA[recorrencia ?? 'MENSAL'];
  if (!meses || !valor?.amountMicros) {
    return 0;
  }
  return valor.amountMicros / 1_000_000 / meses;
};
