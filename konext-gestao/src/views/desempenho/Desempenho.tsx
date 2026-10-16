// Desempenho: painel da equipe com as métricas do Meta Ads de cada cliente, avaliação de
// performance e o que o cliente vê (link exclusivo, apresentação e PDF).
import { AlertTriangle, BarChart3, Copy, Database, ExternalLink, FileDown, Link2, MessageCircle, Presentation, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { periodoDe, SeletorPeriodo } from '@/components/SeletorPeriodo';
import { Avatar, Vazio } from '@/components/ui';
import {
  BIBLIOTECA,
  type EscolhaPeriodo,
  type EstadoMetricas,
  formatar,
  type MapaAcoes,
  METRICAS_PADRAO,
  metricasApi,
  MODELOS_RELATORIO_PADRAO,
  quando,
  type Relatorio,
  ROTULO_OBJETIVO,
  SECOES,
  type Secao,
  urlPortal,
} from '@/lib/metricas';
import { classificarCtr, classificarCusto, parametrosCom } from '@/lib/performance';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Cliente } from '@/lib/types';

import { AvisoSoServidor } from '../anuncios/Diagnostico';
import { BlocoRelatorio, Selo, TabelaCampanhas } from './Secoes';

type Aba = 'geral' | 'campanhas' | 'publico' | 'videos' | 'acoes' | 'cliente';
const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'campanhas', rotulo: 'Campanhas' },
  { id: 'publico', rotulo: 'Público' },
  { id: 'videos', rotulo: 'Vídeos' },
  { id: 'cliente', rotulo: 'Relatório do cliente' },
  { id: 'acoes', rotulo: 'Métricas da conta' },
];
const TODAS: Secao[] = SECOES.map((s) => s.id);

const mensagemDe = (f: unknown) => (f instanceof Error ? f.message : 'Erro inesperado');

