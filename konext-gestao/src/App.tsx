import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Package,
  PenTool,
  Search,
  Settings,
  Wallet,
  Workflow,
  X,
} from 'lucide-react';
import { lazy, type ReactNode, Suspense, useEffect, useMemo, useState } from 'react';

import { Logo } from '@/components/Logo';
import { sairDoServidor } from '@/lib/backend';
import { iniciarSistema } from '@/lib/inicio';
import { lerHash } from '@/lib/rotas';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Rota } from '@/lib/types';
import { diasAte } from '@/lib/util';
import { Apresentacao } from '@/views/Apresentacao';
import { Caixa } from '@/views/Caixa';
import { Campanhas } from '@/views/Campanhas';
import { ClienteFicha } from '@/views/ClienteFicha';
import { Clientes } from '@/views/Clientes';
import { Configuracoes } from '@/views/Configuracoes';
import { Entrar } from '@/views/Entrar';
import { Entregas } from '@/views/Entregas';
import { Painel } from '@/views/Painel';
import { Processos } from '@/views/Processos';
import { Quadros } from '@/views/Quadros';

const TelaQuadro = lazy(() => import('@/views/TelaQuadro'));

type ItemMenu = { tela: Rota['tela']; rotulo: string; curto?: string; icone: ReactNode; ir: Rota; badge?: number };

const usarLarguraRecolhida = () => {
  const consulta = '(max-width: 1100px) and (min-width: 721px)';
  const [recolher, setRecolher] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const mudar = () => setRecolher(mq.matches);
    mq.addEventListener('change', mudar);
    return () => mq.removeEventListener('change', mudar);
  }, []);
  return recolher;
};

