// Métricas do Meta Ads: tipos do relatório, biblioteca de métricas, seções e chamadas ao servidor.
import { formatarMoeda } from './util';

export type Video = {
  reproducoes: number | null;
  v3s: number | null;
  thruplay: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  p100: number | null;
  s30: number | null;
  tempoMedio: number | null;
  custoThruplay: number | null;
  custoV3s: number | null;
};

export type Derivadas = {
  gasto: number;
  impressoes: number;
  alcance: number | null;
  frequencia: number | null;
  cpm: number | null;
  cliques: number | null;
  ctrTodos: number | null;
  cliquesLink: number | null;
  ctrLink: number | null;
  cpcLink: number | null;
  cliquesSaida: number | null;
  ctrSaida: number | null;
  cpcSaida: number | null;
  resultados: number | null;
  tipoResultado: string;
  indicador: string;
  custoPorResultado: number | null;
  resultadosPorTipo: Record<string, number>;
  visitasPerfil: number | null;
  fonteVisitas: string;
  custoVisita: number | null;
  seguidores: number | null;
  fonteSeguidores: string;
  custoSeguidor: number | null;
  video: Video;
};

export type CampanhaRel = {
  id: string;
  nome: string;
  procedimento: string;
  status: string;
  objetivo: string;
  orcamentoDiario: number | null;
  orcamentoTotal: number | null;
  m: Derivadas;
  // Para as orientações:
  inicio: string | null;
  aprendizado: boolean;
  diasComGasto: number;
  variacaoCusto: number | null;
  anterior: Derivadas | null;
};

export type PontoSerie = {
  data: string;
  gasto: number;
  impressoes: number;
  alcance: number | null;
  cliquesLink: number | null;
  ctrLink: number | null;
  cpm: number | null;
  resultados: number | null;
  custoPorResultado: number | null;
  visitasPerfil: number | null;
  seguidores: number | null;
  reproducoes: number | null;
};

export type ItemSegmento = {
  segmento: string;
  gasto: number;
  impressoes: number;
  alcance: number | null;
  cliquesLink: number | null;
  ctrLink: number | null;
  resultados: number | null;
  tipoResultado: string;
  resultadosPorTipo: Record<string, number>;
  custoPorResultado: number | null;
};

export type Segmento = { tipo: string; rotulo: string; itens: ItemSegmento[]; indisponivel?: string };

export type SeguidoresPerfil =
  | { disponivel: false; motivo: string }
  | {
      disponivel: true;
      totalAtual: number | null;
      totalEm: string | null;
      novosNoPeriodo: number | null;
      diasComNovos: number;
      variacaoTotal: number | null;
      historico: Array<{ data: string; total: number | null; novos: number | null }>;
    };

export type VideoRel = { id: string; nome: string; campanha: string; conjunto: string; miniatura: string | null; duracao: number | null; m: Derivadas };

export type Sincronizacao = { em: string | null; de?: string | null; ate?: string | null; status?: string | null; erro?: string | null; executando?: boolean };

// Resultados de cada tipo (objetivo), com o custo calculado só com o investimento daquele tipo.
export type PorTipo = { indicador: string; tipo: string; resultados: number; gasto: number; custo: number | null; campanhas: number };

// Período escolhido: atalho, intervalo livre ou o máximo da conta (decidido no servidor).
export type EscolhaPeriodo = { modo: 'hoje' | '7' | '14' | '30' | '90' | 'mes' | 'mes-passado' | 'maximo' | 'personalizado'; de: string; ate: string };
export const consultaPeriodo = (p: EscolhaPeriodo) => (p.modo === 'maximo' ? 'periodo=maximo' : `de=${p.de}&ate=${p.ate}`);

