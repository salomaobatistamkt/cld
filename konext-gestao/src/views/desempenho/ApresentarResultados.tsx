// Modo apresentação (uma parte por tela) e visualização para PDF, no mesmo visual claro do
// link do cliente. Mostram só o que foi escolhido em Desempenho → Relatório do cliente.
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { periodoDe, rotuloPeriodo, SeletorPeriodo } from '@/components/SeletorPeriodo';
import { dataBR, type EscolhaPeriodo, METRICAS_PADRAO, metricasApi, MODELOS_RELATORIO_PADRAO, type Relatorio, type Secao } from '@/lib/metricas';
import { parametrosCom } from '@/lib/performance';
import { useStore } from '@/lib/store';
import { type Cliente } from '@/lib/types';

import { RelatorioView } from './Portal';
import { BlocoRelatorio, blocosDe, ROTULO_BLOCO } from './Secoes';

const SECOES_PADRAO: Secao[] = ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'evolucao', 'comparativo', 'destaques', 'alertas'];

export const preferenciasDo = (cliente: Cliente | undefined, modelos = MODELOS_RELATORIO_PADRAO) => {
  const pref = cliente?.relatorio || {};
  const modelo = modelos.find((m) => m.id === pref.modeloId);
  return {
    secoes: (pref.secoes?.length ? pref.secoes : modelo?.secoes || SECOES_PADRAO) as Secao[],
    metricas: pref.metricas?.length ? pref.metricas : modelo?.metricas || METRICAS_PADRAO,
    titulo: pref.titulo || '',
    mensagem: pref.mensagem || '',
  };
};

const usarRelatorio = (cliente: Cliente | undefined, periodo: EscolhaPeriodo) => {
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const carregar = useCallback(async () => {
    if (!cliente) return;
    setCarregando(true);
    setErro('');
    try {
      setRel(await metricasApi.painel(cliente.id, periodo));
    } catch (f) {
      setErro(f instanceof Error ? f.message : 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }, [cliente, periodo]);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  return { rel, erro, carregando };
};

// Visualização do relatório do cliente dentro do sistema, pronta para “Baixar PDF”.
export const RelatorioPdf = ({ clienteId }: { clienteId: string }) => {
  const { dados, ir } = useStore();
  const cliente = dados.clientes.find((c) => c.id === clienteId);
  const pref = preferenciasDo(cliente, dados.config.modelosRelatorio?.length ? dados.config.modelosRelatorio : MODELOS_RELATORIO_PADRAO);
  const [periodo, setPeriodo] = useState<EscolhaPeriodo>(() => periodoDe('30'));
  const { rel, erro, carregando } = usarRelatorio(cliente, periodo);
  if (!cliente) return null;
  const voltar = (
    <button type="button" className="btn-claro" onClick={() => ir({ tela: 'desempenho', clienteId })}>
      <ArrowLeft size={16} /> Voltar
    </button>
  );
  return (
    <div className="sobreposicao-clara">
      {!rel ? (
        <div className="rel-espera">
          {erro ? <p>{erro}</p> : <><RefreshCw size={22} className="girando" /><p>Carregando…</p></>}
          {voltar}
        </div>
      ) : (
        <RelatorioView
          rel={{ ...rel, parametros: dados.config.performance ?? null, agencia: { nome: dados.config.empresa, logo: '' } }}
          periodo={periodo}
          aoMudarPeriodo={setPeriodo}
          carregando={carregando}
          secoes={pref.secoes}
          metricas={pref.metricas}
          clienteId={cliente.id}
          titulo={pref.titulo}
          mensagem={pref.mensagem}
          extra={voltar}
        />
      )}
    </div>
  );
};

export const ApresentarResultados = ({ clienteId }: { clienteId: string }) => {
  const { dados, ir } = useStore();
  const cliente = dados.clientes.find((c) => c.id === clienteId);
  const params = parametrosCom(dados.config.performance);
  const pref = preferenciasDo(cliente, dados.config.modelosRelatorio?.length ? dados.config.modelosRelatorio : MODELOS_RELATORIO_PADRAO);
  const [periodo, setPeriodo] = useState<EscolhaPeriodo>(() => periodoDe('30'));
  const { rel, erro } = usarRelatorio(cliente, periodo);
  const [indice, setIndice] = useState(0);

  const blocos = useMemo(() => blocosDe(pref.secoes), [pref.secoes]);
  const telas = useMemo(() => ['capa', ...blocos] as const, [blocos]);
  const sair = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    ir({ tela: 'desempenho', clienteId });
  }, [ir, clienteId]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.menu-periodo')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setIndice((i) => Math.min(telas.length - 1, i + 1));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIndice((i) => Math.max(0, i - 1));
      if (e.key === 'Escape' && !document.fullscreenElement) sair();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [telas.length, sair]);

  if (!cliente) return null;
  const pos = Math.min(indice, telas.length - 1);
  const atual = telas[pos];

  return (
    <div className="apresentar-claro">
      <div className="barra-apresentar-clara">
        <b>{cliente.nome}</b>
        <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} real={rel?.periodo} />
        <span className="espaco" />
        <button type="button" className="btn-claro" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} aria-label="Tela cheia">
          <Maximize size={16} />
        </button>
        <button type="button" className="btn-claro" onClick={sair} aria-label="Sair">
          <X size={16} />
        </button>
      </div>
      <div className="tela-apresentar-clara rel-claro">
        {erro ? <p className="rel-aviso">{erro}</p> : null}
        {!rel ? (
          <p className="nota-rel">
            <RefreshCw size={16} className="girando" /> Carregando resultados…
          </p>
        ) : atual === 'capa' ? (
          <div className="capa-clara">
            <h1>{pref.titulo || `Resultados de ${cliente.nome}`}</h1>
            <p>
              {dataBR(rel.periodo.de)} a {dataBR(rel.periodo.ate)} · {rotuloPeriodo(periodo).split(' · ')[0]}
            </p>
            <div className="sumario-claro">
              {blocos.map((b, i) => (
                <button key={b} type="button" onClick={() => setIndice(i + 1)}>
                  {ROTULO_BLOCO[b]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <BlocoRelatorio key={atual} bloco={atual} secoes={pref.secoes} rel={rel} params={params} clienteId={cliente.id} metricas={pref.metricas} />
        )}
      </div>
      <div className="rodape-apresentar-claro">
        <button type="button" className="btn-claro" onClick={() => setIndice(Math.max(0, pos - 1))} disabled={pos === 0} aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        <span>
          {pos + 1}/{telas.length} · {atual === 'capa' ? 'Capa' : ROTULO_BLOCO[atual]}
        </span>
        <button type="button" className="btn-claro escuro" onClick={() => setIndice(Math.min(telas.length - 1, pos + 1))} disabled={pos >= telas.length - 1} aria-label="Próxima">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