export const App = () => {
  const { rota, ir, dados, pronto, erroSalvar, backend, precisaEntrar, erroInicial } = useStore();
  const toast = useToast((estado) => estado.toast);
  const recolherAuto = usarLarguraRecolhida();
  const [recolhidoManual, setRecolhidoManual] = useState<boolean | null>(null);
  const recolhido = recolhidoManual ?? recolherAuto;
  const [filtro, setFiltro] = useState('');
  const [maisAberto, setMaisAberto] = useState(false);

  useEffect(() => {
    const voltar = () => {
      setMaisAberto(false);
      useStore.setState({ rota: lerHash() });
    };
    window.addEventListener('popstate', voltar);
    return () => window.removeEventListener('popstate', voltar);
  }, []);

  const atrasadas = useMemo(
    () => dados.entregas.filter((e) => e.status !== 'entregue' && e.prazo && diasAte(e.prazo) < 0).length,
    [dados.entregas],
  );

  const itens: Record<string, ItemMenu> = {
    painel: { tela: 'painel', rotulo: 'Painel', icone: <LayoutDashboard size={19} />, ir: { tela: 'painel' } },
    clientes: { tela: 'clientes', rotulo: 'Clientes', icone: <Briefcase size={19} />, ir: { tela: 'clientes' } },
    entregas: { tela: 'entregas', rotulo: 'Entregas', icone: <Package size={19} />, ir: { tela: 'entregas' }, badge: atrasadas },
    quadros: { tela: 'quadros', rotulo: 'Estratégias', curto: 'Quadros', icone: <PenTool size={19} />, ir: { tela: 'quadros' } },
    campanhas: { tela: 'campanhas', rotulo: 'Campanhas', icone: <Megaphone size={19} />, ir: { tela: 'campanhas' } },
    caixa: { tela: 'caixa', rotulo: 'Caixa', icone: <Wallet size={19} />, ir: { tela: 'caixa' } },
    processos: { tela: 'processos', rotulo: 'Processos', icone: <Workflow size={19} />, ir: { tela: 'processos' } },
    config: { tela: 'config', rotulo: 'Configurações', icone: <Settings size={19} />, ir: { tela: 'config' } },
  };

  const grupos: Array<{ titulo: string; itens: ItemMenu[] }> = [
    { titulo: 'Visão geral', itens: [itens.painel] },
    { titulo: 'Clientes', itens: [itens.clientes, itens.entregas, itens.quadros, itens.campanhas] },
    { titulo: 'Empresa', itens: [itens.caixa, itens.processos, itens.config] },
  ];
  const barraInferior = [itens.painel, itens.clientes, itens.entregas, itens.quadros];
  const noMais = [itens.campanhas, itens.caixa, itens.processos, itens.config];

  const ativo = (item: ItemMenu) =>
    item.tela === rota.tela ||
    (item.tela === 'clientes' && (rota.tela === 'cliente' || rota.tela === 'apresentacao')) ||
    (item.tela === 'quadros' && rota.tela === 'quadro');

  const navegar = (item: ItemMenu) => {
    setMaisAberto(false);
    ir(item.ir);
  };

  const sair = async () => {
    await sairDoServidor();
    window.location.reload();
  };

  if (!pronto && precisaEntrar) return <Entrar />;

  if (!pronto && erroInicial) {
    return (
      <div className="tela-entrar">
        <div className="cartao-entrar">
          <Logo grande />
          <div>
            <h1>Servidor sem resposta</h1>
            <p className="muted">Não consegui carregar os dados ({erroInicial}). Confira sua internet e tente de novo.</p>
          </div>
          <button type="button" className="btn primario" onClick={() => iniciarSistema()}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!pronto) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <Logo />
      </div>
    );
  }

  const tela = (() => {
    switch (rota.tela) {
      case 'painel':
        return <Painel />;
      case 'clientes':
        return <Clientes />;
      case 'cliente':
      case 'apresentacao':
        return rota.tela === 'cliente' ? <ClienteFicha id={rota.id} aba={rota.aba} /> : <ClienteFicha id={rota.clienteId} />;
      case 'entregas':
        return <Entregas />;
      case 'quadros':
      case 'quadro':
        return <Quadros />;
      case 'campanhas':
        return <Campanhas />;
      case 'caixa':
        return <Caixa />;
      case 'processos':
        return <Processos idInicial={rota.id} />;
      case 'config':
        return <Configuracoes aba={rota.aba} />;
      default:
        return <Painel />;
    }
  })();

  return (
    <div className={`app${recolhido ? ' recolhido' : ''}`}>
      <aside className="sidebar">
        <div className="marca">
          <Logo compacto={recolhido} />
          <button type="button" className="btn fantasma icone botao-recolher" onClick={() => setRecolhidoManual(!recolhido)} aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}>
            {recolhido ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <label className="busca-menu">
          <Search size={15} />
          <input id="busca-menu" placeholder="Buscar no menu…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </label>
        <nav className="nav" aria-label="Menu principal">
          {grupos.map((grupo) => {
            const visiveis = grupo.itens.filter((item) => item.rotulo.toLowerCase().includes(filtro.toLowerCase()));
            if (visiveis.length === 0) return null;
            return (
              <div key={grupo.titulo} className="nav-bloco">
                <div className="nav-grupo">{grupo.titulo}</div>
                {visiveis.map((item) => (
                  <button key={item.tela} type="button" className={`nav-item${ativo(item) ? ' ativo' : ''}`} onClick={() => navegar(item)} title={item.rotulo}>
                    {item.icone}
                    <span>{item.rotulo}</span>
                    {item.badge ? <em className="badge">{item.badge}</em> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="rodape-sidebar">
          <span className={`ponto-status${backend?.modo === 'servidor' ? ' online' : ''}`} />
          <span>{backend?.modo === 'servidor' ? 'Online' : 'Protótipo · neste navegador'}</span>
          {backend?.modo === 'servidor' ? (
            <button type="button" className="btn fantasma icone botao-sair" onClick={sair} aria-label="Sair" title="Sair">
              <LogOut size={15} />
            </button>
          ) : null}
        </div>
      </aside>

      <header className="topo-celular">
        <Logo />
        <button type="button" className="btn fantasma icone" onClick={() => ir({ tela: 'config' })} aria-label="Configurações">
          <Settings size={19} />
        </button>
      </header>

      <main className="conteudo">{tela}</main>

      <nav className="barra-inferior" aria-label="Navegação">
        {barraInferior.map((item) => (
          <button key={item.tela} type="button" className={ativo(item) ? 'ativo' : ''} onClick={() => navegar(item)}>
            <span className="icone-barra">
              {item.icone}
              {item.badge ? <em className="badge">{item.badge}</em> : null}
            </span>
            <span>{item.curto ?? item.rotulo}</span>
          </button>
        ))}
        <button type="button" className={noMais.some(ativo) || maisAberto ? 'ativo' : ''} onClick={() => setMaisAberto(!maisAberto)}>
          <span className="icone-barra">{maisAberto ? <X size={19} /> : <MoreHorizontal size={19} />}</span>
          <span>Mais</span>
        </button>
      </nav>

      {maisAberto ? (
        <div className="fundo-mais" onClick={() => setMaisAberto(false)}>
          <div className="folha-mais" onClick={(e) => e.stopPropagation()}>
            {noMais.map((item) => (
              <button key={item.tela} type="button" className={`nav-item${ativo(item) ? ' ativo' : ''}`} onClick={() => navegar(item)}>
                {item.icone}
                <span>{item.rotulo}</span>
              </button>
            ))}
            {backend?.modo === 'servidor' ? (
              <button type="button" className="nav-item" onClick={sair}>
                <LogOut size={19} />
                <span>Sair</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {rota.tela === 'quadro' ? (
        <Suspense fallback={<div className="editor-quadro" style={{ placeItems: 'center', display: 'grid' }}>Abrindo quadro…</div>}>
          <TelaQuadro id={rota.id} />
        </Suspense>
      ) : null}
      {rota.tela === 'apresentacao' ? <Apresentacao clienteId={rota.clienteId} /> : null}

      {toast ? <div className={`toast${toast.erro ? ' erro' : ''}`}>{toast.texto}</div> : null}
      {erroSalvar ? <div className="toast erro">Não foi possível salvar: {erroSalvar}</div> : null}
      {precisaEntrar ? <Entrar /> : null}
    </div>
  );
};