export type Relatorio = {
  cliente: { id?: string; nome: string; cor: string; instagram: string | null };
  periodo: { de: string; ate: string; dias: number };
  anterior: { de: string; ate: string } | null;
  sincronizacao: Sincronizacao;
  consultadoEm: string | null;
  secoes: Secao[];
  avisos: string[];
  resumo: Derivadas & { porTipo: PorTipo[] };
  resumoAnterior: (Derivadas & { porTipo: PorTipo[] }) | null;
  campanhas: CampanhaRel[];
  serie?: PontoSerie[];
  videos?: VideoRel[];
  segmentos?: Record<string, Segmento>;
  conjuntos?: Array<{ id: string; nome: string; campanhaId: string; status: string; orcamentoDiario: number | null; m: Derivadas }>;
  anuncios?: Array<{ id: string; nome: string; campanhaId: string; conjuntoId: string; status: string; miniatura: string | null; m: Derivadas }>;
  contaId?: string;
  // Só no portal:
  titulo?: string;
  mensagem?: string;
  metricas?: string[];
  agencia?: { nome: string; logo: string };
  parametros?: ParametrosPerformance | null;
};

// ---------- Seções do relatório (o que aparece no portal e na apresentação) ----------
export const SECOES = [
  { id: 'investimento', rotulo: 'Investimento e resultados' },
  { id: 'alcance', rotulo: 'Alcance e impressões' },
  { id: 'ctr_cpc', rotulo: 'CTR e CPC' },
  { id: 'frequencia', rotulo: 'Frequência' },
  { id: 'perfil', rotulo: 'Visitas ao perfil' },
  { id: 'seguidores', rotulo: 'Seguidores' },
  { id: 'evolucao', rotulo: 'Evolução no período' },
  { id: 'comparativo', rotulo: 'Comparativo entre campanhas' },
  { id: 'destaques', rotulo: 'Campanhas em destaque' },
  { id: 'publico', rotulo: 'Dados de público' },
  { id: 'videos', rotulo: 'Retenção dos vídeos' },
  { id: 'alertas', rotulo: 'Recomendações e pontos de atenção' },
] as const;
export type Secao = (typeof SECOES)[number]['id'];

export type ModeloRelatorio = { id: string; nome: string; secoes: Secao[]; metricas: string[] };

export const MODELOS_RELATORIO_PADRAO: ModeloRelatorio[] = [
  { id: 'leads', nome: 'Captação de leads', secoes: ['investimento', 'ctr_cpc', 'evolucao', 'comparativo', 'destaques', 'publico', 'alertas'], metricas: ['gasto', 'resultados', 'custoPorResultado', 'ctrLink', 'cpcLink', 'alcance'] },
  { id: 'perfil', nome: 'Crescimento de perfil', secoes: ['investimento', 'perfil', 'seguidores', 'evolucao', 'comparativo', 'videos', 'alertas'], metricas: ['gasto', 'visitasPerfil', 'custoVisita', 'seguidores', 'custoSeguidor', 'alcance'] },
  { id: 'procedimentos', nome: 'Divulgação de procedimentos estéticos', secoes: ['investimento', 'alcance', 'ctr_cpc', 'evolucao', 'comparativo', 'destaques', 'publico', 'videos', 'alertas'], metricas: ['gasto', 'resultados', 'custoPorResultado', 'alcance', 'ctrLink', 'frequencia'] },
  { id: 'marca', nome: 'Reconhecimento de marca', secoes: ['investimento', 'alcance', 'frequencia', 'evolucao', 'videos', 'publico'], metricas: ['gasto', 'alcance', 'impressoes', 'frequencia', 'cpm', 'thruplay'] },
  { id: 'conversao', nome: 'Campanhas de conversão', secoes: ['investimento', 'ctr_cpc', 'evolucao', 'comparativo', 'destaques', 'alertas'], metricas: ['gasto', 'resultados', 'custoPorResultado', 'ctrSaida', 'cpcSaida', 'cpm'] },
];

// ---------- Biblioteca de métricas ----------
export type Formato = 'moeda' | 'numero' | 'pct' | 'decimal' | 'segundos';
export type DefMetrica = {
  id: string;
  rotulo: string;
  categoria: 'Investimento e resultados' | 'Perfil e crescimento' | 'Vídeo e retenção';
  formato: Formato;
  ler: (m: Derivadas) => number | null;
  origem: 'meta' | 'calculada';
  descricao: string;
  // Se maior é melhor (para colorir a variação entre períodos). null = depende do contexto.
  melhor: 'maior' | 'menor' | null;
};

