import { type Cliente } from './types';

export type DetalheMeta = { codigo: number | null; subcodigo?: number | null; mensagem: string; rastreio?: string | null } | null;

export class ErroApi extends Error {
  detalhe: DetalheMeta;
  constructor(mensagem: string, detalhe: DetalheMeta) {
    super(mensagem);
    this.detalhe = detalhe;
  }
}

export type StatusCheck = 'ok' | 'aviso' | 'erro' | 'info';

export type Diagnostico = {
  checks: Array<{
    id: string;
    titulo: string;
    status: StatusCheck;
    detalhe: string;
    itens?: Array<{ cliente: string; clienteId: string; conta?: string; status: StatusCheck; texto: string }>;
  }>;
  contas: Array<{ id: string; nome: string; status: number; statusTexto: string; moeda: string; fuso: string; negocio: string }>;
  permissoes: Array<{ nome: string; para: string; obrigatoria: boolean; concedida: boolean }>;
  uso: { app: unknown; contas: unknown; negocio: unknown; em: string | null };
};

export type AtivosConta = {
  cliente: { id: string; nome: string };
  conta: { id: string; nome: string; status: number; statusTexto: string; moeda: string; fuso: string; negocio: string };
  paginas: Array<{ id: string; nome: string; instagram: { id: string; usuario: string } | null }>;
  instagram: Array<{ id: string; usuario: string; viaPagina?: string }>;
  erros: { paginas?: { mensagem: string }; instagram?: { mensagem: string } };
};

const pedir = async <T,>(caminho: string, init?: RequestInit): Promise<T> => {
  const resposta = await fetch(`./api/anuncios${caminho}`, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...init });
  if (resposta.status === 401) window.dispatchEvent(new CustomEvent('konext:sessao-expirada'));
  const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string; detalhe?: DetalheMeta };
  if (!resposta.ok) throw new ErroApi(corpo.erro ?? `Erro ${resposta.status}`, corpo.detalhe ?? null);
  return corpo as T;
};

export const anunciosApi = {
  diagnostico: () => pedir<Diagnostico>('/diagnostico'),
  ativos: (clienteId: string) => pedir<AtivosConta>(`/clientes/${encodeURIComponent(clienteId)}/ativos`),
  validar: (clienteId: string, escolha: { paginaId: string; instagramId: string }) =>
    pedir<{ cliente: Cliente }>(`/clientes/${encodeURIComponent(clienteId)}/validar`, { method: 'POST', body: JSON.stringify(escolha) }),
};

export const contaNormalizada = (conta: string) => {
  const limpa = conta.trim().replace(/^act_/, '');
  return /^\d{3,25}$/.test(limpa) ? `act_${limpa}` : null;
};

// A validação só vale se foi feita para a conta que está hoje na ficha do cliente.
export const situacaoConta = (cliente: Cliente): { status: 'sem-conta' | 'invalida' | 'pendente' | 'validada'; texto: string } => {
  if (!cliente.metaContaId) return { status: 'sem-conta', texto: 'Sem conta de anúncios' };
  const act = contaNormalizada(cliente.metaContaId);
  if (!act) return { status: 'invalida', texto: 'ID da conta inválido' };
  if (cliente.metaValidacao?.contaId === act) return { status: 'validada', texto: 'Validada' };
  return { status: 'pendente', texto: cliente.metaValidacao ? 'Conta mudou: validar de novo' : 'Falta validar' };
};

// ---------------- Criação de campanhas ----------------

export type Midia = {
  id: string;
  clienteId: string | null;
  nome: string;
  tipo: 'imagem' | 'video';
  mime: string;
  tamanho: number;
  status: string;
  criadoEm: string;
  contasEnviadas: string[];
};

export type Publico = {
  id: string;
  nome: string;
  tipo: 'salvo' | 'personalizado';
  tipoTexto: string;
  categoria: string;
  resumo: string;
  tamanho: string;
  disponivel: boolean;
  restricao: string;
};

