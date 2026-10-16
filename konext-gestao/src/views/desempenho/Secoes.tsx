// Seções do relatório de resultados, em visual limpo. As mesmas peças servem ao painel da
// equipe, ao portal do cliente, ao PDF e ao modo apresentação.
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Barras, GraficoLinha, GraficoRetencao, type SerieRetencao } from '@/components/Graficos';
import {
  type CampanhaRel,
  type Derivadas,
  type Formato,
  formatar,
  METRICA,
  METRICAS_PADRAO,
  type ParametrosPerformance,
  type PontoSerie,
  type PorTipo,
  type Relatorio,
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
  gerarAlertas,
  type Nivel,
} from '@/lib/performance';

type Props = { rel: Relatorio; params: ParametrosPerformance; clienteId?: string; metricas?: string[] };

// Ponto colorido discreto com a avaliação (o texto aparece ao passar o mouse).
export const Selo = ({ c }: { c: Classificacao }) =>
  c.nivel === 'insuficiente' ? null : (
    <span className={`ponto-aval ${COR_NIVEL[c.nivel]}`} title={`${c.rotulo}: ${c.explicacao}`} aria-label={`${c.rotulo}: ${c.explicacao}`}>
      {c.rotulo}
    </span>
  );

const Delta = ({ atual, anterior, melhor }: { atual: number | null; anterior: number | null | undefined; melhor: 'maior' | 'menor' | null }) => {
  const v = variacao(atual, anterior);
  if (v === null || Math.abs(v) < 0.5) return null;
  const bom = melhor === null ? null : melhor === 'maior' ? v > 0 : v < 0;
  return (
    <span className={`delta ${bom === null ? '' : bom ? 'bom' : 'ruim'}`} title="Comparado com o período anterior de mesma duração">
      {v > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {`${Math.abs(v).toFixed(1).replace('.', ',')}%`}
    </span>
  );
};

const Kpi = ({ rotulo, valor, formato, ajuda, anterior, melhor = null, aval, detalhe }: { rotulo: string; valor: number | null; formato: Formato; ajuda?: string; anterior?: number | null; melhor?: 'maior' | 'menor' | null; aval?: Classificacao | null; detalhe?: ReactNode }) => (
  <div className="kpi-rel">
    <span className="kpi-rotulo">
      {rotulo}
      {ajuda ? (
        <span className="ajuda" title={ajuda} aria-label={ajuda}>
          <Info size={12} />
        </span>
      ) : null}
    </span>
    <b className={valor === null ? 'vazio' : ''}>{valor === null ? 'Indisponível' : formatar(valor, formato)}</b>
    <span className="kpi-rodape">
      {valor !== null ? <Delta atual={valor} anterior={anterior} melhor={melhor} /> : <small>A Meta não informou para este período</small>}
      {aval ? <Selo c={aval} /> : null}
      {detalhe}
    </span>
  </div>
);

// Nome no singular para “R$ x por …”.
const SINGULAR: Record<string, string> = {
  'Conversas iniciadas': 'conversa',
  'Visitas ao perfil': 'visita',
  Engajamentos: 'engajamento',
  Leads: 'lead',
  Compras: 'compra',
  Seguidores: 'seguidor',
  'Cliques no link': 'clique',
  'Visualizações da página': 'visualização',
  'Visualizações de vídeo': 'visualização',
};

const avaliacao = (id: string, m: Derivadas, p: ParametrosPerformance, clienteId?: string): Classificacao | null => {
  if (id === 'ctrLink') return classificarCtr(m, p, { clienteId });
  if (id === 'ctrSaida') return classificarCtr(m, p, { clienteId, objetivo: 'OUTCOME_TRAFFIC' });
  if (id === 'frequencia') return classificarFrequencia(m, p);
  if (id === 'impressoes') return classificarVolume(m.impressoes, p.impressoesMin, 'impressões');
  if (id === 'alcance') return classificarVolume(m.alcance, p.alcanceMin, 'alcance');
  if (id === 'custoPorResultado') return classificarCusto(m, p, { clienteId });
  return null;
};

// Cada seção “de números” contribui com cartões para a visão geral (tudo numa grade só).
const KPIS_DA_SECAO: Partial<Record<Secao, string[]>> = {
  investimento: ['gasto', 'resultados'],
  alcance: ['alcance', 'impressoes'],
  ctr_cpc: ['ctrLink', 'cpcLink'],
  frequencia: ['frequencia'],
  perfil: ['visitasPerfil', 'custoVisita'],
  seguidores: ['seguidores', 'custoSeguidor'],
};
const SECOES_DA_VISAO: Secao[] = ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'perfil', 'seguidores'];