export const BIBLIOTECA: DefMetrica[] = [
  { id: 'gasto', rotulo: 'Valor investido', categoria: 'Investimento e resultados', formato: 'moeda', ler: (m) => m.gasto, origem: 'meta', descricao: 'Quanto foi gasto em anúncios no período.', melhor: null },
  { id: 'resultados', rotulo: 'Resultados', categoria: 'Investimento e resultados', formato: 'numero', ler: (m) => m.resultados, origem: 'meta', descricao: 'Resultados do objetivo de cada campanha (conversas, leads, visitas…), como no Gerenciador.', melhor: 'maior' },
  { id: 'custoPorResultado', rotulo: 'Custo por resultado', categoria: 'Investimento e resultados', formato: 'moeda', ler: (m) => m.custoPorResultado, origem: 'calculada', descricao: 'Valor investido ÷ resultados.', melhor: 'menor' },
  { id: 'impressoes', rotulo: 'Impressões', categoria: 'Investimento e resultados', formato: 'numero', ler: (m) => m.impressoes, origem: 'meta', descricao: 'Quantas vezes os anúncios apareceram.', melhor: 'maior' },
  { id: 'alcance', rotulo: 'Alcance', categoria: 'Investimento e resultados', formato: 'numero', ler: (m) => m.alcance, origem: 'meta', descricao: 'Pessoas diferentes que viram os anúncios no período (contadas uma vez só).', melhor: 'maior' },
  { id: 'frequencia', rotulo: 'Frequência', categoria: 'Investimento e resultados', formato: 'decimal', ler: (m) => m.frequencia, origem: 'calculada', descricao: 'Impressões ÷ alcance: quantas vezes, em média, cada pessoa viu os anúncios.', melhor: null },
  { id: 'cpm', rotulo: 'CPM', categoria: 'Investimento e resultados', formato: 'moeda', ler: (m) => m.cpm, origem: 'calculada', descricao: 'Custo por mil impressões.', melhor: 'menor' },
  { id: 'cliquesLink', rotulo: 'Cliques no link', categoria: 'Investimento e resultados', formato: 'numero', ler: (m) => m.cliquesLink, origem: 'meta', descricao: 'Cliques que levam ao destino do anúncio (WhatsApp, site, perfil…).', melhor: 'maior' },
  { id: 'ctrLink', rotulo: 'CTR do link', categoria: 'Investimento e resultados', formato: 'pct', ler: (m) => m.ctrLink, origem: 'calculada', descricao: 'Cliques no link ÷ impressões.', melhor: 'maior' },
  { id: 'cpcLink', rotulo: 'CPC do link', categoria: 'Investimento e resultados', formato: 'moeda', ler: (m) => m.cpcLink, origem: 'calculada', descricao: 'Valor investido ÷ cliques no link.', melhor: 'menor' },
  { id: 'cliquesSaida', rotulo: 'Cliques de saída', categoria: 'Investimento e resultados', formato: 'numero', ler: (m) => m.cliquesSaida, origem: 'meta', descricao: 'Cliques que levam para fora do Facebook/Instagram.', melhor: 'maior' },
  { id: 'ctrSaida', rotulo: 'CTR de saída', categoria: 'Investimento e resultados', formato: 'pct', ler: (m) => m.ctrSaida, origem: 'calculada', descricao: 'Cliques de saída ÷ impressões.', melhor: 'maior' },
  { id: 'cpcSaida', rotulo: 'Custo por clique de saída', categoria: 'Investimento e resultados', formato: 'moeda', ler: (m) => m.cpcSaida, origem: 'calculada', descricao: 'Valor investido ÷ cliques de saída.', melhor: 'menor' },
  { id: 'ctrTodos', rotulo: 'CTR (todos os cliques)', categoria: 'Investimento e resultados', formato: 'pct', ler: (m) => m.ctrTodos, origem: 'calculada', descricao: 'Todos os cliques (inclui curtir, abrir foto…) ÷ impressões.', melhor: 'maior' },
  { id: 'visitasPerfil', rotulo: 'Visitas ao perfil', categoria: 'Perfil e crescimento', formato: 'numero', ler: (m) => m.visitasPerfil, origem: 'meta', descricao: 'Visitas ao perfil do Instagram atribuídas aos anúncios, quando a Meta informa.', melhor: 'maior' },
  { id: 'custoVisita', rotulo: 'Custo por visita ao perfil', categoria: 'Perfil e crescimento', formato: 'moeda', ler: (m) => m.custoVisita, origem: 'calculada', descricao: 'Valor investido ÷ visitas ao perfil.', melhor: 'menor' },
  { id: 'seguidores', rotulo: 'Seguidores atribuídos', categoria: 'Perfil e crescimento', formato: 'numero', ler: (m) => m.seguidores, origem: 'meta', descricao: 'Seguidores que a Meta atribui aos anúncios (não inclui o crescimento orgânico).', melhor: 'maior' },
  { id: 'custoSeguidor', rotulo: 'Custo por seguidor', categoria: 'Perfil e crescimento', formato: 'moeda', ler: (m) => m.custoSeguidor, origem: 'calculada', descricao: 'Valor investido ÷ seguidores atribuídos.', melhor: 'menor' },
  { id: 'reproducoes', rotulo: 'Reproduções de vídeo', categoria: 'Vídeo e retenção', formato: 'numero', ler: (m) => m.video.reproducoes, origem: 'meta', descricao: 'Vezes que o vídeo começou a tocar.', melhor: 'maior' },
  { id: 'v3s', rotulo: 'Reproduções de 3 segundos', categoria: 'Vídeo e retenção', formato: 'numero', ler: (m) => m.video.v3s, origem: 'meta', descricao: 'Vezes que o vídeo foi assistido por pelo menos 3 segundos.', melhor: 'maior' },
  { id: 'thruplay', rotulo: 'ThruPlays', categoria: 'Vídeo e retenção', formato: 'numero', ler: (m) => m.video.thruplay, origem: 'meta', descricao: 'Vídeo assistido até o fim ou por pelo menos 15 segundos.', melhor: 'maior' },
  { id: 'custoThruplay', rotulo: 'Custo por ThruPlay', categoria: 'Vídeo e retenção', formato: 'moeda', ler: (m) => m.video.custoThruplay, origem: 'calculada', descricao: 'Valor investido ÷ ThruPlays.', melhor: 'menor' },
  { id: 'tempoMedio', rotulo: 'Tempo médio assistido', categoria: 'Vídeo e retenção', formato: 'segundos', ler: (m) => m.video.tempoMedio, origem: 'meta', descricao: 'Tempo médio de reprodução, informado pela Meta.', melhor: 'maior' },
];
export const METRICA = Object.fromEntries(BIBLIOTECA.map((m) => [m.id, m])) as Record<string, DefMetrica>;
export const METRICAS_PADRAO = ['gasto', 'resultados', 'custoPorResultado', 'alcance', 'ctrLink', 'frequencia'];