export type Referencia = { id: string; nome: string; objetivo: string; status: string };

export type ConfigAprendida = {
  origem: 'referencia' | 'padrao';
  referencia?: { id: string; nome: string };
  objective: string;
  destination_type: string;
  optimization_goal: string;
  cta: { type: string };
  ctaCopiado: boolean;
};

export type ModoOrcamento = 'conjunto' | 'campanha_diario' | 'campanha_total';

export type EntradaPlano = {
  clienteId: string;
  modelo: 'whatsapp' | 'instagram';
  referenciaId: string;
  nomeCampanha: string;
  texto: string;
  titulo: string;
  orcamento: { modo: ModoOrcamento; valor?: number; inicio?: string; fim?: string };
  itens: Array<{ midiaId: string; publicoId: string; nomeConjunto: string; nomeAnuncio: string; valor?: number }>;
};

export type PlanoRevisado = {
  clienteNome: string;
  contaId: string;
  contaNome: string;
  moeda: string;
  paginaId: string;
  instagramId: string | null;
  modeloRotulo: string;
  config: ConfigAprendida & { promoted_object: Record<string, string> };
  nomeCampanha: string;
  texto: string;
  orcamento: { modo: ModoOrcamento; valor: number | null; inicio: string; fim: string };
  itens: Array<{
    n: number;
    midiaNome: string;
    midiaTipo: string;
    publico: { id: string; nome: string; tipo: string; categoria: string };
    resumoPublico: string;
    nomeConjunto: string;
    nomeAnuncio: string;
    valor: number | null;
  }>;
  estimativa: { totalDiario: number | null; dias: number | null; totalPeriodo: number | null };
};

export type StatusOperacao = 'na_fila' | 'em_andamento' | 'aguardando_limite' | 'concluida' | 'parcial' | 'falha' | 'aguardando_correcao';

export type Operacao = {
  id: string;
  status: StatusOperacao;
  erro: string | null;
  proximaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  clienteId: string;
  clienteNome: string;
  contaId: string;
  contaNome: string;
  modelo: string;
  nomeCampanha: string;
  conjuntos: number;
  anuncios: number;
  progresso: { feitos: number; total: number; falhas: number };
  etapaAtual: string | null;
  campanhaId: string | null;
};

export type ObjetoOperacao = {
  chave: string;
  tipo: 'midia' | 'campanha' | 'conjunto' | 'criativo' | 'anuncio';
  nome: string;
  status: 'pendente' | 'enviando' | 'criado' | 'falhou' | 'bloqueado' | 'incerto' | 'aguardando_correcao';
  metaId: string | null;
  tentativas: number;
  erro: { mensagem: string } | null;
  estadoMeta: { texto?: string; efetivo?: string; erro?: string } | null;
};

export type OperacaoDetalhe = Operacao & {
  plano: PlanoRevisado;
  objetos: ObjetoOperacao[];
  historico: Array<{ acao: string; detalhe: unknown; em: string }>;
};