export const VisaoGeral = ({ rel, params, clienteId, metricas, secoes }: Props & { secoes: Secao[] }) => {
  const ids = [...new Set([...(metricas?.length ? metricas : METRICAS_PADRAO), ...secoes.flatMap((s) => KPIS_DA_SECAO[s] || [])])];
  const porTipo: PorTipo[] = rel.resumo.porTipo || [];
  const antTipo = new Map((rel.resumoAnterior?.porTipo || []).map((t) => [t.indicador, t]));
  const cartoes: ReactNode[] = [];
  let tiposFeitos = false;
  for (const id of ids) {
    if (id === 'resultados' || id === 'custoPorResultado') {
      if (tiposFeitos) continue;
      tiposFeitos = true;
      // Um cartão por tipo de resultado, com o custo daquele tipo (não mistura objetivos).
      if (porTipo.length) {
        porTipo.forEach((t) => {
          const ant = antTipo.get(t.indicador);
          const custo = classificarCusto({ ...rel.resumo, resultados: t.resultados, custoPorResultado: t.custo, tipoResultado: t.tipo }, params, { clienteId, tipoResultado: t.tipo });
          cartoes.push(
            <Kpi
              key={`tipo-${t.indicador}`}
              rotulo={t.tipo}
              valor={t.resultados}
              formato="numero"
              anterior={ant?.resultados}
              melhor="maior"
              ajuda={`Resultado das campanhas com objetivo de ${t.tipo.toLowerCase()} (${t.campanhas} campanha${t.campanhas > 1 ? 's' : ''}), como no Gerenciador.`}
              detalhe={
                <span className="custo-tipo">
                  {formatar(t.custo, 'moeda')} por {SINGULAR[t.tipo] || 'resultado'}
                  <Selo c={custo} />
                </span>
              }
            />,
          );
        });
      } else {
        cartoes.push(<Kpi key="resultados-vazio" rotulo="Resultados" valor={null} formato="numero" />);
      }
      continue;
    }
    const def = METRICA[id];
    if (!def) continue;
    // Já mostrados no cartão do tipo de resultado (com o custo daquele tipo).
    if (tiposFeitos || ids.includes('resultados') || ids.includes('custoPorResultado')) {
      if ((id === 'visitasPerfil' || id === 'custoVisita') && porTipo.some((t) => /profile_visit/.test(t.indicador))) continue;
      if ((id === 'seguidores' || id === 'custoSeguidor') && porTipo.some((t) => /follow/.test(t.indicador))) continue;
    }
    cartoes.push(
      <Kpi
        key={id}
        rotulo={def.rotulo}
        valor={def.ler(rel.resumo)}
        formato={def.formato}
        ajuda={def.descricao}
        anterior={rel.resumoAnterior ? def.ler(rel.resumoAnterior) : null}
        melhor={def.melhor}
        aval={avaliacao(id, rel.resumo, params, clienteId)}
      />,
    );
  }
  const mostrarFunil = secoes.includes('investimento') || secoes.includes('ctr_cpc');
  return (
    <section className="bloco-rel" id="secao-visao">
      <h2>Visão geral</h2>
      <div className="grade-kpis">{cartoes}</div>
      {mostrarFunil ? <Funil rel={rel} /> : null}
    </section>
  );
};

// Funil: impressões → cliques no link → resultados (quando há um tipo só).
const Funil = ({ rel }: { rel: Relatorio }) => {
  const r = rel.resumo;
  const tipos = r.porTipo || [];
  const etapas: Array<{ rotulo: string; valor: number | null; custo: number | null }> = [
    { rotulo: 'Impressões', valor: r.impressoes, custo: r.impressoes ? r.gasto / r.impressoes : null },
    { rotulo: 'Cliques no link', valor: r.cliquesLink, custo: r.cpcLink },
    ...(tipos.length === 1 ? [{ rotulo: tipos[0].tipo, valor: tipos[0].resultados, custo: tipos[0].custo }] : []),
  ];
  if (!r.impressoes || r.cliquesLink === null) return null;
  return (
    <div className="funil">
      <span className="funil-topo">Valor investido: {formatar(r.gasto, 'moeda')}</span>
      {etapas.map((e, i) => (
        <div key={e.rotulo} className="funil-passo">
          {i > 0 && etapas[i - 1].valor ? <span className="funil-taxa">{formatar(((e.valor ?? 0) / etapas[i - 1].valor!) * 100, 'pct')} de conversão</span> : null}
          <div className="funil-barra" style={{ width: `${100 - i * 14}%` }}>
            <span>{e.rotulo}</span>
            <b>{formatar(e.valor, 'numero')}</b>
            <small>{formatar(e.custo, 'moeda')} cada</small>
          </div>
        </div>
      ))}
    </div>
  );
};

