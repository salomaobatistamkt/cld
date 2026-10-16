import { type Rota } from './types';

// A tela atual fica no endereço (#/clientes, #/cliente/abc/entregas…): atualizar a
// página não perde o lugar e o botão "voltar" do celular volta para a tela anterior.
export const rotaParaHash = (rota: Rota): string => {
  switch (rota.tela) {
    case 'cliente':
      return `#/cliente/${rota.id}${rota.aba ? `/${rota.aba}` : ''}`;
    case 'quadro':
      return `#/quadro/${rota.id}`;
    case 'processos':
      return rota.id ? `#/processos/${rota.id}` : '#/processos';
    case 'config':
      return rota.aba ? `#/config/${rota.aba}` : '#/config';
    case 'apresentacao':
      return `#/apresentacao/${rota.clienteId}`;
    case 'anuncios-execucao':
      return rota.id ? `#/anuncios-execucao/${rota.id}` : '#/anuncios-execucao';
    case 'desempenho':
      return rota.clienteId ? `#/desempenho/${rota.clienteId}` : '#/desempenho';
    case 'apresentar-resultados':
      return `#/apresentar-resultados/${rota.clienteId}`;
    default:
      return `#/${rota.tela}`;
  }
};

export const hashParaRota = (hash: string): Rota => {
  const [tela, id, aba] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  switch (tela) {
    case 'clientes':
    case 'entregas':
    case 'quadros':
    case 'caixa':
    case 'campanhas':
    case 'rotina':
    case 'anuncios-contas':
    case 'anuncios-diagnostico':
    case 'anuncios-criar':
    case 'anuncios-criativos':
      return { tela };
    case 'anuncios-execucao':
      return { tela: 'anuncios-execucao', id: id || undefined };
    case 'desempenho':
      return { tela: 'desempenho', clienteId: id || undefined };
    case 'apresentar-resultados':
      return id ? { tela: 'apresentar-resultados', clienteId: id } : { tela: 'desempenho' };
    case 'cliente':
      return id ? { tela: 'cliente', id, aba: aba || undefined } : { tela: 'clientes' };
    case 'quadro':
      return id ? { tela: 'quadro', id } : { tela: 'quadros' };
    case 'processos':
      return { tela: 'processos', id: id || undefined };
    case 'config':
      return { tela: 'config', aba: id || undefined };
    case 'apresentacao':
      return id ? { tela: 'apresentacao', clienteId: id } : { tela: 'clientes' };
    default:
      return { tela: 'painel' };
  }
};

export const lerHash = (): Rota => {
  try {
    return hashParaRota(window.location.hash);
  } catch {
    return { tela: 'painel' };
  }
};

export const gravarHash = (rota: Rota) => {
  try {
    const hash = rotaParaHash(rota);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  } catch {
    // ambientes sem histórico (pré-visualização) seguem só com a rota em memória
  }
};