export const criacaoApi = {
  midias: (clienteId?: string) => pedir<{ midias: Midia[] }>(`/midias${clienteId ? `?cliente=${encodeURIComponent(clienteId)}` : ''}`),
  apagarMidia: (id: string) => pedir<unknown>(`/midias/${id}`, { method: 'DELETE' }),
  publicos: (clienteId: string, atualizar = false) =>
    pedir<{ contaId: string; atualizadoEm: string; erros: Record<string, string>; publicos: Publico[] }>(`/clientes/${clienteId}/publicos${atualizar ? '?atualizar=1' : ''}`),
  referencias: (clienteId: string, modelo: string) => pedir<{ referencias: Referencia[] }>(`/clientes/${clienteId}/referencias?modelo=${modelo}`),
  referencia: (clienteId: string, id: string, modelo: string) => pedir<{ config: ConfigAprendida }>(`/clientes/${clienteId}/referencias/${id}?modelo=${modelo}`),
  revisar: (entrada: EntradaPlano) => pedir<{ plano: PlanoRevisado; avisos: string[] }>('/operacoes/revisar', { method: 'POST', body: JSON.stringify(entrada) }),
  publicar: (entrada: EntradaPlano) => pedir<{ id: string }>('/operacoes', { method: 'POST', body: JSON.stringify(entrada) }),
  operacoes: () => pedir<{ operacoes: Operacao[] }>('/operacoes'),
  operacao: (id: string) => pedir<{ operacao: OperacaoDetalhe }>(`/operacoes/${id}`),
  acao: (id: string, acao: 'retomar' | 'ativar' | 'pausar' | 'verificar') => pedir<{ ok: boolean }>(`/operacoes/${id}/${acao}`, { method: 'POST', body: '{}' }),
  resolver: (id: string, chave: string, metaId: string | null) => pedir<{ ok: boolean }>(`/operacoes/${id}/resolver`, { method: 'POST', body: JSON.stringify({ chave, metaId }) }),
};

const PARTE = 8 * 1024 * 1024;

// Envia o arquivo em partes de 8 MB (aguenta vídeos grandes e conexões lentas).
export const enviarArquivo = async (arquivo: File, clienteId: string | null, aoProgredir: (fracao: number) => void): Promise<Midia> => {
  const { midia } = await pedir<{ midia: Midia }>('/midias', { method: 'POST', body: JSON.stringify({ nome: arquivo.name, tamanho: arquivo.size, clienteId }) });
  let enviado = 0;
  while (enviado < arquivo.size) {
    const fatia = arquivo.slice(enviado, Math.min(enviado + PARTE, arquivo.size));
    const resposta = await fetch(`./api/anuncios/midias/${midia.id}/parte?offset=${enviado}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'x-konext-upload': '1', 'content-type': 'application/octet-stream' },
      body: fatia,
    });
    const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string; recebido?: number };
    if (!resposta.ok) throw new ErroApi(corpo.erro ?? `Erro ${resposta.status} no envio`, null);
    enviado = corpo.recebido ?? enviado + fatia.size;
    aoProgredir(enviado / arquivo.size);
  }
  const { midia: pronta } = await pedir<{ midia: Midia }>(`/midias/${midia.id}/concluir`, { method: 'POST', body: '{}' });
  return pronta;
};

export const urlMidia = (id: string) => `./api/anuncios/midias/${id}/arquivo`;

export const ROTULO_STATUS_OPERACAO: Record<StatusOperacao, { texto: string; cor: string }> = {
  na_fila: { texto: 'Aguardando execução', cor: 'slate' },
  em_andamento: { texto: 'Em andamento', cor: 'sky' },
  aguardando_limite: { texto: 'Aguardando a Meta', cor: 'amber' },
  concluida: { texto: 'Concluído', cor: 'green' },
  parcial: { texto: 'Concluído parcialmente', cor: 'amber' },
  falha: { texto: 'Falha', cor: 'red' },
  aguardando_correcao: { texto: 'Aguardando correção', cor: 'red' },
};

export const NOMES_CONJUNTO_PADRAO = ['✅CJ - Aberto', '✅CJ - Compradores Envolvidos', '✅CJ - Remarketing'];

// Sugere o nome do conjunto pela categoria do público.
export const nomeConjuntoSugerido = (categoria: string, nomes: string[]) => {
  const c = categoria.toLowerCase();
  const achar = (trecho: string) => nomes.find((n) => n.toLowerCase().includes(trecho));
  if (c.startsWith('remarketing')) return achar('remarketing');
  if (c.startsWith('compradores')) return achar('comprador');
  if (c.startsWith('aberto')) return achar('aberto');
  return undefined;
};

export const numeroAnuncio = (n: number, total: number) => String(n).padStart(Math.max(2, String(total).length), '0');