const Cabeca = ({ titulo, texto }: { titulo: string; texto?: string }) => (
  <div className="cabeca-bloco">
    <h2>{titulo}</h2>
    {texto ? <p>{texto}</p> : null}
  </div>
);

const Vazio = ({ texto }: { texto: string }) => <p className="vazio-rel">{texto}</p>;

const SERIES: Array<{ id: keyof PontoSerie; rotulo: string; formato: Formato }> = [
  { id: 'gasto', rotulo: 'Investimento', formato: 'moeda' },
  { id: 'resultados', rotulo: 'Resultados', formato: 'numero' },
  { id: 'custoPorResultado', rotulo: 'Custo por resultado', formato: 'moeda' },
  { id: 'impressoes', rotulo: 'Impressões', formato: 'numero' },
  { id: 'alcance', rotulo: 'Alcance', formato: 'numero' },
  { id: 'cliquesLink', rotulo: 'Cliques no link', formato: 'numero' },
  { id: 'ctrLink', rotulo: 'CTR', formato: 'pct' },
  { id: 'cpm', rotulo: 'CPM', formato: 'moeda' },
  { id: 'visitasPerfil', rotulo: 'Visitas ao perfil', formato: 'numero' },
  { id: 'seguidores', rotulo: 'Seguidores', formato: 'numero' },
];

