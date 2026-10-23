import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Calculator, ChevronLeft, ChevronRight, Gauge, LayoutDashboard, ListChecks, LogOut, MoreHorizontal, Package, Search, Settings, ShoppingBag, Wallet, X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { iniciarNuvem, useNuvem } from '@/lib/nuvem';
import { Entrar } from '@/components/Entrar';
import { Toast } from '@/components/ui';
import { Painel } from '@/components/Painel';
import { Receitas } from '@/components/Receitas';
import { Insumos } from '@/components/Insumos';
import { Precificacao } from '@/components/Precificacao';
import { Custos } from '@/components/Custos';
import { Pedidos } from '@/components/Pedidos';
import { Tarefas } from '@/components/Tarefas';
import { Caixa } from '@/components/Caixa';
import { Configuracoes } from '@/components/Configuracoes';

const TEXTO_STATUS = {
  sincronizado: 'Salvo na nuvem',
  salvando: 'Salvando…',
  offline: 'Sem conexão. Tentando de novo…',
  local: 'Salvo neste aparelho',
};

const ICONE = 18;
const GRUPOS = [
  { titulo: 'Visão geral', itens: [{ tela: 'painel', rotulo: 'Painel', icone: <LayoutDashboard size={ICONE} /> }] },
  {
    titulo: 'Produção',
    itens: [
      { tela: 'receitas', rotulo: 'Receitas', icone: <BookOpen size={ICONE} /> },
      { tela: 'insumos', rotulo: 'Insumos', icone: <Package size={ICONE} /> },
      { tela: 'pedidos', rotulo: 'Pedidos e entregas', curto: 'Pedidos', icone: <ShoppingBag size={ICONE} />, badge: 'pedidos' },
      { tela: 'tarefas', rotulo: 'Tarefas e demandas', curto: 'Tarefas', icone: <ListChecks size={ICONE} />, badge: 'tarefas' },
    ],
  },
  {
    titulo: 'Preço e lucro',
    itens: [
      { tela: 'precificacao', rotulo: 'Precificação', icone: <Calculator size={ICONE} /> },
      { tela: 'custos', rotulo: 'Custos e operação', icone: <Gauge size={ICONE} /> },
    ],
  },
  {
    titulo: 'Empresa',
    itens: [
      { tela: 'caixa', rotulo: 'Caixa', icone: <Wallet size={ICONE} /> },
      { tela: 'config', rotulo: 'Configurações', icone: <Settings size={ICONE} /> },
    ],
  },
];
const TODOS = GRUPOS.flatMap((g) => g.itens);
const NA_BARRA = ['painel', 'receitas', 'pedidos', 'tarefas'];

