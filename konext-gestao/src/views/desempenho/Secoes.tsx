// Seções do relatório de resultados. As mesmas peças servem ao painel da equipe,
// ao portal do cliente e ao modo apresentação.
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, Minus, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Barras, GraficoLinha, GraficoRetencao, type SerieRetencao } from '@/components/Graficos';
import {
  type CampanhaRel,
  type DefMetrica,
  type Derivadas,
  type Formato,
  formatar,
  METRICA,
  METRICAS_PADRAO,
  type ParametrosPerformance,
  type PontoSerie,
  type Relatorio,
  ROTULO_OBJETIVO,
  ROTULO_STATUS,
  SECOES,
  type Secao,
  variacao,
  type VideoRel,
} from '@/lib/metricas';
import {
  type Classificacao,
  classificarCtr,
  classificarCusto,
  classificarFrequencia,
  classificarVolume,
  COR_NIVEL,
  ctrDe,
  gerarAlertas,
  type Nivel,
} from '@/lib/performance';

export const Selo = ({ c }: { c: Classificacao }) => (
  <span className={`tag ${COR_NIVEL[c.nivel]} selo-perf`} title={c.explicacao}>
    {c.rotulo}
  </span>
);

const Variacao = ({ def, atual, anterior }: { def: DefMetrica; atual: number | null; anterior: number | null | undefined }) => {
  const v = variacao(atual, anterior);
  if (v === null) return <span className="var-metrica neutra">sem comparação</span>;
  const bom = def.melhor === null ? null : def.melhor === 'maior' ? v > 0 : v < 0;
  const Icone = Math.abs(v) < 0.5 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`var-metrica ${Math.abs(v) < 0.5 || bom === null ? 'neutra' : bom ? 'boa' : 'ruim'}`} title={`Antes: ${formatar(anterior ?? null, def.formato)}`}>
      <Icone size={13} />
      {`${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`} vs. período anterior
    </span>
  );
};

export const CartaoMetrica = ({ id, m, anterior, classificacao }: { id: string; m: Derivadas; anterior?: Derivadas | null; classificacao?: Classificacao | null }) => {
  const def = METRICA[id];
  if (!def) return null;
  const valor = def.ler(m);
  const tipos = Object.entries(m.resultadosPorTipo || {});
  // Campanhas com objetivos diferentes: os resultados não se somam (conversa ≠ visita ao perfil).
  if (valor === null && tipos.length > 1 && id === 'custoPorResultado') {
    return (
      <div className="cartao-metrica">
        <div className="topo-metrica">
          <span title={def.descricao}>{def.rotulo}</span>
        </div>
        <b className="indisponivel">Por campanha</b>
        <small className="muted">As campanhas têm tipos de resultado diferentes. O custo de cada uma aparece no comparativo e nos destaques.</small>
      </div>
    );
  }
  if (valor === null && tipos.length > 1 && id === 'resultados') {
    return (
      <div className="cartao-metrica">
        <div className="topo-metrica">
          <span title={def.descricao}>{def.rotulo}</span>
        </div>
        <div className="resultados-por-tipo">
          {tipos.map(([tipo, v]) => (
            <div key={tipo}>
              <b>{formatar(v, 'numero')}</b>
              <span>{tipo}</span>
            </div>
          ))}
        </div>
        <small className="muted">Tipos diferentes não são somados.</small>
      </div>
    );
  }
  return (
    <div className="cartao-metrica">
      <div className="topo-metrica">
        <span title={def.descricao}>{def.rotulo}</span>
        {classificacao ? <Selo c={classificacao} /> : null}
      </div>
      <b className={valor === null ? 'indisponivel' : ''}>{valor === null ? 'Indisponível' : formatar(valor, def.formato)}</b>
      {valor !== null && anterior ? <Variacao def={def} atual={valor} anterior={def.ler(anterior)} /> : null}
      {valor === null ? <small className="muted">A Meta não informou esta métrica para o período.</small> : def.origem === 'calculada' ? <small className="muted">calculada a partir dos dados da Meta</small> : null}
    </div>
  );
};

