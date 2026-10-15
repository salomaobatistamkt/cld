import { type Dados } from './types';

export type Colecao = 'clientes' | 'servicos' | 'entregas' | 'quadros' | 'lancamentos' | 'processos';

export type Backend = {
  modo: 'local' | 'servidor';
  carregar: () => Promise<Dados | null>;
  salvarItem: (colecao: Colecao, item: { id: string }) => Promise<void>;
  removerItem: (colecao: Colecao, id: string) => Promise<void>;
  salvarConfig: (config: Dados['config']) => Promise<void>;
  substituirTudo: (dados: Dados) => Promise<void>;
};

const CHAVE = 'konext-gestao:dados';

const lerLocal = (): Dados | null => {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Dados) : null;
  } catch {
    return null;
  }
};

const gravarLocal = (dados: Dados) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // Sem armazenamento disponível (aba anônima, cota cheia): segue só em memória.
  }
};

// Modo navegador: guarda tudo no localStorage deste computador.
export const criarBackendLocal = (obterDados: () => Dados): Backend => {
  let agendado: ReturnType<typeof setTimeout> | null = null;
  const agendarGravacao = async () => {
    if (agendado) clearTimeout(agendado);
    agendado = setTimeout(() => gravarLocal(obterDados()), 250);
  };
  return {
    modo: 'local',
    carregar: async () => lerLocal(),
    salvarItem: agendarGravacao,
    removerItem: agendarGravacao,
    salvarConfig: agendarGravacao,
    substituirTudo: async (dados) => gravarLocal(dados),
  };
};

const requisitar = async (caminho: string, init?: RequestInit) => {
  const resposta = await fetch(`./api${caminho}`, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (resposta.status === 401) {
    window.dispatchEvent(new CustomEvent('konext:sessao-expirada'));
    throw new Error('Sessão expirada');
  }
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao falar com o servidor`);
  return resposta.status === 204 ? null : resposta.json();
};

// Modo servidor: cada registro é salvo sozinho, então duas pessoas editando
// coisas diferentes ao mesmo tempo não sobrescrevem o trabalho uma da outra.
export const criarBackendServidor = (): Backend => ({
  modo: 'servidor',
  carregar: async () => (await requisitar('/dados')) as Dados,
  salvarItem: async (colecao, item) => {
    await requisitar(`/${colecao}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(item) });
  },
  removerItem: async (colecao, id) => {
    await requisitar(`/${colecao}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  salvarConfig: async (config) => {
    await requisitar('/config', { method: 'PUT', body: JSON.stringify(config) });
  },
  substituirTudo: async (dados) => {
    await requisitar('/importar', { method: 'POST', body: JSON.stringify(dados) });
  },
});

export const detectarServidor = async (): Promise<{ servidor: boolean; autenticado: boolean }> => {
  try {
    const resposta = await fetch('./api/saude', { credentials: 'same-origin', cache: 'no-store' });
    if (!resposta.ok) return { servidor: false, autenticado: false };
    const corpo = (await resposta.json().catch(() => null)) as { app?: string; autenticado?: boolean } | null;
    return { servidor: corpo?.app === 'konext-gestao', autenticado: Boolean(corpo?.autenticado) };
  } catch {
    return { servidor: false, autenticado: false };
  }
};

export const entrarNoServidor = async (senha: string) => {
  const resposta = await fetch('./api/entrar', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ senha }),
  });
  if (resposta.ok) return null;
  const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
  return corpo.erro ?? `Erro ${resposta.status}`;
};

export const sairDoServidor = async () => {
  await fetch('./api/sair', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => undefined);
};