const lerHash = () => {
  if (typeof window === 'undefined') return 'painel';
  const t = window.location.hash.replace(/^#\/?/, '');
  return TODOS.some((i) => i.tela === t) ? t : 'painel';
};

export default function Home() {
  const [pronto, setPronto] = useState(false);
  const [tela, setTela] = useState('painel');
  const [extra, setExtra] = useState({});
  const [filtro, setFiltro] = useState('');
  const [recolhido, setRecolhido] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);

  const nuvem = useNuvem();
  const pedidos = useStore((s) => s.pedidos);
  const tarefas = useStore((s) => s.tarefas);

  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(async () => {
      await iniciarNuvem();
      setTela(lerHash());
      setPronto(true);
    });
    const aoMudarHash = () => { setTela(lerHash()); setExtra({}); };
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, []);

  const ir = useCallback((destino, dados = {}) => {
    setExtra(dados);
    setTela(destino);
    setMaisAberto(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#/${destino}`);
      document.querySelector('.conteudo')?.scrollTo?.({ top: 0 });
      window.scrollTo?.(0, 0);
    }
  }, []);

  const badges = useMemo(() => ({
    pedidos: pedidos.filter((p) => p.status === 'pendente').length,
    tarefas: tarefas.filter((t) => t.coluna !== 'feito').length,
  }), [pedidos, tarefas]);

  if (!pronto) {
    return <div className="carregando"><div className="hero-marca" role="img" aria-label="Dueto CaCau" /></div>;
  }

  if (nuvem.status === 'login' || nuvem.status === 'erro') return <Entrar />;

  const chave = `${tela}:${extra.nova ? 'nova' : ''}${extra.editar || ''}${extra.receitaId || ''}`;
  const conteudo = (() => {
    switch (tela) {
      case 'receitas': return <Receitas key={chave} abrirNovaAoEntrar={!!extra.nova} abrirEditorId={extra.editar} onIrParaPreco={(id) => ir('precificacao', { receitaId: id })} />;
      case 'insumos': return <Insumos />;
      case 'precificacao': return <Precificacao key={chave} receitaId={extra.receitaId} onVerReceita={(id) => ir('receitas', { editar: id })} />;
      case 'custos': return <Custos />;
      case 'pedidos': return <Pedidos />;
      case 'tarefas': return <Tarefas />;
      case 'caixa': return <Caixa />;
      case 'config': return <Configuracoes />;
      default: return <Painel ir={ir} />;
    }
  })();

  const emMais = TODOS.filter((i) => !NA_BARRA.includes(i.tela));

  return (
    <div className={`app${recolhido ? ' recolhido' : ''}`}>
      <aside className="sidebar">
        <div className="marca">
          <div className="selo">
            <div className="selo-img" role="img" aria-label="Dueto CaCau" />
            <div className="selo-texto">
              <span className="selo-nome">Dueto CaCau</span>
              <span className="selo-sub">Gestão da confeitaria</span>
            </div>
          </div>
          <button type="button" className="botao-recolher" onClick={() => setRecolhido(!recolhido)} aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}>
            {recolhido ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <label className="busca-menu">
          <Search size={15} />
          <input placeholder="Buscar no menu" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Buscar no menu" />
        </label>

        <nav className="nav" aria-label="Menu principal">
          {GRUPOS.map((g) => {
            const itens = g.itens.filter((i) => i.rotulo.toLowerCase().includes(filtro.toLowerCase()));
            if (!itens.length) return null;
            return (
              <div className="nav-bloco" key={g.titulo}>
                <div className="nav-grupo">{g.titulo}</div>
                {itens.map((i) => (
                  <button key={i.tela} type="button" className={`nav-item${tela === i.tela ? ' ativo' : ''}`} onClick={() => ir(i.tela)} title={i.rotulo} aria-current={tela === i.tela ? 'page' : undefined}>
                    {i.icone}
                    <span>{i.rotulo}</span>
                    {i.badge && badges[i.badge] ? <em className="badge">{badges[i.badge]}</em> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="rodape-sidebar">
          <span className={`ponto${nuvem.status === 'offline' ? ' alerta' : ''}`} />
          <span title={nuvem.mensagem || undefined}>{TEXTO_STATUS[nuvem.status] || 'Salvo neste aparelho'}</span>
        </div>
      </aside>

      <header className="topo-celular">
        <div className="selo">
          <div className="selo-img" role="img" aria-label="Dueto CaCau" />
          <span className="selo-nome" style={{ fontSize: 22 }}>Dueto CaCau</span>
        </div>
      </header>

      <main className="conteudo">{conteudo}</main>

      <nav className="barra-inferior" aria-label="Navegação">
        {NA_BARRA.map((t) => {
          const i = TODOS.find((x) => x.tela === t);
          return (
            <button key={t} type="button" className={tela === t ? 'ativo' : ''} onClick={() => ir(t)}>
              {i.icone}<span>{i.curto || i.rotulo}</span>
            </button>
          );
        })}
        <button type="button" className={emMais.some((i) => i.tela === tela) || maisAberto ? 'ativo' : ''} onClick={() => setMaisAberto(!maisAberto)}>
          {maisAberto ? <X size={ICONE} /> : <MoreHorizontal size={ICONE} />}<span>Mais</span>
        </button>
      </nav>

      {maisAberto ? (
        <div className="fundo-mais" onClick={() => setMaisAberto(false)}>
          <div className="folha-mais" onClick={(e) => e.stopPropagation()}>
            {emMais.map((i) => (
              <button key={i.tela} type="button" className={`nav-item${tela === i.tela ? ' ativo' : ''}`} onClick={() => ir(i.tela)}>
                {i.icone}<span>{i.rotulo}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Toast />
    </div>
  );
}
