export type Webhook = {
  id: string;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  segredo: string;
  criadoEm: string;
};

export type AtividadeWebhook = {
  id: string;
  webhook_id: string;
  webhook: string;
  evento: string;
  status: 'ok' | 'falhou';
  resposta: number | null;
  erro: string | null;
  tentativas: number;
  em: string;
};

export type ResultadoTeste = { ok: boolean; resposta: number | null; erro: string | null; tentativas: number };

// Mesma lista do servidor: serve para mostrar os eventos mesmo antes de carregar.
export const EVENTOS_WEBHOOK: Record<string, string> = {
  'cobranca.gerada': 'Cobrança gerada no Caixa',
  'cobranca.vencendo': 'Cobrança vence em 3 dias',
  'cobranca.vence_hoje': 'Cobrança vence hoje',
  'cobranca.vencida': 'Cobrança venceu e não foi paga',
  'cobranca.recebida': 'Cobrança marcada como recebida',
  'cliente.criado': 'Cliente novo cadastrado',
  'cliente.status_alterado': 'Status do cliente mudou',
  'entrega.status_alterado': 'Entrega mudou de etapa',
  'entrega.entregue': 'Entrega concluída',
  'rotina.horario': 'Tarefa da rotina chegou no horário',
  'rotina.concluida': 'Tarefa da rotina concluída',
};

const pedir = async <T,>(caminho: string, init?: RequestInit): Promise<T> => {
  const resposta = await fetch(`./api/webhooks${caminho}`, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...init });
  if (resposta.status === 401) window.dispatchEvent(new CustomEvent('konext:sessao-expirada'));
  if (resposta.status === 204) return null as T;
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error((corpo as { erro?: string }).erro ?? `Erro ${resposta.status}`);
  return corpo as T;
};

export const webhooksApi = {
  listar: () => pedir<{ webhooks: Webhook[] }>(''),
  salvar: (hook: Pick<Webhook, 'id' | 'nome' | 'url' | 'eventos' | 'ativo'>) =>
    pedir<{ webhook: Webhook }>(`/${encodeURIComponent(hook.id)}`, { method: 'PUT', body: JSON.stringify(hook) }),
  remover: (id: string) => pedir<null>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  testar: (id: string) => pedir<ResultadoTeste>(`/${encodeURIComponent(id)}/testar`, { method: 'POST', body: '{}' }),
  atividade: () => pedir<{ atividade: AtividadeWebhook[] }>('/atividade'),
};