export const Desempenho = ({ clienteId }: { clienteId?: string }) => {
  const { dados, ir, backend } = useStore();
  const modoServidor = backend?.modo === 'servidor';
  const comConta = dados.clientes.filter((c) => c.status !== 'encerrado' && c.metaContaId);
  const cliente = comConta.find((c) => c.id === clienteId) || null;
  const params = parametrosCom(dados.config.performance);

  const [estado, setEstado] = useState<EstadoMetricas | null>(null);
  const [periodo, setPeriodo] = useState<EscolhaPeriodo>(() => periodoDe('30'));
  const [comparar, setComparar] = useState(true);
  const [campanhaId, setCampanhaId] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [listaCampanhas, setListaCampanhas] = useState<Array<{ id: string; nome: string }>>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<Aba>('geral');
  const mostrar = useToast((e) => e.mostrar);

  const carregarEstado = useCallback(() => {
    if (!modoServidor) return;
    metricasApi.estado().then(setEstado).catch(() => undefined);
  }, [modoServidor]);
  useEffect(carregarEstado, [carregarEstado]);

  useEffect(() => {
    setCampanhaId('');
    setObjetivo('');
    setProcedimento('');
    setListaCampanhas([]);
    setRel(null);
  }, [clienteId]);

  const carregar = useCallback(async () => {
    if (!cliente || !modoServidor) return;
    setCarregando(true);
    setErro('');
    try {
      const r = await metricasApi.painel(cliente.id, periodo, campanhaId || undefined, comparar);
      setRel(r);
      if (!campanhaId) setListaCampanhas(r.campanhas.map((c) => ({ id: c.id, nome: c.nome })));
    } catch (f) {
      setErro(mensagemDe(f));
    } finally {
      setCarregando(false);
    }
  }, [cliente, modoServidor, periodo, campanhaId, comparar]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const sincronizar = async (dias?: 'maximo') => {
    if (!cliente) return;
    if (dias === 'maximo' && !window.confirm('Baixar todo o histórico da conta (até 37 meses)? Em contas grandes pode levar alguns minutos.')) return;
    setSincronizando(true);
    try {
      const r = await metricasApi.sincronizar(cliente.id, dias);
      mostrar(`Atualizado: ${r.linhas} registros de ${r.de.split('-').reverse().join('/')} a ${r.ate.split('-').reverse().join('/')}.`);
      carregarEstado();
      await carregar();
    } catch (f) {
      mostrar(mensagemDe(f), true);
      carregarEstado();
    } finally {
      setSincronizando(false);
    }
  };

  const est = estado?.clientes.find((c) => c.clienteId === cliente?.id);
  const objetivos = useMemo(() => [...new Set((rel?.campanhas || []).map((c) => c.objetivo).filter(Boolean))], [rel]);
  const procedimentos = useMemo(() => [...new Set((rel?.campanhas || []).map((c) => c.procedimento).filter(Boolean))], [rel]);
  const relFiltrado = useMemo(() => {
    if (!rel) return null;
    if (!objetivo && !procedimento) return rel;
    return { ...rel, campanhas: rel.campanhas.filter((c) => (!objetivo || c.objetivo === objetivo) && (!procedimento || c.procedimento === procedimento)) };
  }, [rel, objetivo, procedimento]);

  if (!modoServidor) {
    return (
      <div className="pagina">
        <div className="cabecalho">
          <div>
            <h1>
              <BarChart3 size={26} /> Desempenho
            </h1>
          </div>
        </div>
        <AvisoSoServidor />
      </div>
    );
  }

  const props = relFiltrado ? { rel: relFiltrado, params, clienteId: cliente?.id, metricas: cliente?.relatorio?.metricas } : null;

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <BarChart3 size={26} /> Desempenho
          </h1>
          <p>Resultados do Meta Ads de cada cliente.</p>
        </div>
        <button type="button" className="btn" onClick={() => ir({ tela: 'config', aba: 'performance' })}>
          <Settings size={16} /> Referências
        </button>
      </div>

      {comConta.length === 0 ? (
        <Vazio icone={<BarChart3 size={28} />} texto="Nenhum cliente com conta de anúncios. Informe a conta (act_…) na ficha do cliente." acao={<button type="button" className="btn" onClick={() => ir({ tela: 'clientes' })}>Ir para clientes</button>} />
      ) : (
        <>
          <div className="grade-clientes-desempenho">
            {comConta.map((c) => {
              const e = estado?.clientes.find((x) => x.clienteId === c.id);
              return (
                <button key={c.id} type="button" className={`cartao-cliente-desempenho${c.id === cliente?.id ? ' ativo' : ''}`} onClick={() => ir({ tela: 'desempenho', clienteId: c.id })}>
                  <Avatar nome={c.nome} cor={c.cor} tamanho={30} />
                  <span>
                    <b>{c.nome}</b>
                    <small className={e?.sincronizacao?.status === 'erro' ? 'erro-texto' : 'muted'}>
                      {e?.contaCompartilhada ? 'Conta ligada a outro cliente' : e?.sincronizacao?.status === 'erro' ? 'Falha na atualização' : `Atualizado ${quando(e?.sincronizacao?.em)}`}
                    </small>
                  </span>
                  {e?.portal ? <Link2 size={14} className="muted" aria-label="Tem link do cliente" /> : null}
                </button>
              );
            })}
          </div>

          {!cliente ? (
            <Vazio icone={<BarChart3 size={28} />} texto="Escolha um cliente acima." />
          ) : (
            <section className="painel-desempenho">
              <div className="barra-filtros">
                <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} real={rel?.periodo} desabilitado={carregando} />
                <select className="input" value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} aria-label="Campanha">
                  <option value="">Todas as campanhas</option>
                  {listaCampanhas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {objetivos.length > 1 && !campanhaId ? (
                  <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} aria-label="Objetivo">
                    <option value="">Todos os objetivos</option>
                    {objetivos.map((o) => (
                      <option key={o} value={o}>
                        {ROTULO_OBJETIVO[o] || o}
                      </option>
                    ))}
                  </select>
                ) : null}
                {procedimentos.length > 1 && !campanhaId ? (
                  <select className="input" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} aria-label="Procedimento">
                    <option value="">Todos os procedimentos</option>
                    {procedimentos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : null}
                <label className="marcar">
                  <input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} /> Comparar com o período anterior
                </label>
                <div className="sinc">
                  <span className="muted">Atualizado {quando(est?.sincronizacao?.em)}</span>
                  <button type="button" className="btn" onClick={() => void sincronizar()} disabled={sincronizando || est?.sincronizacao?.executando}>
                    <RefreshCw size={15} className={sincronizando ? 'girando' : ''} /> {sincronizando ? 'Atualizando…' : 'Atualizar agora'}
                  </button>
                  <button type="button" className="btn" onClick={() => void sincronizar('maximo')} disabled={sincronizando} title="Baixa todo o histórico da conta para os gráficos de períodos longos">
                    <Database size={15} /> Histórico completo
                  </button>
                </div>
              </div>

              {est?.sincronizacao?.status === 'erro' ? (
                <div className="faixa alerta">
                  <AlertTriangle size={18} />
                  <p>A última atualização falhou: {est.sincronizacao.erro}</p>
                </div>
              ) : null}
              {erro ? (
                <div className="faixa alerta">
                  <AlertTriangle size={18} />
                  <p>{erro}</p>
                  <button type="button" className="btn pequeno" onClick={carregar}>
                    Tentar de novo
                  </button>
                </div>
              ) : null}
              {rel?.avisos.map((a) => (
                <div key={a} className="faixa">
                  <AlertTriangle size={18} />
                  <p>{a}</p>
                </div>
              ))}

              <div className="abas-desempenho" role="tablist">
                {ABAS.map((a) => (
                  <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>
                    {a.rotulo}
                  </button>
                ))}
              </div>

              {carregando && !rel ? <p className="muted">Carregando…</p> : null}
              {props ? (
                <div className={`rel-escuro${carregando ? ' carregando-suave' : ''}`}>
                  {aba === 'geral' ? (
                    <>
                      <BlocoRelatorio bloco="visao" secoes={TODAS} {...props} />
                      <BlocoRelatorio bloco="evolucao" secoes={TODAS} {...props} />
                      <BlocoRelatorio bloco="destaques" secoes={TODAS} {...props} />
                      <BlocoRelatorio bloco="alertas" secoes={TODAS} {...props} />
                    </>
                  ) : null}
                  {aba === 'campanhas' ? <AbaCampanhas rel={props.rel} params={params} clienteId={cliente.id} /> : null}
                  {aba === 'publico' ? <BlocoRelatorio bloco="publico" secoes={TODAS} {...props} /> : null}
                  {aba === 'videos' ? (props.rel.videos?.length ? <BlocoRelatorio bloco="videos" secoes={TODAS} {...props} /> : <p className="vazio-rel">Nenhum anúncio em vídeo com reproduções neste período.</p>) : null}
                  {aba === 'acoes' ? <MetricasDaConta cliente={cliente} periodo={periodo} contaId={rel?.contaId || ''} aoSalvar={carregar} /> : null}
                  {aba === 'cliente' ? <RelatorioDoCliente cliente={cliente} rel={rel} temLink={Boolean(est?.portal)} aoMudarLink={carregarEstado} /> : null}
                </div>
              ) : null}
            </section>
          )}
        </>
      )}
    </div>
  );
};

