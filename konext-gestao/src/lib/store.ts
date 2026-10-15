import { create } from 'zustand';

import { type Backend, type Colecao, criarBackendLocal } from './backend';
import { gravarHash, lerHash } from './rotas';
import { criarDadosExemplo } from './seed';
import { type Dados, type Rota } from './types';

type Item = { id: string };

type Estado = {
  dados: Dados;
  rota: Rota;
  pronto: boolean;
  backend: Backend | null;
  erroSalvar: string | null;
  usandoExemplos: boolean;
  // Servidor pediu senha (primeiro acesso ou sessão expirada).
  precisaEntrar: boolean;
  // O servidor existe mas não respondeu ao abrir: não caímos no modo navegador para não perder nada.
  erroInicial: string | null;
  iniciar: (backend: Backend) => Promise<void>;
  ir: (rota: Rota) => void;
  salvar: <C extends Colecao>(colecao: C, item: Dados[C][number]) => void;
  remover: (colecao: Colecao, id: string) => void;
  salvarConfig: (config: Dados['config']) => void;
  substituirTudo: (dados: Dados, usandoExemplos?: boolean) => void;
};

const vazio = (): Dados => ({
  ...criarDadosExemplo(),
  clientes: [],
  servicos: [],
  entregas: [],
  quadros: [],
  lancamentos: [],
  processos: [],
  rotina: [],
});

// Completa campos que versões antigas dos dados não tinham.
const normalizar = (dados: Dados): Dados => {
  const padrao = vazio();
  const config = { ...padrao.config, ...dados.config };
  // Primeira vez com os processos de serviço: traz os prontos e os tipos deles.
  if (!dados.config?.processosServico) {
    config.processosServico = padrao.config.processosServico;
    const novos = Object.keys(padrao.config.processosServico).filter((tipo) => !config.tiposServico.includes(tipo));
    config.tiposServico = [...novos, ...config.tiposServico];
  }
  return {
    ...dados,
    clientes: dados.clientes.map((c) => ({ ...c, metaContaId: c.metaContaId ?? '', notasReuniao: c.notasReuniao ?? '' })),
    rotina: dados.rotina ?? [],
    config,
  };
};

const CHAVE_EXEMPLOS = 'konext-gestao:exemplos';

const lerFlag = () => {
  try {
    return localStorage.getItem(CHAVE_EXEMPLOS) !== 'nao';
  } catch {
    return true;
  }
};

const gravarFlag = (usando: boolean) => {
  try {
    localStorage.setItem(CHAVE_EXEMPLOS, usando ? 'sim' : 'nao');
  } catch {
    // ignora
  }
};

export const useStore = create<Estado>((set, get) => {
  const relatarErro = (falha: unknown) =>
    set({ erroSalvar: falha instanceof Error ? falha.message : 'Não foi possível salvar' });

  return {
    dados: vazio(),
    rota: lerHash(),
    pronto: false,
    backend: null,
    erroSalvar: null,
    usandoExemplos: false,
    precisaEntrar: false,
    erroInicial: null,

    iniciar: async (backend) => {
      const salvos = await backend.carregar();
      if (salvos && (salvos.clientes.length || backend.modo === 'servidor')) {
        const dados = normalizar({ ...vazio(), ...salvos });
        set({ dados, backend, pronto: true, usandoExemplos: backend.modo === 'local' && lerFlag() && salvos.clientes.some((c) => c.id === 'c-padaria') });
        // Guarda os processos prontos no servidor: ele precisa deles para avisar o n8n na hora da rotina.
        if (!salvos.config?.processosServico) backend.salvarConfig(dados.config).catch(relatarErro);
        return;
      }
      if (backend.modo === 'local' && lerFlag()) {
        const exemplo = criarDadosExemplo();
        set({ dados: exemplo, backend, pronto: true, usandoExemplos: true });
        await backend.substituirTudo(exemplo);
        return;
      }
      set({ dados: salvos ?? vazio(), backend, pronto: true });
    },

    ir: (rota) => {
      set({ rota });
      gravarHash(rota);
      try {
        document.querySelector('.conteudo')?.scrollTo({ top: 0 });
      } catch {
        // ignora
      }
    },

    salvar: (colecao, item) => {
      const lista = get().dados[colecao] as Item[];
      const existe = lista.some((atual) => atual.id === item.id);
      const proxima = existe ? lista.map((atual) => (atual.id === item.id ? item : atual)) : [...lista, item];
      set({ dados: { ...get().dados, [colecao]: proxima }, erroSalvar: null });
      get().backend?.salvarItem(colecao, item).catch(relatarErro);
    },

    remover: (colecao, id) => {
      const lista = get().dados[colecao] as Item[];
      set({ dados: { ...get().dados, [colecao]: lista.filter((item) => item.id !== id) } });
      get().backend?.removerItem(colecao, id).catch(relatarErro);
    },

    salvarConfig: (config) => {
      set({ dados: { ...get().dados, config } });
      get().backend?.salvarConfig(config).catch(relatarErro);
    },

    substituirTudo: (dadosNovos, usandoExemplos = false) => {
      const dados = normalizar(dadosNovos);
      set({ dados, usandoExemplos });
      gravarFlag(usandoExemplos);
      get().backend?.substituirTudo(dados).catch(relatarErro);
    },
  };
});

export const criarBackendPadrao = () => criarBackendLocal(() => useStore.getState().dados);
export { vazio as dadosVazios };
