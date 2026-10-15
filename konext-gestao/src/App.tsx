import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  PenTool,
  Search,
  Settings,
  Wallet,
  Workflow,
} from 'lucide-react';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';

import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Rota } from '@/lib/types';
import { diasAte } from '@/lib/util';
import { Apresentacao } from '@/views/Apresentacao';
import { Caixa } from '@/views/Caixa';
import { ClienteFicha } from '@/views/ClienteFicha';
import { Clientes } from '@/views/Clientes';
import { Configuracoes } from '@/views/Configuracoes';
import { Entregas } from '@/views/Entregas';
import { Painel } from '@/views/Painel';
import { Processos } from '@/views/Processos';
import { Quadros } from '@/views/Quadros';

const TelaQuadro = lazy(() => import('@/views/TelaQuadro'));

type ItemMenu = { tela: Rota['tela']; rotulo: string; icone: ReactNode; ir: Rota; badge?: number };

export const App = () => {
  const { rota, ir, dados, pronto, erroSalvar } = useStore();
  const toast = useToast((estado) => estado.toast);
  const [recolhido, setRecolhido] = useState(false);
  const [filtro, setFiltro] = useState('');

  const atrasadas = useMemo(
    () => dados.entregas.filter((e) => e.status !== 'entregue' && e.prazo && diasAte(e.prazo) < 0).length,
    [dados.entregas],
  );

  const grupos: Array<{ titulo: string; itens: ItemMenu[] }> = [
    { titulo: 'Visão geral', itens: [{ tela: 'painel', rotulo: 'Painel', icone: <LayoutDashboard size={18} />, ir: { tela: 'painel' } }] },
    {
      titulo: 'Clientes',
      itens: [
        { tela: 'clientes', rotulo: 'Clientes', icone: <Briefcase size={18} />, ir: { tela: 'clientes' } },
        { tela: 'entregas', rotulo: 'Entregas', icone: <Package size={18} />, ir: { tela: 'entregas' }, badge: atrasadas },
        { tela: 'quadros', rotulo: 'Estratégias', icone: <PenTool size={18} />, ir: { tela: 'quadros' } },
      ],
    },
    {
      titulo: 'Empresa',
      itens: [
        { tela: 'caixa', rotulo: 'Caixa', icone: <Wallet size={18} />, ir: { tela: 'caixa' } },
        { tela: 'processos', rotulo: 'Processos', icone: <Workflow size={18} />, ir: { tela: 'processos' } },
        { tela: 'config', rotulo: 'Configurações', icone: <Settings size={18} />, ir: { tela: 'config' } },
      ],
    },
  ];

  const ativo = (item: ItemMenu) =>
    item.tela === rota.tela ||
    (item.tela === 'clientes' && rota.tela === 'cliente') ||
    (item.tela === 'quadros' && rota.tela === 'quadro');

  if (!pronto) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-3)' }}>Carregando Konext Gestão…</div>;
  }

  const tela = (() => {
    switch (rota.tela) {
      case 'painel':
        return <Painel />;
      case 'clientes':
        return <Clientes />;
      case 'cliente':
        return <ClienteFicha id={rota.id} aba={rota.aba} />;
      case 'entregas':
        return <Entregas />;
      case 'quadros':
      case 'quadro':
        return <Quadros />;
      case 'caixa':
        return <Caixa />;
      case 'processos':
        return <Processos idInicial={rota.id} />;
      case 'config':
        return <Configuracoes />;
      default:
        return <Painel />;
    }
  })();

  return (
    <div className={`app${recolhido ? ' recolhido' : ''}`}>
      <aside className="sidebar">
        <div className="marca">
          <span className="logo">
            K<span className="logo-resto">o<b>next</b></span>
            <small>Gestão</small>
          </span>
          <button type="button" className="btn fantasma icone" onClick={() => setRecolhido(!recolhido)} aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}>
            {recolhido ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <label className="busca-menu">
          <Search size={15} />
          <input id="busca-menu" placeholder="Buscar no menu…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </label>
        <nav className="nav" aria-label="Menu principal">
          {grupos.map((grupo) => {
            const itens = grupo.itens.filter((item) => item.rotulo.toLowerCase().includes(filtro.toLowerCase()));
            if (itens.length === 0) return null;
            return (
              <div key={grupo.titulo} style={{ display: 'contents' }}>
                <div className="nav-grupo">{grupo.titulo}</div>
                {itens.map((item) => (
                  <button key={item.tela} type="button" className={`nav-item${ativo(item) ? ' ativo' : ''}`} onClick={() => ir(item.ir)} title={item.rotulo}>
                    {item.icone}
                    <span>{item.rotulo}</span>
                    {item.badge ? <em className="badge" style={{ fontStyle: 'normal' }}>{item.badge}</em> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="rodape-sidebar">
          <span>{dados.config.empresa} · {useStore.getState().backend?.modo === 'servidor' ? 'online' : 'neste navegador'}</span>
        </div>
      </aside>
      <main className="conteudo">{tela}</main>

      {rota.tela === 'quadro' ? (
        <Suspense fallback={<div className="editor-quadro" style={{ placeItems: 'center', display: 'grid' }}>Abrindo quadro…</div>}>
          <TelaQuadro id={rota.id} />
        </Suspense>
      ) : null}
      {rota.tela === 'apresentacao' ? <Apresentacao clienteId={rota.clienteId} /> : null}

      {toast ? <div className={`toast${toast.erro ? ' erro' : ''}`}>{toast.texto}</div> : null}
      {erroSalvar ? <div className="toast erro">Não foi possível salvar: {erroSalvar}</div> : null}
    </div>
  );
};
