import { type ModeloRelatorio, type ParametrosPerformance, type Secao } from './metricas';

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
  // Conta de anúncios do Meta deste cliente (ex.: act_123456789).
  metaContaId: string;
  // Anotações feitas durante as reuniões (aparecem no modo apresentação).
  notasReuniao: string;
  // Ativos confirmados na Meta (Anúncios → Contas). Só valem para a conta em metaValidacao.contaId.
  metaPaginaId?: string;
  metaPaginaNome?: string;
  metaInstagramId?: string;
  metaInstagramUsuario?: string;
  metaValidacao?: { contaId: string; contaNome: string; moeda: string; fuso: string; em: string };
  // O que o portal de resultados e a apresentação mostram para este cliente.
  relatorio?: { modeloId?: string; secoes?: Secao[]; metricas?: string[]; titulo?: string; mensagem?: string };
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
  // Interna: só a equipe vê (fica fora do modo apresentação).
  interna?: boolean;
  // Etapa do processo padrão que gerou esta entrega (evita criar duas vezes).
  modeloId?: string;
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
  // Logo da empresa em data URL (aparece no menu e nas apresentações).
  logo: string;
  tiposServico: string[];
  categoriasEntrada: string[];
  categoriasSaida: string[];
  areasProcesso: string[];
  // Processo padrão de cada tipo de serviço (chave = nome do tipo).
  processosServico: Record<string, ProcessoServico>;
  // Nomes de conjunto oferecidos ao criar campanhas (Anúncios → Criar campanha).
  nomesConjunto: string[];
  // Referências de performance (Desempenho) e modelos de relatório/apresentação.
  performance?: ParametrosPerformance;
  modelosRelatorio?: ModeloRelatorio[];
};

// Etapa feita uma vez, no começo do serviço (vira uma entrega do cliente).
export type EtapaModelo = {
  id: string;
  fase: string;
  titulo: string;
  descricao: string;
  // Prazo: quantos dias depois do início do serviço.
  dias: number;
  interna: boolean;
};

// Tarefa que se repete (vai para a Rotina, não para o quadro de entregas).
export type ItemRotina = {
  id: string;
  titulo: string;
  descricao: string;
  quando: 'semanal' | 'mensal';
  // Semanal: dias da semana (0 = domingo … 6 = sábado). Mensal: dias do mês.
  dias: number[];
  hora: string;
  interna: boolean;
  // Avisa o n8n (webhook "rotina.horario") quando chega a hora.
  avisar: boolean;
  // Identificador para a automação saber o que fazer (ex.: pausar_campanhas).
  codigo: string;
};

export type ProcessoServico = { etapas: EtapaModelo[]; rotina: ItemRotina[] };

// Tarefa da rotina marcada como feita (o id é servico~item~data).
export type RotinaFeita = {
  id: string;
  servicoId: string;
  clienteId: string;
  itemId: string;
  data: string;
  feitoEm: string;
  origem: 'manual' | 'automacao';
};

export type Dados = {
  clientes: Cliente[];
  servicos: Servico[];
  entregas: Entrega[];
  quadros: Quadro[];
  lancamentos: Lancamento[];
  processos: Processo[];
  rotina: RotinaFeita[];
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
  | { tela: 'campanhas' }
  | { tela: 'rotina' }
  | { tela: 'anuncios-contas' }
  | { tela: 'anuncios-criar' }
  | { tela: 'anuncios-execucao'; id?: string }
  | { tela: 'anuncios-criativos' }
  | { tela: 'anuncios-diagnostico' }
  | { tela: 'config'; aba?: string }
  | { tela: 'apresentacao'; clienteId: string }
  | { tela: 'desempenho'; clienteId?: string }
  | { tela: 'apresentar-resultados'; clienteId: string };