// Campanhas, conjuntos e anúncios.
const AbaCampanhas = ({ rel, params, clienteId }: { rel: Relatorio; params: ReturnType<typeof parametrosCom>; clienteId: string }) => {
  const [nivel, setNivel] = useState<'campanhas' | 'conjuntos' | 'anuncios'>('campanhas');
  const idsCampanhas = new Set(rel.campanhas.map((c) => c.id));
  const nomeCampanha = new Map(rel.campanhas.map((c) => [c.id, c.nome]));
  const linhas =
    nivel === 'conjuntos'
      ? (rel.conjuntos || []).filter((c) => idsCampanhas.has(c.campanhaId))
      : nivel === 'anuncios'
        ? (rel.anuncios || []).filter((a) => idsCampanhas.has(a.campanhaId))
        : [];
  return (
    <section className="bloco-rel">
      <div className="abas-rel">
        {(['campanhas', 'conjuntos', 'anuncios'] as const).map((n) => (
          <button key={n} type="button" className={nivel === n ? 'ativo' : ''} onClick={() => setNivel(n)}>
            {n === 'campanhas' ? 'Campanhas' : n === 'conjuntos' ? 'Conjuntos' : 'Anúncios'}
          </button>
        ))}
      </div>
      {nivel === 'campanhas' ? (
        <TabelaCampanhas campanhas={rel.campanhas} params={params} clienteId={clienteId} />
      ) : !linhas.length ? (
        <p className="vazio-rel">Sem dados neste nível para o período.</p>
      ) : (
        <div className="tabela-rel-wrap">
          <table className="tabela-rel">
            <thead>
              <tr>
                <th>{nivel === 'conjuntos' ? 'Conjunto' : 'Anúncio'}</th>
                <th className="num">Investido</th>
                <th className="num">Resultados</th>
                <th className="num">Custo por resultado</th>
                <th className="num">Impressões</th>
                <th className="num">CTR</th>
                <th className="num">CPC</th>
              </tr>
            </thead>
            <tbody>
              {[...linhas]
                .sort((a, b) => b.m.gasto - a.m.gasto)
                .map((l) => (
                  <tr key={l.id}>
                    <td className="nome-camp" data-rotulo={nivel === 'conjuntos' ? 'Conjunto' : 'Anúncio'}>
                      {l.nome}
                      <small className="tipo-res">{nomeCampanha.get(l.campanhaId)}</small>
                    </td>
                    <td className="num" data-rotulo="Investido">{formatar(l.m.gasto, 'moeda')}</td>
                    <td className="num" data-rotulo="Resultados">
                      {formatar(l.m.resultados, 'numero')}
                      {l.m.resultados !== null ? <small className="tipo-res">{l.m.tipoResultado.toLowerCase()}</small> : null}
                    </td>
                    <td className="num" data-rotulo="Custo por resultado">
                      {formatar(l.m.custoPorResultado, 'moeda')} <Selo c={classificarCusto(l.m, params, { clienteId })} />
                    </td>
                    <td className="num" data-rotulo="Impressões">{formatar(l.m.impressoes, 'numero')}</td>
                    <td className="num" data-rotulo="CTR">
                      {formatar(l.m.ctrLink, 'pct')} <Selo c={classificarCtr(l.m, params, { clienteId })} />
                    </td>
                    <td className="num" data-rotulo="CPC">{formatar(l.m.cpcLink, 'moeda')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// Todas as ações que a Meta devolve para a conta. Aqui se escolhe qual delas é “seguidor”
// e qual é “visita ao perfil”, igual ao que aparece no Gerenciador.
const NOMES_ACAO: Record<string, string> = {
  link_click: 'Cliques no link',
  page_engagement: 'Engajamento com a página',
  post_engagement: 'Engajamento com a publicação',
  post_reaction: 'Reações',
  comment: 'Comentários',
  post: 'Compartilhamentos',
  like: 'Curtidas da página',
  video_view: 'Reproduções de 3 s',
  landing_page_view: 'Visualizações da página de destino',
  'onsite_conversion.messaging_conversation_started_7d': 'Conversas iniciadas',
  'onsite_conversion.messaging_first_reply': 'Primeiras respostas',
  'onsite_conversion.total_messaging_connection': 'Conexões por mensagem',
  'onsite_conversion.post_save': 'Salvamentos',
  instagram_profile_visit: 'Visitas ao perfil do Instagram',
};

const MetricasDaConta = ({ cliente, periodo, contaId, aoSalvar }: { cliente: Cliente; periodo: EscolhaPeriodo; contaId: string; aoSalvar: () => void }) => {
  const { dados, salvarConfig } = useStore();
  const mostrar = useToast((e) => e.mostrar);
  const [acoes, setAcoes] = useState<Array<{ tipo: string; total: number; seguidor: boolean; visitaPerfil: boolean }> | null>(null);
  const [erro, setErro] = useState('');
  const carregar = useCallback(() => {
    setErro('');
    metricasApi
      .acoes(cliente.id, periodo)
      .then((r) => setAcoes(r.acoes))
      .catch((f) => setErro(mensagemDe(f)));
  }, [cliente.id, periodo]);
  useEffect(carregar, [carregar]);
  const mapa: MapaAcoes = (contaId && dados.config.acoesMetricas?.[contaId]) || {};
  const marcar = (campo: keyof MapaAcoes, tipo: string, ligado: boolean) => {
    if (!contaId) return;
    const atual = mapa[campo]?.length ? mapa[campo]! : (acoes || []).filter((a) => (campo === 'seguidores' ? a.seguidor : a.visitaPerfil)).map((a) => a.tipo);
    const novo = ligado ? [...new Set([...atual, tipo])] : atual.filter((t) => t !== tipo);
    salvarConfig({ ...dados.config, acoesMetricas: { ...(dados.config.acoesMetricas || {}), [contaId]: { ...mapa, [campo]: novo } } });
    mostrar('Salvo. Os números são recalculados com essa escolha.');
    setTimeout(() => {
      carregar();
      aoSalvar();
    }, 600);
  };
  return (
    <section className="bloco-rel">
      <div className="cabeca-bloco">
        <h2>Métricas da conta</h2>
        <p>Tudo o que a Meta informou para esta conta no período. Marque qual ação conta como seguidor ganho com anúncios e como visita ao perfil (use o mesmo nome da coluna do Gerenciador).</p>
      </div>
      {erro ? <p className="erro-texto">{erro}</p> : null}
      {!acoes ? (
        <p className="muted">Carregando…</p>
      ) : !acoes.length ? (
        <p className="vazio-rel">A Meta não devolveu ações neste período.</p>
      ) : (
        <div className="tabela-rel-wrap">
          <table className="tabela-rel">
            <thead>
              <tr>
                <th>Ação informada pela Meta</th>
                <th className="num">Total no período</th>
                <th>É seguidor?</th>
                <th>É visita ao perfil?</th>
              </tr>
            </thead>
            <tbody>
              {acoes.map((a) => (
                <tr key={a.tipo}>
                  <td className="nome-camp" data-rotulo="Ação">
                    {NOMES_ACAO[a.tipo] || a.tipo}
                    <small className="tipo-res">{a.tipo}</small>
                  </td>
                  <td className="num" data-rotulo="Total">{formatar(a.total, 'numero')}</td>
                  <td data-rotulo="É seguidor?">
                    <input type="checkbox" checked={a.seguidor} onChange={(e) => marcar('seguidores', a.tipo, e.target.checked)} aria-label={`${a.tipo} é seguidor`} />
                  </td>
                  <td data-rotulo="É visita ao perfil?">
                    <input type="checkbox" checked={a.visitaPerfil} onChange={(e) => marcar('visitasPerfil', a.tipo, e.target.checked)} aria-label={`${a.tipo} é visita ao perfil`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nota-rel">Se nenhuma ação de seguidor aparecer aqui, a Meta ainda não está entregando “Seguidores no Instagram” para esta conta pela API; nesse caso o número fica como indisponível (não estimamos).</p>
    </section>
  );
};

// O que o cliente vê: modelo, seções, métricas, textos e o link exclusivo.
const RelatorioDoCliente = ({ cliente, rel, temLink, aoMudarLink }: { cliente: Cliente; rel: Relatorio | null; temLink: boolean; aoMudarLink: () => void }) => {
  const { dados, salvar, ir } = useStore();
  const mostrar = useToast((e) => e.mostrar);
  const modelos = dados.config.modelosRelatorio?.length ? dados.config.modelosRelatorio : MODELOS_RELATORIO_PADRAO;
  const pref = cliente.relatorio || {};
  const modelo = modelos.find((m) => m.id === pref.modeloId);
  const secoes: Secao[] = pref.secoes?.length ? pref.secoes : modelo?.secoes || ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'evolucao', 'comparativo', 'destaques', 'alertas'];
  const metricas = pref.metricas?.length ? pref.metricas : modelo?.metricas || METRICAS_PADRAO;
  const [link, setLink] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const gravar = (parcial: Partial<NonNullable<Cliente['relatorio']>>) => salvar('clientes', { ...cliente, relatorio: { ...pref, secoes, metricas, ...parcial } });
  const aplicarModelo = (id: string) => {
    const m = modelos.find((x) => x.id === id);
    if (m) salvar('clientes', { ...cliente, relatorio: { ...pref, modeloId: m.id, secoes: m.secoes, metricas: m.metricas } });
  };
  const alternarSecao = (id: Secao) => gravar({ secoes: secoes.includes(id) ? secoes.filter((s) => s !== id) : SECOES.map((s) => s.id).filter((s) => s === id || secoes.includes(s)) });
  const alternarMetrica = (id: string) => gravar({ metricas: metricas.includes(id) ? metricas.filter((m) => m !== id) : [...metricas, id] });

  useEffect(() => {
    setLink('');
    if (!temLink) return;
    metricasApi
      .lerLink(cliente.id)
      .then((r) => setLink(urlPortal(r.token)))
      .catch(() => undefined);
  }, [cliente.id, temLink]);

  const gerar = async () => {
    if (temLink && !window.confirm('Gerar um link novo? O link atual deixa de funcionar na hora.')) return;
    setOcupado(true);
    try {
      const r = await metricasApi.gerarLink(cliente.id);
      setLink(urlPortal(r.token));
      aoMudarLink();
      mostrar('Link do cliente gerado.');
    } catch (f) {
      mostrar(mensagemDe(f), true);
    } finally {
      setOcupado(false);
    }
  };
  const revogar = async () => {
    if (!window.confirm(`Revogar o link de ${cliente.nome}? Quem tiver o link perde o acesso na hora.`)) return;
    setOcupado(true);
    try {
      await metricasApi.revogarLink(cliente.id);
      setLink('');
      aoMudarLink();
      mostrar('Link revogado.');
    } catch (f) {
      mostrar(mensagemDe(f), true);
    } finally {
      setOcupado(false);
    }
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      mostrar('Link copiado.');
    } catch {
      mostrar('Não foi possível copiar. Selecione o link e copie manualmente.', true);
    }
  };
  const whatsapp = () => {
    const numero = (cliente.contato?.whatsapp || '').replace(/\D/g, '');
    const texto = `Olá! Aqui está o link para acompanhar os resultados das suas campanhas, atualizado automaticamente: ${link}`;
    window.open(`https://wa.me/${numero.length >= 10 ? (numero.startsWith('55') ? numero : `55${numero}`) : ''}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const disponivel = (id: string) => {
    if (!rel) return null;
    const def = BIBLIOTECA.find((b) => b.id === id);
    if ((id === 'resultados' || id === 'custoPorResultado') && Object.keys(rel.resumo.resultadosPorTipo || {}).length > 1) return true;
    return def ? def.ler(rel.resumo) !== null : null;
  };
  const categorias = [...new Set(BIBLIOTECA.map((b) => b.categoria))];

  return (
    <div className="relatorio-cliente">
      <section className="bloco-rel">
        <div className="cabeca-rel">
          <h3>
            <Link2 size={18} /> Link exclusivo do cliente
          </h3>
          <p>O cliente acompanha os resultados sem entrar no Gerenciador. O link é só de leitura, mostra apenas os dados deste cliente e pode ser revogado a qualquer momento.</p>
        </div>
        {link ? (
          <div className="linha-link">
            <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link do cliente" />
            <button type="button" className="btn" onClick={copiar}>
              <Copy size={15} /> Copiar
            </button>
            <button type="button" className="btn" onClick={whatsapp}>
              <MessageCircle size={15} /> WhatsApp
            </button>
            <a className="btn" href={link} target="_blank" rel="noreferrer noopener">
              <ExternalLink size={15} /> Abrir
            </a>
          </div>
        ) : (
          <p className="muted">{temLink ? 'Carregando link…' : 'Este cliente ainda não tem link.'}</p>
        )}
        <div className="acoes">
          <button type="button" className="btn primario" onClick={gerar} disabled={ocupado}>
            <Link2 size={15} /> {temLink ? 'Gerar novo link (invalida o atual)' : 'Gerar link'}
          </button>
          {temLink ? (
            <button type="button" className="btn perigo" onClick={revogar} disabled={ocupado}>
              <Trash2 size={15} /> Revogar link
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => ir({ tela: 'apresentar-resultados', clienteId: cliente.id })}>
            <Presentation size={15} /> Apresentar em reunião
          </button>
          <button type="button" className="btn" onClick={() => ir({ tela: 'relatorio-pdf', clienteId: cliente.id })}>
            <FileDown size={15} /> Ver e baixar PDF
          </button>
        </div>
      </section>

      <section className="bloco-rel">
        <div className="cabeca-rel">
          <h3>O que o cliente vê</h3>
          <p>Vale para o portal e para a apresentação. Escolha um modelo e ajuste as seções e métricas.</p>
        </div>
        <label className="campo">
          <span>Modelo de apresentação</span>
          <select className="input" value={pref.modeloId || ''} onChange={(e) => aplicarModelo(e.target.value)}>
            <option value="">Personalizado</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <div className="grade-escolhas">
          {SECOES.map((s) => (
            <label key={s.id} className="opcao-escolha">
              <input type="checkbox" checked={secoes.includes(s.id)} onChange={() => alternarSecao(s.id)} /> {s.rotulo}
            </label>
          ))}
        </div>
        <h4 className="sub-titulo">Métricas em destaque (cartões de “Investimento e resultados”)</h4>
        {categorias.map((cat) => (
          <div key={cat}>
            <small className="muted">{cat}</small>
            <div className="grade-escolhas">
              {BIBLIOTECA.filter((b) => b.categoria === cat).map((b) => {
                const d = disponivel(b.id);
                return (
                  <label key={b.id} className="opcao-escolha" title={b.descricao}>
                    <input type="checkbox" checked={metricas.includes(b.id)} onChange={() => alternarMetrica(b.id)} /> {b.rotulo}
                    {d === false ? <span className="tag slate sem-ponto">sem dado no período</span> : null}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <label className="campo">
          <span>Título do portal (opcional)</span>
          <input className="input" defaultValue={pref.titulo || ''} placeholder={`Resultados de ${cliente.nome}`} onBlur={(e) => gravar({ titulo: e.target.value.trim().slice(0, 120) })} />
        </label>
        <label className="campo">
          <span>Mensagem para o cliente (opcional)</span>
          <textarea className="input" rows={2} defaultValue={pref.mensagem || ''} placeholder="Ex.: Os resultados são atualizados automaticamente várias vezes ao dia." onBlur={(e) => gravar({ mensagem: e.target.value.trim().slice(0, 500) })} />
        </label>
      </section>
    </div>
  );
};
