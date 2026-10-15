export type StatusCliente = 'lead' | 'onboarding' | 'ativo' | 'pausado' | 'encerrado';

export type Acesso = {
  id: string;
  plataforma: string;
  login: string;
  link: string;
  ondeSenha: string;
};

export type Cliente = {
  id: string;
  nome: string;
  empresa: string;
  segmento: string;
  status: StatusCliente;
  cor: string;
  clienteDesde: string;
  contato: { nome: string; whatsapp: string; email: string; instagram: string; site: string };
  documento: string;
  briefing: {
    publico: string;
    tomDeVoz: string;
    objetivos: string;
    concorrentes: string;
    identidade: string;
    observacoes: string;
  };
  acessos: Acesso[];
  criadoEm: string;
};

export type Recorrencia = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'pontual';
export type StatusServico = 'proposta' | 'ativo' | 'pausado' | 'encerrado';

export type Servico = {
  id: string;
  clienteId: string;
  tipo: string;
  nome: string;
  valor: number;
  recorrencia: Recorrencia;
  diaPagamento: number;
  inicio: string;
  status: StatusServico;
  escopo: string;
};

export type StatusEntrega =
  | 'backlog'
  | 'a_fazer'
  | 'produzindo'
  | 'revisao'
  | 'aguardando_cliente'
  | 'entregue';

export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export type Entrega = {
  id: string;
  clienteId: string;
  servicoId: string | null;
  titulo: string;
  descricao: string;
  status: StatusEntrega;
  prioridade: Prioridade;
  prazo: string;
  responsavel: string;
  link: string;
  entregueEm: string;
  ordem: number;
};

export type Quadro = {
  id: string;
  titulo: string;
  clienteId: string | null;
  // Cena do Excalidraw (elementos + arquivos de imagem) serializada.
  cena: { elements: unknown[]; files: Record<string, unknown> };
  miniatura: string;
  atualizadoEm: string;
  // Modelo aplicado na primeira abertura (funil, mapa, jornada, campanha, em branco).
  modelo?: string;
};

export type TipoLancamento = 'entrada' | 'saida';

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  pago: boolean;
  clienteId: string | null;
  servicoId: string | null;
};

export type EtapaProcesso = { id: string; titulo: string; descricao: string; responsavel: string; prazo: string };

export type Processo = {
  id: string;
  nome: string;
  area: string;
  objetivo: string;
  etapas: EtapaProcesso[];
};

export type Config = {
  empresa: string;
  tiposServico: string[];
  categoriasEntrada: string[];
  categoriasSaida: string[];
  areasProcesso: string[];
};

export type Dados = {
  clientes: Cliente[];
  servicos: Servico[];
  entregas: Entrega[];
  quadros: Quadro[];
  lancamentos: Lancamento[];
  processos: Processo[];
  config: Config;
};

export type Rota =
  | { tela: 'painel' }
  | { tela: 'clientes' }
  | { tela: 'cliente'; id: string; aba?: string }
  | { tela: 'entregas' }
  | { tela: 'quadros' }
  | { tela: 'quadro'; id: string }
  | { tela: 'caixa' }
  | { tela: 'processos'; id?: string }
  | { tela: 'config' }
  | { tela: 'apresentacao'; clienteId: string };
