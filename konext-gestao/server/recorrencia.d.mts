// Tipos da regra da rotina (o código está em recorrencia.mjs, usado também pelo servidor).
export type ItemRotinaBase = { id: string; quando: 'semanal' | 'mensal'; dias: number[]; hora: string };
type ServicoBase = { id: string; tipo: string; status: string; inicio: string };

export type Ocorrencia<I extends ItemRotinaBase, S extends ServicoBase> = { id: string; data: string; hora: string; item: I; servico: S };

export declare const isoDaData: (data: Date) => string;
export declare const somarDiasISO: (iso: string, dias: number) => string;
export declare const caiNoDia: (item: ItemRotinaBase, iso: string) => boolean;
export declare const idOcorrencia: (servicoId: string, itemId: string, iso: string) => string;
export declare const ocorrenciasDaRotina: <I extends ItemRotinaBase, S extends ServicoBase>(args: {
  servicos: S[];
  processos: Record<string, { rotina: I[] } | undefined>;
  de: string;
  ate: string;
}) => Array<Ocorrencia<I, S>>;
