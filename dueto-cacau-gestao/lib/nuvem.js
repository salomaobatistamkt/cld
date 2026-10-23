import { create } from 'zustand';
import { useStore, pegarDados } from './store';

/**
 * Sincroniza os dados com o servidor (arquivo na VPS).
 * Estados: verificando | login | local | sincronizado | salvando | offline | erro
 *  - "local": não há servidor (ex.: prévia estática); os dados ficam só no navegador.
 */
export const useNuvem = create(() => ({ status: 'verificando', mensagem: '' }));
const mudar = (status, mensagem = '') => useNuvem.setState({ status, mensagem });

let rev = 0;
let aplicandoRemoto = false;
let sujo = false;
let gravando = false;
let temporizador = null;
let iniciado = false;
let ultimaSerial = '';

const chamar = async (url, opcoes) => {
  const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opcoes });
  let corpo = null;
  try { corpo = await r.json(); } catch (_) { /* resposta sem JSON */ }
  return { ok: r.ok, status: r.status, corpo };
};

const aplicarRemoto = (estado, novaRev) => {
  aplicandoRemoto = true;
  try {
    useStore.setState(estado);
    ultimaSerial = JSON.stringify(pegarDados(useStore.getState()));
  } finally {
    aplicandoRemoto = false;
  }
  rev = novaRev;
};

const gravar = async () => {
  if (gravando || !sujo) return;
  gravando = true;
  sujo = false;
  mudar('salvando');
  try {
    const dados = pegarDados(useStore.getState());
    const r = await chamar('/api/estado', { method: 'PUT', body: JSON.stringify({ baseRev: rev, estado: dados }) });
    if (r.ok) {
      rev = r.corpo.rev;
      ultimaSerial = JSON.stringify(dados);
      mudar(sujo ? 'salvando' : 'sincronizado');
    } else if (r.status === 409) {
      const atual = await chamar('/api/estado');
      if (atual.ok && atual.corpo?.estado) {
        aplicarRemoto(atual.corpo.estado, atual.corpo.rev);
        sujo = false;
        mudar('sincronizado', 'Outra pessoa alterou os dados ao mesmo tempo. A versão mais recente foi carregada.');
      }
    } else if (r.status === 401) {
      mudar('login');
    } else {
      sujo = true;
      mudar('offline', r.corpo?.erro || 'Não foi possível salvar.');
    }
  } catch (_) {
    sujo = true;
    mudar('offline', 'Sem conexão com o servidor. Vamos tentar de novo.');
  } finally {
    gravando = false;
    if (sujo) agendar(useNuvem.getState().status === 'offline' ? 8000 : 400);
  }
};

const agendar = (ms = 700) => {
  clearTimeout(temporizador);
  temporizador = setTimeout(gravar, ms);
};

const buscarAtualizacao = async () => {
  if (sujo || gravando || document.hidden) return;
  try {
    const r = await chamar('/api/estado');
    if (r.status === 401) return mudar('login');
    if (r.ok && r.corpo?.estado && r.corpo.rev !== rev && !sujo && !gravando) {
      aplicarRemoto(r.corpo.estado, r.corpo.rev);
      mudar('sincronizado');
    } else if (r.ok && useNuvem.getState().status === 'offline') {
      mudar('sincronizado');
    }
  } catch (_) {
    if (!sujo) mudar('offline', 'Sem conexão com o servidor.');
  }
};

const ligarMonitor = () => {
  if (iniciado) return;
  iniciado = true;
  useStore.subscribe((s) => {
    if (aplicandoRemoto) return;
    const atual = JSON.stringify(pegarDados(s));
    if (atual === ultimaSerial) return;
    sujo = true;
    mudar('salvando');
    agendar();
  });
  setInterval(buscarAtualizacao, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) buscarAtualizacao(); });
  window.addEventListener('online', () => { if (sujo) agendar(200); else buscarAtualizacao(); });
};

/** Chame depois de carregar os dados do navegador, e de novo depois do login. */
export const iniciarNuvem = async () => {
  try {
    const r = await chamar('/api/estado');
    if (r.status === 404 || r.status === 405) return mudar('local'); // sem servidor (prévia)
    if (r.status === 503) return mudar('erro', r.corpo?.erro || 'Servidor sem senha configurada.');
    if (r.status === 401) return mudar('login');
    if (!r.ok) return mudar('offline', r.corpo?.erro || 'Falha ao ler os dados do servidor.');

    if (r.corpo.estado) {
      aplicarRemoto(r.corpo.estado, r.corpo.rev);
      mudar('sincronizado');
    } else {
      // servidor vazio: envia o que já existe neste aparelho
      rev = r.corpo.rev || 0;
      ultimaSerial = '';
      sujo = true;
      ligarMonitor();
      return gravar();
    }
    ligarMonitor();
  } catch (_) {
    mudar('local');
  }
};

export const entrar = async (senha) => {
  const r = await chamar('/api/sessao', { method: 'POST', body: JSON.stringify({ senha }) });
  if (!r.ok) throw new Error(r.corpo?.erro || 'Não foi possível entrar.');
  await iniciarNuvem();
};

export const sair = async () => {
  await chamar('/api/sessao', { method: 'DELETE' });
  mudar('login');
};
