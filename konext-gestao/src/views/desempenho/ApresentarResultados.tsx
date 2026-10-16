// Modo apresentação dos resultados para calls: uma seção por tela, só o que foi escolhido
// para o cliente (Desempenho → Relatório do cliente).
import { ChevronLeft, ChevronRight, Maximize, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Avatar } from '@/components/ui';
import { intervaloDoPeriodo, PERIODOS, type Periodo } from '@/lib/meta';
import { dataBR, METRICAS_PADRAO, metricasApi, MODELOS_RELATORIO_PADRAO, type Relatorio, SECOES, type Secao } from '@/lib/metricas';
import { parametrosCom } from '@/lib/performance';
import { useStore } from '@/lib/store';

import { rotuloSecao, SecaoRelatorio } from './Secoes';

export const ApresentarResultados = ({ clienteId }: { clienteId: string }) => {
  const { dados, ir } = useStore();
  const cliente = dados.clientes.find((c) => c.id === clienteId);
  const params = parametrosCom(dados.config.performance);
  const modelos = dados.config.modelosRelatorio?.length ? dados.config.modelosRelatorio : MODELOS_RELATORIO_PADRAO;
  const pref = cliente?.relatorio || {};
  const modelo = modelos.find((m) => m.id === pref.modeloId);
  const escolhidas: Secao[] = pref.secoes?.length ? pref.secoes : modelo?.secoes || ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'evolucao', 'comparativo', 'destaques', 'alertas'];
  const secoes = SECOES.map((s) => s.id).filter((s) => escolhidas.includes(s));
  const metricas = pref.metricas?.length ? pref.metricas : modelo?.metricas || METRICAS_PADRAO;

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState('');
  const [indice, setIndice] = useState(0);

  const carregar = useCallback(async () => {
    if (!cliente) return;
    setErro('');
    try {
      const { de, ate } = intervaloDoPeriodo(periodo);
      setRel(await metricasApi.painel(cliente.id, de, ate));
    } catch (f) {
      setErro(f instanceof Error ? f.message : 'Erro ao carregar');
    }
  }, [cliente, periodo]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const telas = useMemo(() => ['capa', ...secoes] as Array<'capa' | Secao>, [secoes]);
  const sair = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    ir({ tela: 'desempenho', clienteId });
  }, [ir, clienteId]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
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
    <div className="apresentar-resultados">
      <div className="barra-apresentar">
        <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={28} />
        <b>{cliente.nome}</b>
        <select className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Período">
          {PERIODOS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <span className="espaco" />
        <button type="button" className="btn" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} aria-label="Tela cheia">
          <Maximize size={16} />
        </button>
        <button type="button" className="btn" onClick={sair} aria-label="Sair">
          <X size={16} />
        </button>
      </div>
      <div className="tela-apresentar">
        {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}
        {!rel ? (
          <p className="muted">
            <RefreshCw size={16} className="girando" /> Carregando resultados…
          </p>
        ) : atual === 'capa' ? (
          <div className="capa-resultados">
            <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={72} />
            <h1>{pref.titulo || `Resultados de ${cliente.nome}`}</h1>
            <p>
              {dataBR(rel.periodo.de)} a {dataBR(rel.periodo.ate)}
            </p>
            <div className="sumario-capa">
              {secoes.map((s, i) => (
                <button key={s} type="button" onClick={() => setIndice(i + 1)}>
                  {i + 1}. {rotuloSecao(s)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <SecaoRelatorio key={atual} secao={atual} rel={rel} params={params} clienteId={cliente.id} metricas={metricas} />
        )}
      </div>
      <div className="rodape-apresentar">
        <button type="button" className="btn" onClick={() => setIndice(Math.max(0, pos - 1))} disabled={pos === 0} aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        <span>
          {pos + 1}/{telas.length} · {atual === 'capa' ? 'Capa' : rotuloSecao(atual)}
        </span>
        <button type="button" className="btn primario" onClick={() => setIndice(Math.min(telas.length - 1, pos + 1))} disabled={pos >= telas.length - 1} aria-label="Próxima">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