// ---------- Formatação ----------
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const formatar = (valor: number | null | undefined, formato: Formato) => {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  if (formato === 'moeda') return formatarMoeda(valor);
  if (formato === 'pct') return `${valor.toFixed(2).replace('.', ',')}%`;
  if (formato === 'decimal') return valor.toFixed(2).replace('.', ',');
  if (formato === 'segundos') return `${valor.toFixed(1).replace('.', ',')} s`;
  return inteiro.format(valor);
};
export const variacao = (atual: number | null, anterior: number | null | undefined) =>
  atual === null || anterior === null || anterior === undefined || anterior === 0 ? null : ((atual - anterior) / Math.abs(anterior)) * 100;

export const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const quando = (iso: string | null | undefined) => {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const ROTULO_OBJETIVO: Record<string, string> = {
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_LEADS: 'Cadastros',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_APP_PROMOTION: 'Promoção de app',
  MESSAGES: 'Mensagens',
  LINK_CLICKS: 'Tráfego',
  CONVERSIONS: 'Conversões',
  REACH: 'Alcance',
  POST_ENGAGEMENT: 'Engajamento',
  VIDEO_VIEWS: 'Visualizações de vídeo',
  LEAD_GENERATION: 'Cadastros',
};
export const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  ativa: { texto: 'Ativa', cor: 'green' },
  pausada: { texto: 'Pausada', cor: 'slate' },
  em_analise: { texto: 'Em análise', cor: 'amber' },
  encerrada: { texto: 'Encerrada', cor: 'red' },
};

