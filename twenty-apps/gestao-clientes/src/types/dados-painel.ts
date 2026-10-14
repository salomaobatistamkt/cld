export type EntregaPainel = {
  id: string;
  name: string | null;
  status: string | null;
  prazo: string | null;
  prioridade: string | null;
  cliente: { id: string; name: string | null } | null;
};

export type ServicoPainel = {
  id: string;
  name: string | null;
  status: string | null;
  recorrencia: string | null;
  dataRenovacao: string | null;
  valor: { amountMicros: number | null; currencyCode: string | null } | null;
  cliente: { id: string; name: string | null } | null;
};

export type DadosPainel = {
  clientesAtivos: number;
  entregasAbertas: EntregaPainel[];
  entreguesNoMes: number;
  servicosAtivos: ServicoPainel[];
};
