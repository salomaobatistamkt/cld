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
