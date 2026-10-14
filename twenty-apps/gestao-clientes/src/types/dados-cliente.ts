type ItemSimples = { id: string; name: string | null };

export type DadosCliente = ItemSimples & {
  statusCliente: string | null;
  segmento: string | null;
  publicoAlvo: string | null;
  tomDeVoz: string | null;
  objetivos: string | null;
  concorrentes: string | null;
  coresDaMarca: string | null;
  servicos: Array<
    ItemSimples & {
      status: string | null;
      tipo: string | null;
      entregas: Array<ItemSimples & { status: string | null }>;
    }
  >;
  entregasAvulsas: Array<ItemSimples & { status: string | null }>;
  acessos: Array<ItemSimples & { categoria: string | null }>;
  reunioes: Array<ItemSimples & { data: string | null }>;
  mapas: ItemSimples[];
};