// ---------- Parâmetros de performance (configuráveis) ----------
export type RegraPerformance = {
  id: string;
  // Filtros (vazio = vale para todos). A regra mais específica vence.
  clienteId?: string;
  procedimento?: string;
  objetivo?: string;
  tipoResultado?: string;
  custoOtimo?: number;
  custoBom?: number;
  ctrBom?: number;
  ctrExcelente?: number;
};

// Ação da Meta que conta como seguidor / visita ao perfil, por conta (Desempenho → Métricas da conta).
export type MapaAcoes = { seguidores?: string[]; visitasPerfil?: string[] };

export type ParametrosPerformance = {
  ctrMuitoAlto: number;
  ctrExcelente: number;
  ctrBom: number;
  ctrAtencao: number;
  custoOtimo: number;
  custoBom: number;
  impressoesMin: number;
  alcanceMin: number;
  freqInicial: number;
  freqBoa: number;
  freqAlta: number;
  // Abaixo disso de impressões, CTR e custo não são classificados (dados insuficientes).
  impressoesParaClassificar: number;
  regras: RegraPerformance[];
};

export const PARAMETROS_PADRAO: ParametrosPerformance = {
  ctrMuitoAlto: 10,
  ctrExcelente: 5,
  ctrBom: 3,
  ctrAtencao: 2,
  custoOtimo: 5,
  custoBom: 10,
  impressoesMin: 1000,
  alcanceMin: 1000,
  freqInicial: 1,
  freqBoa: 1.5,
  freqAlta: 2,
  impressoesParaClassificar: 1000,
  regras: [],
};

// ---------- Servidor ----------
export class ErroMetricas extends Error {}

const pedir = async <T,>(caminho: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(`./api/metricas${caminho}`, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...init });
  if (r.status === 401) window.dispatchEvent(new CustomEvent('konext:sessao-expirada'));
  if (r.status === 204) return undefined as T;
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroMetricas((corpo as { erro?: string }).erro || `Erro ${r.status}`);
  return corpo as T;
};

export type EstadoMetricas = {
  clientes: Array<{
    clienteId: string;
    contaId: string | null;
    contaCompartilhada: boolean;
    sincronizacao: (Sincronizacao & { tentativa?: string | null }) | null;
    portal: { criadoEm: string; ultimoAcesso: string | null; acessos: number } | null;
  }>;
  automaticaHoras: number;
};

export const metricasApi = {
  estado: () => pedir<EstadoMetricas>('/estado'),
  sincronizar: (clienteId: string, dias?: number | 'maximo') =>
    pedir<{ status: string; linhas: number; de: string; ate: string; avisos: string[] }>('/sincronizar', { method: 'POST', body: JSON.stringify({ clienteId, dias }) }),
  painel: (clienteId: string, periodo: EscolhaPeriodo, campanhaId?: string, comparar = true) =>
    pedir<Relatorio>(`/painel?clienteId=${encodeURIComponent(clienteId)}&${consultaPeriodo(periodo)}${campanhaId ? `&campanhaId=${encodeURIComponent(campanhaId)}` : ''}${comparar ? '' : '&comparar=0'}`),
  acoes: (clienteId: string, periodo: EscolhaPeriodo) =>
    pedir<{ acoes: Array<{ tipo: string; total: number; seguidor: boolean; visitaPerfil: boolean }>; mapa: MapaAcoes; contaId: string }>(`/acoes?clienteId=${encodeURIComponent(clienteId)}&${consultaPeriodo(periodo)}`),
  gerarLink: (clienteId: string) => pedir<{ token: string }>(`/portais/${encodeURIComponent(clienteId)}`, { method: 'POST', body: '{}' }),
  lerLink: (clienteId: string) => pedir<{ token: string }>(`/portais/${encodeURIComponent(clienteId)}`),
  revogarLink: (clienteId: string) => pedir<void>(`/portais/${encodeURIComponent(clienteId)}`, { method: 'DELETE' }),
};

export const urlPortal = (token: string) => `${window.location.origin}/resultados/${token}`;

export const lerPortal = async (token: string, periodo?: EscolhaPeriodo): Promise<Relatorio> => {
  const q = periodo ? `?${consultaPeriodo(periodo)}` : '';
  const r = await fetch(`/api/publico/resultados/${encodeURIComponent(token)}${q}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroMetricas((corpo as { erro?: string }).erro || `Erro ${r.status}`);
  return corpo as Relatorio;
};