const Cabeca = ({ titulo, texto, icone }: { titulo: string; texto?: string; icone?: ReactNode }) => (
  <div className="cabeca-rel">
    <h3>
      {icone}
      {titulo}
    </h3>
    {texto ? <p>{texto}</p> : null}
  </div>
);

const Explicacao = ({ c }: { c: Classificacao }) => {
  const Icone = c.nivel === 'alerta' ? ShieldAlert : c.nivel === 'atencao' ? AlertTriangle : c.nivel === 'otimo' || c.nivel === 'bom' ? CheckCircle2 : Info;
  return (
    <div className={`explicacao nivel-${c.nivel}`}>
      <Icone size={16} />
      <span>{c.explicacao}</span>
    </div>
  );
};

type Props = { rel: Relatorio; params: ParametrosPerformance; clienteId?: string; metricas?: string[] };

const classificacaoDe = (id: string, m: Derivadas, p: ParametrosPerformance, clienteId?: string): Classificacao | null => {
  if (id === 'custoPorResultado') return classificarCusto(m, p, { clienteId });
  if (id === 'ctrLink' || id === 'ctrSaida') return classificarCtr(m, p, { clienteId, objetivo: id === 'ctrSaida' ? 'OUTCOME_TRAFFIC' : '' });
  if (id === 'frequencia') return classificarFrequencia(m, p);
  if (id === 'impressoes') return classificarVolume(m.impressoes, p.impressoesMin, 'impressões');
  if (id === 'alcance') return classificarVolume(m.alcance, p.alcanceMin, 'alcance');
  return null;
};

const GradeMetricas = ({ ids, rel, params, clienteId }: Props & { ids: string[] }) => (
  <div className="grade-metricas">
    {ids.map((id) => (
      <CartaoMetrica key={id} id={id} m={rel.resumo} anterior={rel.resumoAnterior} classificacao={classificacaoDe(id, rel.resumo, params, clienteId)} />
    ))}
  </div>
);

