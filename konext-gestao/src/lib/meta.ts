import { hojeISO, somarDias } from './util';

export type CampanhaMeta = {
  id: string;
  nome: string;
  status: 'ATIVA' | 'PAUSADA' | 'ENCERRADA';
  objetivo: string;
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  frequencia: number | null;
  resultados: number | null;
  tipoResultado: string;
  custoPorResultado: number | null;
};

export type LeituraMeta =
  | { ok: true; campanhas: CampanhaMeta[]; demonstracao: boolean }
  | { ok: false; erro: string };

export type EstadoMeta = { conectado: boolean; modo: 'servidor' | 'demonstracao' };

export const PERIODOS = [
  { id: '7', rotulo: 'Últimos 7 dias' },
  { id: '14', rotulo: 'Últimos 14 dias' },
  { id: '30', rotulo: 'Últimos 30 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-passado', rotulo: 'Mês passado' },
] as const;

export type Periodo = (typeof PERIODOS)[number]['id'];

export const intervaloDoPeriodo = (periodo: Periodo, hoje = hojeISO()) => {
  if (periodo === 'mes') return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
  if (periodo === 'mes-passado') {
    const [a, m] = hoje.split('-').map(Number);
    const inicio = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 10);
    const fim = new Date(Date.UTC(a, m - 1, 0)).toISOString().slice(0, 10);
    return { de: inicio, ate: fim };
  }
  return { de: somarDias(hoje, -(Number(periodo) - 1)), ate: hoje };
};

// Nome amigável do tipo de resultado que a Meta conta (indicator).
export const rotuloResultado = (indicador: string) => {
  if (indicador.includes('messaging_conversation_started')) return 'Conversas no WhatsApp';
  if (indicador.includes('lead')) return 'Leads';
  if (indicador.includes('purchase')) return 'Compras';
  if (indicador.includes('link_click')) return 'Cliques no link';
  if (indicador.includes('landing_page_view')) return 'Visitas à página';
  if (indicador.includes('reach')) return 'Alcance';
  if (indicador.includes('video')) return 'Visualizações';
  if (indicador.includes('post_engagement') || indicador.includes('engagement')) return 'Engajamentos';
  if (indicador.includes('follow') || indicador.includes('like')) return 'Seguidores';
  return indicador ? indicador.replace(/^actions:/, '') : 'Resultados';
};

// Gerador simples e determinístico (mesma conta = mesmos números) para a demonstração.
const semente = (texto: string) => {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const CAMPANHAS_DEMO: Array<[string, string, string]> = [
  ['Mensagens · Encomendas de festa', 'OUTCOME_ENGAGEMENT', 'actions:onsite_conversion.messaging_conversation_started_7d'],
  ['Leads · Cadastro de clientes', 'OUTCOME_LEADS', 'actions:offsite_conversion.fb_pixel_lead'],
  ['Tráfego · Cardápio digital', 'OUTCOME_TRAFFIC', 'actions:link_click'],
  ['Reconhecimento · Bairro', 'OUTCOME_AWARENESS', 'reach'],
];

export const campanhasDemonstracao = (contaId: string, de: string, ate: string): CampanhaMeta[] => {
  const dias = Math.max(1, Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000) + 1);
  const aleatorio = semente(contaId);
  return CAMPANHAS_DEMO.map(([nome, objetivo, indicador], indice) => {
    const ativa = indice < 3;
    const investimento = ativa ? Math.round((25 + aleatorio() * 60) * dias * 100) / 100 : 0;
    const cpm = 9 + aleatorio() * 14;
    const impressoes = investimento ? Math.round((investimento / cpm) * 1000) : 0;
    const alcance = Math.round(impressoes / (1.3 + aleatorio()));
    const ctr = investimento ? 0.8 + aleatorio() * 2.2 : null;
    const cliques = ctr ? Math.round((impressoes * ctr) / 100) : 0;
    const resultados = investimento ? Math.max(1, Math.round(cliques * (indicador === 'reach' ? 0 : 0.08 + aleatorio() * 0.25))) : null;
    return {
      id: `${contaId}-${indice}`,
      nome,
      status: ativa ? 'ATIVA' : 'PAUSADA',
      objetivo,
      investimento,
      impressoes,
      alcance,
      cliques,
      cpm: investimento ? cpm : null,
      ctr,
      cpc: cliques ? investimento / cliques : null,
      frequencia: alcance ? impressoes / alcance : null,
      resultados: indicador === 'reach' ? alcance || null : resultados,
      tipoResultado: rotuloResultado(indicador),
      custoPorResultado: resultados && indicador !== 'reach' ? investimento / resultados : null,
    };
  });
};

export const totaisCampanhas = (campanhas: CampanhaMeta[]) => {
  const investimento = campanhas.reduce((s, c) => s + c.investimento, 0);
  const impressoes = campanhas.reduce((s, c) => s + c.impressoes, 0);
  const cliques = campanhas.reduce((s, c) => s + c.cliques, 0);
  const alcance = campanhas.reduce((s, c) => s + c.alcance, 0);
  const comResultado = campanhas.filter((c) => c.resultados && c.custoPorResultado !== null);
  const resultados = comResultado.reduce((s, c) => s + (c.resultados ?? 0), 0);
  return {
    investimento,
    impressoes,
    cliques,
    alcance,
    resultados,
    ctr: impressoes ? (cliques / impressoes) * 100 : null,
    cpm: impressoes ? (investimento / impressoes) * 1000 : null,
    cpc: cliques ? investimento / cliques : null,
    custoPorResultado: resultados ? comResultado.reduce((s, c) => s + c.investimento, 0) / resultados : null,
  };
};

const pedir = async <T,>(caminho: string, init?: RequestInit): Promise<T> => {
  const resposta = await fetch(`./api/meta${caminho}`, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...init });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error((corpo as { erro?: string }).erro ?? `Erro ${resposta.status}`);
  return corpo as T;
};

export const metaApi = {
  estado: () => pedir<{ conectado: boolean }>('/estado'),
  conectar: (token: string) => pedir<{ conectado: boolean; contas: number }>('/conexao', { method: 'PUT', body: JSON.stringify({ token }) }),
  desconectar: () => pedir<{ conectado: boolean }>('/conexao', { method: 'DELETE' }),
  contas: () => pedir<{ contas: Array<{ id: string; nome: string; moeda: string; status: number }> }>('/contas'),
  campanhas: (conta: string, de: string, ate: string) =>
    pedir<{ campanhas: CampanhaMeta[] }>(`/campanhas?conta=${encodeURIComponent(conta)}&de=${de}&ate=${ate}`),
};

export const lerCampanhas = async (modo: 'local' | 'servidor', conta: string, periodo: Periodo): Promise<LeituraMeta> => {
  const { de, ate } = intervaloDoPeriodo(periodo);
  if (modo === 'local') return { ok: true, campanhas: campanhasDemonstracao(conta, de, ate), demonstracao: true };
  try {
    const { campanhas } = await metaApi.campanhas(conta, de, ate);
    return { ok: true, campanhas, demonstracao: false };
  } catch (falha) {
    return { ok: false, erro: falha instanceof Error ? falha.message : 'Não foi possível ler as campanhas' };
  }
};