// Períodos longos viram semanas ou meses (somando contagens e recalculando as taxas).
const agrupar = (serie: PontoSerie[]): { pontos: PontoSerie[]; escala: 'dia' | 'semana' | 'mês' } => {
  const escala = serie.length > 180 ? 'mês' : serie.length > 75 ? 'semana' : 'dia';
  if (escala === 'dia') return { pontos: serie, escala };
  const chave = (d: string) => {
    if (escala === 'mês') return `${d.slice(0, 7)}-01`;
    const dt = new Date(`${d}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    return dt.toISOString().slice(0, 10);
  };
  const grupos = new Map<string, PontoSerie[]>();
  for (const p of serie) grupos.set(chave(p.data), [...(grupos.get(chave(p.data)) || []), p]);
  const soma = (l: PontoSerie[], k: keyof PontoSerie) => (l.some((p) => p[k] !== null) ? l.reduce((t, p) => t + ((p[k] as number | null) ?? 0), 0) : null);
  const pontos = [...grupos.entries()].map(([data, l]) => {
    const gasto = soma(l, 'gasto') ?? 0;
    const impressoes = soma(l, 'impressoes') ?? 0;
    const cliquesLink = soma(l, 'cliquesLink');
    const resultados = soma(l, 'resultados');
    return {
      data,
      gasto,
      impressoes,
      alcance: null,
      cliquesLink,
      ctrLink: cliquesLink !== null && impressoes ? (cliquesLink / impressoes) * 100 : null,
      cpm: impressoes ? (gasto / impressoes) * 1000 : null,
      resultados,
      custoPorResultado: resultados ? gasto / resultados : null,
      visitasPerfil: soma(l, 'visitasPerfil'),
      seguidores: soma(l, 'seguidores'),
      reproducoes: soma(l, 'reproducoes'),
    };
  });
  return { pontos, escala };
};

const SecaoEvolucao = ({ rel }: Props) => {
  const { pontos, escala } = useMemo(() => agrupar(rel.serie || []), [rel.serie]);
  const disponiveis = SERIES.filter((s) => (s.id !== 'alcance' || escala === 'dia') && pontos.some((p) => p[s.id] !== null && p[s.id] !== 0));
  const [escolhida, setEscolhida] = useState<keyof PontoSerie>('gasto');
  const atual = disponiveis.find((s) => s.id === escolhida) || disponiveis[0];
  return (
    <section className="bloco-rel" id="secao-evolucao">
      <Cabeca titulo="Desempenho no período" texto={escala === 'dia' ? undefined : `Valores somados por ${escala}.`} />
      {!pontos.length || !atual ? (
        <Vazio texto="Ainda não há histórico para este período." />
      ) : (
        <>
          <GraficoLinha pontos={pontos.map((p) => ({ x: p.data, y: (p[atual.id] as number | null) ?? null }))} formato={atual.formato} rotulo={atual.rotulo} />
          <div className="legenda-metricas" role="tablist">
            {disponiveis.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={atual.id === s.id} className={atual.id === s.id ? 'ativo' : ''} onClick={() => setEscolhida(s.id)}>
                {s.rotulo}
              </button>
            ))}
          </div>
          <p className="nota-rel">Clique nas métricas para trocar a visualização.</p>
        </>
      )}
    </section>
  );
};

type ColunaCamp = { id: string; rotulo: string; ler: (c: CampanhaRel) => number | null; formato: Formato };
const COLUNAS: ColunaCamp[] = [
  { id: 'gasto', rotulo: 'Investido', ler: (c) => c.m.gasto, formato: 'moeda' },
  { id: 'resultados', rotulo: 'Resultados', ler: (c) => c.m.resultados, formato: 'numero' },
  { id: 'custo', rotulo: 'Custo por resultado', ler: (c) => c.m.custoPorResultado, formato: 'moeda' },
  { id: 'ctr', rotulo: 'CTR', ler: (c) => c.m.ctrLink, formato: 'pct' },
  { id: 'cpc', rotulo: 'CPC', ler: (c) => c.m.cpcLink, formato: 'moeda' },
  { id: 'cpm', rotulo: 'CPM', ler: (c) => c.m.cpm, formato: 'moeda' },
  { id: 'impressoes', rotulo: 'Impressões', ler: (c) => c.m.impressoes, formato: 'numero' },
  { id: 'alcance', rotulo: 'Alcance', ler: (c) => c.m.alcance, formato: 'numero' },
  { id: 'freq', rotulo: 'Frequência', ler: (c) => c.m.frequencia, formato: 'decimal' },
];

export const TabelaCampanhas = ({ campanhas, params, clienteId }: { campanhas: CampanhaRel[]; params: ParametrosPerformance; clienteId?: string }) => {
  const [ordem, setOrdem] = useState<{ id: string; desc: boolean }>({ id: 'gasto', desc: true });
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
  if (!campanhas.length) return <Vazio texto="Nenhuma campanha com dados neste período." />;
  return (
    <div className="tabela-rel-wrap">
      <table className="tabela-rel">
        <thead>
          <tr>
            <th>Campanha</th>
            <th>Status</th>
            {COLUNAS.map((c) => (
              <th key={c.id} className="num">
                <button type="button" onClick={() => setOrdem((o) => ({ id: c.id, desc: o.id === c.id ? !o.desc : true }))}>
                  {c.rotulo}
                  {ordem.id === c.id ? (ordem.desc ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((c) => {
            const st = ROTULO_STATUS[c.status];
            const ctx = { clienteId, procedimento: c.procedimento, objetivo: c.objetivo, tipoResultado: c.m.tipoResultado };
            return (
              <tr key={c.id}>
                <td className="nome-camp" data-rotulo="Campanha">
                  {c.nome}
                </td>
                <td data-rotulo="Status">{st ? <span className={`status-rel ${st.cor}`}>{st.texto}</span> : '—'}</td>
                {COLUNAS.map((col) => (
                  <td key={col.id} className="num" data-rotulo={col.rotulo}>
                    {formatar(col.ler(c), col.formato)}
                    {col.id === 'resultados' && c.m.resultados !== null ? <small className="tipo-res">{c.m.tipoResultado.toLowerCase()}</small> : null}
                    {col.id === 'custo' ? <Selo c={classificarCusto(c.m, params, ctx)} /> : null}
                    {col.id === 'ctr' ? <Selo c={classificarCtr(c.m, params, ctx)} /> : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const SecaoComparativo = ({ rel, params, clienteId }: Props) => (
  <section className="bloco-rel" id="secao-comparativo">
    <Cabeca titulo="Campanhas" texto={`${rel.campanhas.length} campanha${rel.campanhas.length === 1 ? '' : 's'} com veiculação no período`} />
    <TabelaCampanhas campanhas={rel.campanhas} params={params} clienteId={clienteId} />
  </section>
);

const SecaoDestaques = ({ rel, params }: Props) => {
  const avaliaveis = rel.campanhas.filter((c) => c.m.gasto > 0 && c.m.impressoes >= params.impressoesParaClassificar);
  const porTipo = new Map<string, CampanhaRel[]>();
  for (const c of avaliaveis) if (c.m.custoPorResultado !== null && c.m.resultados) porTipo.set(c.m.tipoResultado, [...(porTipo.get(c.m.tipoResultado) || []), c]);
  // Melhor de cada tipo de resultado (custo só se compara entre campanhas do mesmo objetivo).
  const melhores = [...porTipo.entries()].map(([tipo, lista]) => ({ tipo, c: [...lista].sort((a, b) => a.m.custoPorResultado! - b.m.custoPorResultado!)[0] }));
  if (!melhores.length) return null;
  return (
    <section className="bloco-rel" id="secao-destaques">
      <Cabeca titulo="Destaques" texto="A campanha com menor custo em cada tipo de resultado." />
      <div className="grade-destaques-rel">
        {melhores.map(({ tipo, c }) => (
          <div key={tipo} className="destaque-rel">
            <span>Melhor em {tipo.toLowerCase()}</span>
            <b>
              {formatar(c.m.custoPorResultado, 'moeda')} <small>por {SINGULAR[tipo] || 'resultado'}</small>
            </b>
            <p>{c.nome}</p>
            <small>
              {formatar(c.m.resultados, 'numero')} {tipo.toLowerCase()} · {formatar(c.m.gasto, 'moeda')} investidos
            </small>
          </div>
        ))}
      </div>
    </section>
  );
};

const ROTULO_SEGMENTO: Record<string, string> = {
  female: 'Mulheres', male: 'Homens', unknown: 'Não informado', instagram: 'Instagram', facebook: 'Facebook', audience_network: 'Audience Network', messenger: 'Messenger',
  feed: 'Feed', instagram_stories: 'Stories', facebook_stories: 'Stories', instagram_reels: 'Reels', facebook_reels: 'Reels', instagram_explore: 'Explorar', marketplace: 'Marketplace',
  video_feeds: 'Feed de vídeos', right_hand_column: 'Coluna direita', search: 'Pesquisa', iphone: 'iPhone', ipad: 'iPad', android_smartphone: 'Android', android_tablet: 'Tablet Android', desktop: 'Computador', other: 'Outros',
};
const nomeSegmento = (s: string) => s.split(' · ').map((p) => ROTULO_SEGMENTO[p] || p).join(' · ');

const SecaoPublico = ({ rel }: Props) => {
  const tipos = Object.entries(rel.segmentos || {});
  const [aba, setAba] = useState(tipos[0]?.[0] || 'idade_genero');
  const seg = rel.segmentos?.[aba];
  const itens = (seg?.itens || []).slice(0, 10);
  const total = itens.reduce((t, i) => t + i.impressoes, 0);
  return (
    <section className="bloco-rel" id="secao-publico">
      <Cabeca titulo="Público" texto="Onde e para quem os anúncios apareceram (dados agregados da Meta)." />
      <div className="abas-rel" role="tablist">
        {tipos.map(([id, s]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
            {s.rotulo}
          </button>
        ))}
      </div>
      {!seg ? null : seg.indisponivel ? (
        <Vazio texto="A Meta não liberou este detalhamento agora." />
      ) : !itens.length ? (
        <Vazio texto="Sem dados para este detalhamento no período." />
      ) : (
        <Barras
          itens={itens.map((i) => ({
            rotulo: nomeSegmento(i.segmento),
            valor: i.impressoes,
            detalhe: `${total ? formatar((i.impressoes / total) * 100, 'pct') : ''}${i.custoPorResultado !== null ? ` · ${formatar(i.custoPorResultado, 'moeda')} por resultado` : ''}`,
          }))}
          formato="numero"
        />
      )}
    </section>
  );
};

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

const SecaoVideos = ({ rel }: Props) => {
  const videos = rel.videos || [];
  const [escolhidos, setEscolhidos] = useState<string[]>(() => videos.slice(0, 3).map((v) => v.id));
  if (!videos.length) return null;
  const series: SerieRetencao[] = videos.filter((v) => escolhidos.includes(v.id)).map((v) => ({ nome: v.nome, pontos: retencaoDe(v) }));
  const alternar = (id: string) => setEscolhidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 3 ? [...e.slice(1), id] : [...e, id]));
  return (
    <section className="bloco-rel" id="secao-videos">
      <Cabeca titulo="Vídeos" texto="Quantos dos que começaram o vídeo chegaram a cada parte dele." />
      <GraficoRetencao series={series} />
      <div className="tabela-rel-wrap">
        <table className="tabela-rel">
          <thead>
            <tr>
              <th>Criativo</th>
              <th className="num">Reproduções</th>
              <th className="num" title="Reproduções de 3 s ÷ reproduções">Ficaram 3 s</th>
              <th className="num" title="Reproduções de 30 s ÷ reproduções">Ficaram 30 s</th>
              <th className="num">ThruPlays</th>
              <th className="num">Até o fim</th>
              <th className="num">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id}>
                <td className="nome-camp" data-rotulo="Criativo">
                  <label className="video-rel">
                    <input type="checkbox" checked={escolhidos.includes(v.id)} onChange={() => alternar(v.id)} aria-label="Mostrar no gráfico" />
                    {v.miniatura ? <img src={v.miniatura} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                    <span>
                      {v.nome}
                      <small>{v.campanha}</small>
                    </span>
                  </label>
                </td>
                <td className="num" data-rotulo="Reproduções">{formatar(v.m.video.reproducoes, 'numero')}</td>
                <td className="num" data-rotulo="Ficaram 3 s">{formatar(pctDe(v.m.video.v3s, v.m.video.reproducoes), 'pct')}</td>
                <td className="num" data-rotulo="Ficaram 30 s">{formatar(pctDe(v.m.video.s30, v.m.video.reproducoes), 'pct')}</td>
                <td className="num" data-rotulo="ThruPlays">{formatar(v.m.video.thruplay, 'numero')}</td>
                <td className="num" data-rotulo="Até o fim">{formatar(pctDe(v.m.video.p100, v.m.video.reproducoes), 'pct')}</td>
                <td className="num" data-rotulo="Tempo médio">{formatar(v.m.video.tempoMedio, 'segundos')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota-rel">Percentuais calculados com as contagens da Meta. Ela não informa reproduções de 5, 10 ou 40 segundos, por isso não aparecem.</p>
    </section>
  );
};

const SecaoAlertas = ({ rel, params, clienteId }: Props) => {
  const alertas = gerarAlertas(rel.campanhas, params, clienteId).filter((a) => a.nivel !== 'info' && a.nivel !== 'insuficiente');
  if (!alertas.length) return null;
  const COR: Record<Nivel, string> = { alerta: 'red', atencao: 'amber', otimo: 'green', bom: 'green', info: 'slate', insuficiente: 'slate' };
  return (
    <section className="bloco-rel" id="secao-alertas">
      <Cabeca titulo="Pontos de atenção" />
      <ul className="lista-rel">
        {alertas.map((a, i) => (
          <li key={i}>
            <span className={`marca-nivel ${COR[a.nivel]}`} />
            <span>
              <b>{a.titulo}</b> {a.texto}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// Ordem fixa das partes do relatório. As seções de números viram uma visão geral só.
export const ORDEM_BLOCOS = ['visao', 'evolucao', 'comparativo', 'destaques', 'publico', 'videos', 'alertas'] as const;
export type Bloco = (typeof ORDEM_BLOCOS)[number];
export const ROTULO_BLOCO: Record<Bloco, string> = { visao: 'Visão geral', evolucao: 'Desempenho', comparativo: 'Campanhas', destaques: 'Destaques', publico: 'Público', videos: 'Vídeos', alertas: 'Pontos de atenção' };
export const blocosDe = (secoes: Secao[]): Bloco[] =>
  ORDEM_BLOCOS.filter((b) => (b === 'visao' ? secoes.some((s) => SECOES_DA_VISAO.includes(s)) : secoes.includes(b as Secao)));

export const BlocoRelatorio = ({ bloco, secoes, ...props }: Props & { bloco: Bloco; secoes: Secao[] }) => {
  if (bloco === 'visao') return <VisaoGeral {...props} secoes={secoes} />;
  if (bloco === 'evolucao') return <SecaoEvolucao {...props} />;
  if (bloco === 'comparativo') return <SecaoComparativo {...props} />;
  if (bloco === 'destaques') return <SecaoDestaques {...props} />;
  if (bloco === 'publico') return <SecaoPublico {...props} />;
  if (bloco === 'videos') return <SecaoVideos {...props} />;
  return <SecaoAlertas {...props} />;
};

export const rotuloSecao = (id: Secao) => SECOES.find((s) => s.id === id)?.rotulo || id;