// ---------- Cada seção ----------
const SecaoInvestimento = (props: Props) => {
  const { rel } = props;
  const tipos = Object.entries(rel.resumo.resultadosPorTipo || {});
  const ids = props.metricas?.length ? props.metricas : METRICAS_PADRAO;
  return (
    <>
      <Cabeca titulo="Investimento e resultados" texto={`Resultados de cada campanha conforme o objetivo dela. ${rel.resumo.tipoResultado !== 'Resultados (tipos diferentes)' ? '' : 'Como há tipos de resultado diferentes, eles aparecem separados.'}`} />
      <GradeMetricas {...props} ids={ids} />
      {tipos.length > 1 && !ids.includes('resultados') ? (
        <div className="tipos-resultado">
          {tipos.map(([tipo, valor]) => (
            <div key={tipo}>
              <span>{tipo}</span>
              <b>{formatar(valor, 'numero')}</b>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const SecaoAlcance = (props: Props) => (
  <>
    <Cabeca titulo="Alcance e impressões" texto="Alcance são pessoas diferentes; impressões são todas as vezes que os anúncios apareceram." />
    <GradeMetricas {...props} ids={['alcance', 'impressoes', 'cpm']} />
    <Explicacao c={classificarVolume(props.rel.resumo.alcance, props.params.alcanceMin, 'alcance')} />
  </>
);

const SecaoCtr = (props: Props) => {
  const { rel, params, clienteId } = props;
  return (
    <>
      <Cabeca titulo="CTR e CPC" texto="CTR é a porcentagem de pessoas que clicaram depois de ver o anúncio. CPC é quanto custou cada clique." />
      <GradeMetricas {...props} ids={rel.resumo.cliquesSaida !== null && rel.resumo.cliquesSaida > 0 ? ['ctrLink', 'cpcLink', 'ctrSaida', 'cpcSaida'] : ['ctrLink', 'cpcLink', 'cliquesLink']} />
      <Explicacao c={classificarCtr(rel.resumo, params, { clienteId })} />
    </>
  );
};

const SecaoFrequencia = (props: Props) => (
  <>
    <Cabeca titulo="Frequência" texto="Quantas vezes, em média, cada pessoa viu os anúncios no período." />
    <GradeMetricas {...props} ids={['frequencia', 'alcance', 'impressoes']} />
    <Explicacao c={classificarFrequencia(props.rel.resumo, props.params)} />
  </>
);

const Indisponivel = ({ texto }: { texto: string }) => (
  <div className="aviso-indisponivel">
    <Info size={16} />
    <span>{texto}</span>
  </div>
);

const SecaoPerfil = (props: Props) => {
  const { rel } = props;
  const comVisitas = rel.campanhas.filter((c) => c.m.visitasPerfil !== null && c.m.visitasPerfil > 0);
  return (
    <>
      <Cabeca titulo="Visitas ao perfil" texto="Visitas ao perfil do Instagram que a Meta atribui aos anúncios." />
      {rel.resumo.visitasPerfil === null ? (
        <Indisponivel texto="A Meta não informou visitas ao perfil para as campanhas deste período. Essa métrica aparece em campanhas com destino “Perfil do Instagram”." />
      ) : (
        <>
          <GradeMetricas {...props} ids={['visitasPerfil', 'custoVisita', 'gasto']} />
          {comVisitas.length > 1 ? (
            <Barras itens={comVisitas.map((c) => ({ rotulo: c.nome, valor: c.m.visitasPerfil, detalhe: `${formatar(c.m.custoVisita, 'moeda')} por visita` }))} formato="numero" />
          ) : null}
          <small className="muted">Fonte: ação “{rel.resumo.fonteVisitas}” informada pela Meta.</small>
        </>
      )}
    </>
  );
};

const SecaoSeguidores = (props: Props) => {
  const { rel } = props;
  const perfil = rel.seguidoresPerfil;
  return (
    <>
      <Cabeca titulo="Seguidores" texto="Separamos o que a Meta atribui aos anúncios do crescimento total do perfil (que inclui o orgânico)." />
      <div className="duas-colunas">
        <div className="bloco-seguidores">
          <h4>Atribuídos aos anúncios</h4>
          {rel.resumo.seguidores === null ? (
            <Indisponivel texto="A Meta não informou seguidores atribuídos aos anúncios neste período. A API de anúncios nem sempre fornece essa métrica; não estimamos esse número." />
          ) : (
            <>
              <GradeMetricas {...props} ids={['seguidores', 'custoSeguidor']} />
              <small className="muted">Fonte: ação “{rel.resumo.fonteSeguidores}” informada pela Meta.</small>
            </>
          )}
        </div>
        <div className="bloco-seguidores">
          <h4>Crescimento total do perfil (orgânico + pago)</h4>
          {!perfil || !perfil.disponivel ? (
            <Indisponivel texto={perfil && !perfil.disponivel ? perfil.motivo : 'Sem dados do perfil.'} />
          ) : (
            <div className="grade-metricas">
              <div className="cartao-metrica">
                <div className="topo-metrica">
                  <span>Seguidores hoje</span>
                </div>
                <b>{formatar(perfil.totalAtual, 'numero')}</b>
              </div>
              <div className="cartao-metrica">
                <div className="topo-metrica">
                  <span>Novos seguidores no período</span>
                </div>
                <b className={perfil.novosNoPeriodo === null ? 'indisponivel' : ''}>{perfil.novosNoPeriodo === null ? 'Indisponível' : formatar(perfil.novosNoPeriodo, 'numero')}</b>
                {perfil.novosNoPeriodo === null ? <small className="muted">Requer a permissão instagram_manage_insights no token.</small> : null}
              </div>
            </div>
          )}
          <small className="muted">Este número não é atribuído a nenhuma campanha: inclui quem seguiu sem ver anúncios.</small>
        </div>
      </div>
    </>
  );
};

const SERIES: Array<{ id: keyof PontoSerie; rotulo: string; formato: Formato }> = [
  { id: 'gasto', rotulo: 'Investimento', formato: 'moeda' },
  { id: 'resultados', rotulo: 'Resultados', formato: 'numero' },
  { id: 'custoPorResultado', rotulo: 'Custo por resultado', formato: 'moeda' },
  { id: 'alcance', rotulo: 'Alcance do dia', formato: 'numero' },
  { id: 'impressoes', rotulo: 'Impressões', formato: 'numero' },
  { id: 'ctrLink', rotulo: 'CTR do link', formato: 'pct' },
  { id: 'cpm', rotulo: 'CPM', formato: 'moeda' },
  { id: 'visitasPerfil', rotulo: 'Visitas ao perfil', formato: 'numero' },
];

const SecaoEvolucao = ({ rel }: Props) => {
  const serie = rel.serie || [];
  const disponiveis = SERIES.filter((s) => serie.some((p) => p[s.id] !== null && p[s.id] !== undefined && p[s.id] !== 0));
  const [escolhida, setEscolhida] = useState<keyof PontoSerie>('gasto');
  const atual = disponiveis.find((s) => s.id === escolhida) || disponiveis[0];
  return (
    <>
      <Cabeca titulo="Evolução no período" texto="Valores de cada dia. Escolha a métrica para ver a tendência." icone={<TrendingUp size={18} />} />
      {!serie.length || !atual ? (
        <Indisponivel texto="Ainda não há histórico diário para este período. Ele é montado a cada sincronização com a Meta." />
      ) : (
        <>
          <div className="chips-metricas" role="tablist">
            {disponiveis.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={atual.id === s.id} className={atual.id === s.id ? 'ativo' : ''} onClick={() => setEscolhida(s.id)}>
                {s.rotulo}
              </button>
            ))}
          </div>
          <GraficoLinha pontos={serie.map((p) => ({ x: p.data, y: (p[atual.id] as number | null) ?? null }))} formato={atual.formato} rotulo={atual.rotulo} />
          {atual.id === 'alcance' ? <small className="muted">Alcance de cada dia. Pessoas que viram em dias diferentes aparecem em cada dia; o alcance do período (no topo) conta cada pessoa uma vez.</small> : null}
        </>
      )}
    </>
  );
};

type ColunaCamp = { id: string; rotulo: string; ler: (c: CampanhaRel) => number | null; formato: Formato };
const COLUNAS: ColunaCamp[] = [
  { id: 'gasto', rotulo: 'Investido', ler: (c) => c.m.gasto, formato: 'moeda' },
  { id: 'resultados', rotulo: 'Resultados', ler: (c) => c.m.resultados, formato: 'numero' },
  { id: 'custo', rotulo: 'Custo/result.', ler: (c) => c.m.custoPorResultado, formato: 'moeda' },
  { id: 'alcance', rotulo: 'Alcance', ler: (c) => c.m.alcance, formato: 'numero' },
  { id: 'impressoes', rotulo: 'Impressões', ler: (c) => c.m.impressoes, formato: 'numero' },
  { id: 'ctr', rotulo: 'CTR link', ler: (c) => c.m.ctrLink, formato: 'pct' },
  { id: 'cpc', rotulo: 'CPC link', ler: (c) => c.m.cpcLink, formato: 'moeda' },
  { id: 'freq', rotulo: 'Freq.', ler: (c) => c.m.frequencia, formato: 'decimal' },
  { id: 'visitas', rotulo: 'Visitas perfil', ler: (c) => c.m.visitasPerfil, formato: 'numero' },
];

export const TabelaCampanhas = ({ campanhas, params, clienteId, compacta = false }: { campanhas: CampanhaRel[]; params: ParametrosPerformance; clienteId?: string; compacta?: boolean }) => {
  const [ordem, setOrdem] = useState<{ id: string; desc: boolean }>({ id: 'gasto', desc: true });
  const colunas = COLUNAS.filter((c) => (c.id !== 'visitas' || campanhas.some((x) => x.m.visitasPerfil !== null)) && (!compacta || ['gasto', 'resultados', 'custo', 'ctr'].includes(c.id)));
  const ordenadas = useMemo(() => {
    const col = COLUNAS.find((c) => c.id === ordem.id) || COLUNAS[0];
    return [...campanhas].sort((a, b) => {
      const va = col.ler(a);
      const vb = col.ler(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return ordem.desc ? vb - va : va - vb;
    });
  }, [campanhas, ordem]);
  if (!campanhas.length) return <Indisponivel texto="Nenhuma campanha com dados neste período." />;
  return (
    <div className="tabela-wrap">
      <table className="tabela tabela-desempenho tabela-campanhas">
        <thead>
          <tr>
            <th>Campanha</th>
            {colunas.map((c) => (
              <th key={c.id} style={{ textAlign: 'right' }}>
                <button type="button" className="ordenar" onClick={() => setOrdem((o) => ({ id: c.id, desc: o.id === c.id ? !o.desc : true }))}>
                  {c.rotulo}
                  {ordem.id === c.id ? (ordem.desc ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
            <th>Avaliação</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((c) => {
            const ctx = { clienteId, procedimento: c.procedimento, objetivo: c.objetivo, tipoResultado: c.m.tipoResultado };
            const st = ROTULO_STATUS[c.status];
            return (
              <tr key={c.id}>
                <td>
                  <b>{c.nome}</b>
                  <div className="linha-tags">
                    {st ? <span className={`tag ${st.cor}`}>{st.texto}</span> : null}
                    <span className="muted">{c.m.tipoResultado}</span>
                    {c.objetivo ? <span className="muted">· {ROTULO_OBJETIVO[c.objetivo] || c.objetivo}</span> : null}
                  </div>
                </td>
                {colunas.map((col) => (
                  <td key={col.id} className="num" data-rotulo={col.rotulo} style={{ textAlign: 'right' }}>
                    {formatar(col.ler(c), col.formato)}
                  </td>
                ))}
                <td data-rotulo="Avaliação">
                  <div className="linha-tags">
                    <Selo c={classificarCusto(c.m, params, ctx)} />
                    <Selo c={classificarCtr(c.m, params, ctx)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const SecaoComparativo = ({ rel, params, clienteId }: Props) => {
  const [metrica, setMetrica] = useState('gasto');
  const col = COLUNAS.find((c) => c.id === metrica) || COLUNAS[0];
  const opcoes = COLUNAS.filter((c) => rel.campanhas.some((x) => c.ler(x) !== null));
  return (
    <>
      <Cabeca titulo="Comparativo entre campanhas" texto="Clique no título de uma coluna para ordenar. A avaliação mostra custo e CTR de cada campanha." />
      {rel.campanhas.length > 1 ? (
        <>
          <div className="chips-metricas">
            {opcoes.map((c) => (
              <button key={c.id} type="button" className={metrica === c.id ? 'ativo' : ''} onClick={() => setMetrica(c.id)}>
                {c.rotulo}
              </button>
            ))}
          </div>
          <Barras itens={[...rel.campanhas].sort((a, b) => (col.ler(b) ?? -1) - (col.ler(a) ?? -1)).map((c) => ({ rotulo: c.nome, valor: col.ler(c) }))} formato={col.formato} />
        </>
      ) : null}
      <TabelaCampanhas campanhas={rel.campanhas} params={params} clienteId={clienteId} />
    </>
  );
};

const SecaoDestaques = ({ rel, params, clienteId }: Props) => {
  const avaliaveis = rel.campanhas.filter((c) => c.m.gasto > 0 && c.m.impressoes >= params.impressoesParaClassificar);
  const porCusto = avaliaveis.filter((c) => c.m.custoPorResultado !== null).sort((a, b) => a.m.custoPorResultado! - b.m.custoPorResultado!);
  const porResultados = avaliaveis.filter((c) => c.m.resultados !== null).sort((a, b) => b.m.resultados! - a.m.resultados!);
  const porCtr = avaliaveis.filter((c) => ctrDe(c.m, c.objetivo).valor !== null).sort((a, b) => ctrDe(b.m, b.objetivo).valor! - ctrDe(a.m, a.objetivo).valor!);
  const cartoes: Array<{ titulo: string; c?: CampanhaRel; valor: string; tom: 'bom' | 'atencao' }> = [
    { titulo: 'Menor custo por resultado', c: porCusto[0], valor: formatar(porCusto[0]?.m.custoPorResultado ?? null, 'moeda'), tom: 'bom' },
    { titulo: 'Mais resultados', c: porResultados[0], valor: `${formatar(porResultados[0]?.m.resultados ?? null, 'numero')} ${porResultados[0]?.m.tipoResultado.toLowerCase() ?? ''}`, tom: 'bom' },
    { titulo: 'Maior CTR', c: porCtr[0], valor: formatar(porCtr[0] ? ctrDe(porCtr[0].m, porCtr[0].objetivo).valor : null, 'pct'), tom: 'bom' },
    ...(porCusto.length > 1 ? [{ titulo: 'Maior custo por resultado', c: porCusto[porCusto.length - 1], valor: formatar(porCusto[porCusto.length - 1].m.custoPorResultado, 'moeda'), tom: 'atencao' as const }] : []),
  ];
  return (
    <>
      <Cabeca titulo="Campanhas em destaque" texto="Só entram campanhas com volume suficiente para avaliação." icone={<Sparkles size={18} />} />
      {!avaliaveis.length ? (
        <Indisponivel texto={`Nenhuma campanha com pelo menos ${formatar(params.impressoesParaClassificar, 'numero')} impressões no período.`} />
      ) : (
        <div className="grade-destaques">
          {cartoes
            .filter((x) => x.c)
            .map((x) => (
              <div key={x.titulo} className={`cartao-destaque ${x.tom}`}>
                <span>{x.titulo}</span>
                <b>{x.valor}</b>
                <p>{x.c!.nome}</p>
                <div className="linha-tags">
                  <Selo c={classificarCusto(x.c!.m, params, { clienteId, procedimento: x.c!.procedimento, objetivo: x.c!.objetivo })} />
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
};

const ROTULO_SEGMENTO: Record<string, string> = {
  female: 'Mulheres',
  male: 'Homens',
  unknown: 'Não informado',
  instagram: 'Instagram',
  facebook: 'Facebook',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
  feed: 'Feed',
  instagram_stories: 'Stories',
  facebook_stories: 'Stories',
  instagram_reels: 'Reels',
  facebook_reels: 'Reels',
  instagram_explore: 'Explorar',
  marketplace: 'Marketplace',
  video_feeds: 'Feed de vídeos',
  right_hand_column: 'Coluna direita',
  search: 'Pesquisa',
  iphone: 'iPhone',
  ipad: 'iPad',
  android_smartphone: 'Android (celular)',
  android_tablet: 'Android (tablet)',
  desktop: 'Computador',
  other: 'Outros',
};
const nomeSegmento = (s: string) =>
  s
    .split(' · ')
    .map((p) => ROTULO_SEGMENTO[p] || p)
    .join(' · ');

const SecaoPublico = ({ rel }: Props) => {
  const tipos = Object.entries(rel.segmentos || {});
  const [aba, setAba] = useState(tipos[0]?.[0] || 'idade_genero');
  const [medida, setMedida] = useState<'impressoes' | 'gasto' | 'custo'>('impressoes');
  const seg = rel.segmentos?.[aba];
  const itens = (seg?.itens || []).slice(0, 12);
  const temCusto = itens.some((i) => i.custoPorResultado !== null);
  return (
    <>
      <Cabeca titulo="Dados de público" texto="Dados agregados que a Meta informa por segmento. Não identificamos pessoas individualmente." />
      <div className="chips-metricas" role="tablist">
        {tipos.map(([id, s]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
            {s.rotulo}
          </button>
        ))}
      </div>
      {!seg ? null : seg.indisponivel ? (
        <Indisponivel texto={`A Meta não liberou este detalhamento: ${seg.indisponivel}`} />
      ) : !itens.length ? (
        <Indisponivel texto="Sem dados para este detalhamento no período." />
      ) : (
        <>
          <div className="seletor-medida">
            <button type="button" className={medida === 'impressoes' ? 'ativo' : ''} onClick={() => setMedida('impressoes')}>
              Impressões
            </button>
            <button type="button" className={medida === 'gasto' ? 'ativo' : ''} onClick={() => setMedida('gasto')}>
              Investimento
            </button>
            {temCusto ? (
              <button type="button" className={medida === 'custo' ? 'ativo' : ''} onClick={() => setMedida('custo')}>
                Custo por resultado
              </button>
            ) : null}
          </div>
          <Barras
            itens={[...itens]
              .sort((a, b) => (medida === 'custo' ? (a.custoPorResultado ?? 1e12) - (b.custoPorResultado ?? 1e12) : medida === 'gasto' ? b.gasto - a.gasto : b.impressoes - a.impressoes))
              .map((i) => ({
                rotulo: nomeSegmento(i.segmento),
                valor: medida === 'custo' ? i.custoPorResultado : medida === 'gasto' ? i.gasto : i.impressoes,
                detalhe:
                  medida === 'custo'
                    ? `${formatar(i.resultados, 'numero')} ${i.tipoResultado.toLowerCase()}`
                    : Object.keys(i.resultadosPorTipo || {}).length
                      ? Object.entries(i.resultadosPorTipo)
                          .map(([t, v]) => `${formatar(v, 'numero')} ${t.toLowerCase()}`)
                          .join(', ')
                      : undefined,
              }))}
            formato={medida === 'impressoes' ? 'numero' : 'moeda'}
          />
          {medida === 'custo' ? <small className="muted">Segmentos com custo menor aparecem primeiro. Só há custo quando o segmento tem resultados de um único tipo.</small> : null}
        </>
      )}
    </>
  );
};

// Retenção: % das reproduções que chegaram a cada ponto. Tudo calculado a partir das contagens da Meta.
const pctDe = (a: number | null, base: number | null) => (a !== null && base ? (a / base) * 100 : null);
export const retencaoDe = (v: VideoRel) => {
  const x = v.m.video;
  return [
    { rotulo: 'Início', valor: x.reproducoes ? 100 : null },
    { rotulo: '25%', valor: pctDe(x.p25, x.reproducoes) },
    { rotulo: '50%', valor: pctDe(x.p50, x.reproducoes) },
    { rotulo: '75%', valor: pctDe(x.p75, x.reproducoes) },
    { rotulo: '95%', valor: pctDe(x.p95, x.reproducoes) },
    { rotulo: '100%', valor: pctDe(x.p100, x.reproducoes) },
  ];
};

const MARCOS = [
  { s: '3 s', ler: (v: VideoRel) => v.m.video.v3s, fonte: 'Reproduções de 3 segundos' },
  { s: '5 s', ler: () => null, fonte: 'A Meta não fornece reproduções de 5 segundos' },
  { s: '10 s', ler: () => null, fonte: 'A Meta não fornece reproduções de 10 segundos' },
  { s: '30 s', ler: (v: VideoRel) => v.m.video.s30, fonte: 'Reproduções de 30 segundos' },
  { s: '40 s', ler: () => null, fonte: 'A Meta não fornece reproduções de 40 segundos' },
];

const SecaoVideos = ({ rel }: Props) => {
  const videos = rel.videos || [];
  const [escolhidos, setEscolhidos] = useState<string[]>(() => videos.slice(0, 3).map((v) => v.id));
  const series: SerieRetencao[] = videos.filter((v) => escolhidos.includes(v.id)).map((v) => ({ nome: v.nome, pontos: retencaoDe(v) }));
  const alternar = (id: string) => setEscolhidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 3 ? [...e.slice(1), id] : [...e, id]));
  return (
    <>
      <Cabeca titulo="Retenção dos vídeos" texto="Que parte das pessoas que começaram o vídeo chegou a cada ponto. Percentuais calculados a partir das contagens da Meta." />
      {!videos.length ? (
        <Indisponivel texto="Nenhum anúncio em vídeo com reproduções neste período." />
      ) : (
        <>
          <GraficoRetencao series={series} />
          <small className="muted">Compare até 3 criativos por vez. Marque na tabela abaixo.</small>
          <div className="tabela-wrap">
            <table className="tabela tabela-desempenho tabela-campanhas">
              <thead>
                <tr>
                  <th>Criativo</th>
                  <th style={{ textAlign: 'right' }}>Reproduções</th>
                  {MARCOS.map((m) => (
                    <th key={m.s} style={{ textAlign: 'right' }} title={m.fonte}>
                      Ficaram {m.s}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>ThruPlays</th>
                  <th style={{ textAlign: 'right' }}>Assistiram 100%</th>
                  <th style={{ textAlign: 'right' }}>Tempo médio</th>
                  <th style={{ textAlign: 'right' }}>Custo/ThruPlay</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <label className="linha-video">
                        <input type="checkbox" checked={escolhidos.includes(v.id)} onChange={() => alternar(v.id)} />
                        {v.miniatura ? <img src={v.miniatura} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                        <span>
                          <b>{v.nome}</b>
                          <small className="muted">{v.campanha}</small>
                        </span>
                      </label>
                    </td>
                    <td className="num" data-rotulo="Reproduções" style={{ textAlign: 'right' }}>
                      {formatar(v.m.video.reproducoes, 'numero')}
                    </td>
                    {MARCOS.map((m) => {
                      const r = pctDe(m.ler(v), v.m.video.reproducoes);
                      return (
                        <td key={m.s} className="num" data-rotulo={`Ficaram ${m.s}`} style={{ textAlign: 'right' }} title={m.fonte}>
                          {r === null ? <span className="muted">n/d</span> : (
                            <>
                              {formatar(r, 'pct')}
                              <small className="abandono">abandono {formatar(100 - r, 'pct')}</small>
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className="num" data-rotulo="ThruPlays" style={{ textAlign: 'right' }}>
                      {formatar(v.m.video.thruplay, 'numero')}
                    </td>
                    <td className="num" data-rotulo="Assistiram 100%" style={{ textAlign: 'right' }}>
                      {formatar(pctDe(v.m.video.p100, v.m.video.reproducoes), 'pct')}
                    </td>
                    <td className="num" data-rotulo="Tempo médio" style={{ textAlign: 'right' }}>
                      {formatar(v.m.video.tempoMedio, 'segundos')}
                    </td>
                    <td className="num" data-rotulo="Custo/ThruPlay" style={{ textAlign: 'right' }}>
                      {formatar(v.m.video.custoThruplay, 'moeda')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small className="muted">
            “Ficaram 3 s” e “30 s” = reproduções de 3 s ou 30 s ÷ reproduções (calculado). 5 s, 10 s e 40 s aparecem como n/d porque a Meta não fornece essas contagens; não estimamos. 25%…100% são partes da duração do vídeo.
          </small>
        </>
      )}
    </>
  );
};

const ICONE_ALERTA: Record<Nivel, ReactNode> = {
  alerta: <ShieldAlert size={16} />,
  atencao: <AlertTriangle size={16} />,
  otimo: <CheckCircle2 size={16} />,
  bom: <CheckCircle2 size={16} />,
  info: <Info size={16} />,
  insuficiente: <Info size={16} />,
};

const SecaoAlertas = ({ rel, params, clienteId }: Props) => {
  const alertas = gerarAlertas(rel.campanhas, params, clienteId);
  return (
    <>
      <Cabeca titulo="Recomendações e pontos de atenção" texto="Avaliação automática com base nas referências configuradas. Sempre considere o objetivo e a qualidade dos resultados." />
      {!alertas.length ? (
        <Indisponivel texto="Nenhum ponto de atenção neste período." />
      ) : (
        <div className="lista-alertas">
          {alertas.map((a, i) => (
            <div key={i} className={`explicacao nivel-${a.nivel}`}>
              {ICONE_ALERTA[a.nivel]}
              <span>
                <b>{a.titulo}</b>
                {a.texto}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const COMPONENTES: Record<Secao, (p: Props) => ReactNode> = {
  investimento: SecaoInvestimento,
  alcance: SecaoAlcance,
  ctr_cpc: SecaoCtr,
  frequencia: SecaoFrequencia,
  perfil: SecaoPerfil,
  seguidores: SecaoSeguidores,
  evolucao: SecaoEvolucao,
  comparativo: SecaoComparativo,
  destaques: SecaoDestaques,
  publico: SecaoPublico,
  videos: SecaoVideos,
  alertas: SecaoAlertas,
};

export const SecaoRelatorio = ({ secao, ...props }: Props & { secao: Secao }) => {
  const C = COMPONENTES[secao];
  return (
    <section className="secao-relatorio" id={`secao-${secao}`}>
      <C {...props} />
    </section>
  );
};

export const rotuloSecao = (id: Secao) => SECOES.find((s) => s.id === id)?.rotulo || id;
