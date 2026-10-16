// Gráficos em SVG puro (sem bibliotecas): linha do tempo, várias métricas juntas, barras e
// retenção de vídeo. Regras: um eixo por gráfico, marcas finas, dica com o valor real.
import { useMemo, useRef, useState } from 'react';

import { dataCurta, type Formato, formatar } from '@/lib/metricas';

// Paleta categórica validada (claro e escuro), na ordem fixa. As cores vêm do tema
// (--serie-1…8 em styles.css), então o mesmo gráfico serve ao painel escuro e ao relatório claro.
export const CORES_SERIE = Array.from({ length: 8 }, (_, i) => `var(--serie-${i + 1})`);

const escalaBonita = (max: number) => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

const caminhoDe = (pts: Array<[number, number] | null>) => {
  let d = '';
  let aberto = false;
  for (const p of pts) {
    if (!p) {
      aberto = false;
      continue;
    }
    d += `${aberto ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
    aberto = true;
  }
  return d;
};

const usarFoco = (n: number, L: number, e: number, d: number) => {
  const [foco, setFoco] = useState<number | null>(null);
  const caixa = useRef<SVGSVGElement>(null);
  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r || !n) return;
    const x = ((clientX - r.left) / r.width) * L;
    const passo = n > 1 ? (L - e - d) / (n - 1) : 0;
    setFoco(Math.max(0, Math.min(n - 1, n > 1 ? Math.round((x - e) / passo) : 0)));
  };
  return { foco, setFoco, caixa, mover };
};

type Ponto = { x: string; y: number | null };

// Uma métrica, na escala real dela.
export const GraficoLinha = ({ pontos, formato, rotulo, altura = 220, cor = CORES_SERIE[0] }: { pontos: Ponto[]; formato: Formato; rotulo: string; altura?: number; cor?: string }) => {
  const L = 640;
  const M = { e: 58, d: 12, t: 12, b: 26 };
  const { foco, setFoco, caixa, mover } = usarFoco(pontos.length, L, M.e, M.d);
  const validos = pontos.filter((p) => p.y !== null) as Array<{ x: string; y: number }>;
  const max = escalaBonita(Math.max(0, ...validos.map((p) => p.y)));
  const passo = pontos.length > 1 ? (L - M.e - M.d) / (pontos.length - 1) : 0;
  const px = (i: number) => M.e + (pontos.length > 1 ? i * passo : (L - M.e - M.d) / 2);
  const py = (v: number) => M.t + (altura - M.t - M.b) * (1 - v / max);
  if (!validos.length) return <div className="grafico-vazio">Sem dados de {rotulo.toLowerCase()} no período.</div>;
  const cada = Math.max(1, Math.ceil(pontos.length / 7));
  const p = foco !== null ? pontos[foco] : null;
  return (
    <div className="grafico">
      <svg ref={caixa} viewBox={`0 0 ${L} ${altura}`} role="img" aria-label={`${rotulo} por dia`} onMouseMove={(e) => mover(e.clientX)} onMouseLeave={() => setFoco(null)} onTouchStart={(e) => mover(e.touches[0].clientX)} onTouchMove={(e) => mover(e.touches[0].clientX)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={M.e} x2={L - M.d} y1={py(f * max)} y2={py(f * max)} className="grade" />
            <text x={M.e - 6} y={py(f * max) + 4} textAnchor="end" className="eixo">
              {formatar(f * max, formato === 'pct' || formato === 'decimal' ? formato : formato === 'moeda' ? 'moeda' : 'numero').replace(',00', '')}
            </text>
          </g>
        ))}
        {pontos.map((pt, i) => (i % cada === 0 || i === pontos.length - 1 ? <text key={pt.x} x={px(i)} y={altura - 6} textAnchor="middle" className="eixo">{dataCurta(pt.x)}</text> : null))}
        <path d={caminhoDe(pontos.map((pt, i) => (pt.y === null ? null : [px(i), py(pt.y)])))} fill="none" style={{ stroke: cor }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.length <= 31 ? pontos.map((pt, i) => (pt.y !== null ? <circle key={pt.x} cx={px(i)} cy={py(pt.y)} r={foco === i ? 5 : 2.5} style={{ fill: cor, stroke: 'var(--serie-fundo)' }} strokeWidth={2} /> : null)) : null}
        {p ? <line x1={px(foco!)} x2={px(foco!)} y1={M.t} y2={altura - M.b} className="cursor" /> : null}
      </svg>
      {p ? (
        <div className="dica-grafico" style={{ left: `${(px(foco!) / L) * 100}%` }}>
          <b>{dataCurta(p.x)}</b>
          <span>{rotulo}: {formatar(p.y, formato)}</span>
        </div>
      ) : null}
    </div>
  );
};

// Várias métricas ao mesmo tempo. Como cada uma tem uma escala (R$, %, contagem), todas são
// mostradas em relação ao próprio maior valor do período (eixo único de 0 a 100%); a dica mostra
// o valor real de cada uma.
export type SerieMulti = { id: string; rotulo: string; formato: Formato; cor: string; valores: Array<number | null> };
export const GraficoMulti = ({ datas, series, altura = 240 }: { datas: string[]; series: SerieMulti[]; altura?: number }) => {
  const L = 640;
  const M = { e: 40, d: 12, t: 12, b: 26 };
  const { foco, setFoco, caixa, mover } = usarFoco(datas.length, L, M.e, M.d);
  const passo = datas.length > 1 ? (L - M.e - M.d) / (datas.length - 1) : 0;
  const px = (i: number) => M.e + (datas.length > 1 ? i * passo : (L - M.e - M.d) / 2);
  const py = (v: number) => M.t + (altura - M.t - M.b) * (1 - v / 100);
  const maximos = series.map((s) => Math.max(0, ...s.valores.map((v) => v ?? 0)));
  const cada = Math.max(1, Math.ceil(datas.length / 7));
  return (
    <div className="grafico">
      <svg ref={caixa} viewBox={`0 0 ${L} ${altura}`} role="img" aria-label="Métricas por dia, em relação ao maior valor de cada uma" onMouseMove={(e) => mover(e.clientX)} onMouseLeave={() => setFoco(null)} onTouchStart={(e) => mover(e.touches[0].clientX)} onTouchMove={(e) => mover(e.touches[0].clientX)}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.e} x2={L - M.d} y1={py(v)} y2={py(v)} className="grade" />
            <text x={M.e - 6} y={py(v) + 4} textAnchor="end" className="eixo">{v}%</text>
          </g>
        ))}
        {datas.map((d, i) => (i % cada === 0 || i === datas.length - 1 ? <text key={d} x={px(i)} y={altura - 6} textAnchor="middle" className="eixo">{dataCurta(d)}</text> : null))}
        {series.map((s, k) => (
          <path key={s.id} d={caminhoDe(s.valores.map((v, i) => (v === null || !maximos[k] ? null : [px(i), py((v / maximos[k]) * 100)])))} fill="none" style={{ stroke: s.cor }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {foco !== null ? (
          <>
            <line x1={px(foco)} x2={px(foco)} y1={M.t} y2={altura - M.b} className="cursor" />
            {series.map((s, k) => (s.valores[foco] !== null && maximos[k] ? <circle key={s.id} cx={px(foco)} cy={py((s.valores[foco]! / maximos[k]) * 100)} r={4.5} style={{ fill: s.cor, stroke: 'var(--serie-fundo)' }} strokeWidth={2} /> : null))}
          </>
        ) : null}
      </svg>
      {foco !== null ? (
        <div className="dica-grafico" style={{ left: `${Math.min(80, Math.max(20, (px(foco) / L) * 100))}%` }}>
          <b>{dataCurta(datas[foco])}</b>
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.cor }} /> {s.rotulo}: {formatar(s.valores[foco], s.formato)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// Barras horizontais: comparação de valores (segmentos). Valor sempre escrito ao lado.
export const Barras = ({ itens, formato, cor = CORES_SERIE[0], max: maxFixo }: { itens: Array<{ rotulo: string; valor: number | null; detalhe?: string; tom?: string }>; formato: Formato; cor?: string; max?: number }) => {
  const max = maxFixo ?? Math.max(0, ...itens.map((i) => i.valor ?? 0));
  if (!itens.length) return <div className="grafico-vazio">Sem dados.</div>;
  return (
    <div className="barras-h">
      {itens.map((i) => (
        <div key={i.rotulo} className="barra-linha" title={`${i.rotulo}: ${formatar(i.valor, formato)}`}>
          <div className="barra-topo">
            <span className="barra-rotulo">{i.rotulo}</span>
            <span className="barra-valor">
              {formatar(i.valor, formato)}
              {i.detalhe ? <small> · {i.detalhe}</small> : null}
            </span>
          </div>
          <div className="barra-trilho">
            <div className="barra-cheia" style={{ width: `${max > 0 && i.valor ? Math.max(1.5, (i.valor / max) * 100) : 0}%`, background: i.tom || cor }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Retenção do vídeo: eixo X = tempo do vídeo (segundos); eixo Y = % de quem começou e ainda
// estava assistindo. Sem a duração do vídeo, o eixo X vira a parte do vídeo (0–100%).
export type SerieRetencao = { nome: string; pontos: Array<{ t: number; valor: number }> };
const formatarTempo = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}min${s % 60 ? ` ${Math.round(s % 60)}s` : ''}` : `${Math.round(s)}s`);
export const GraficoRetencao = ({ series, emSegundos, altura = 250 }: { series: SerieRetencao[]; emSegundos: boolean; altura?: number }) => {
  const [foco, setFoco] = useState<number | null>(null);
  const caixa = useRef<SVGSVGElement>(null);
  const L = 640;
  const M = { e: 46, d: 16, t: 14, b: 40 };
  // Eixo de tempo com marcas redondas (5 s, 10 s, 15 s, 30 s…).
  const { maxT, passoT } = useMemo(() => {
    if (!emSegundos) return { maxT: 100, passoT: 25 };
    const fim = Math.max(1, ...series.flatMap((s) => s.pontos.map((p) => p.t)));
    const passo = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300].find((x) => fim / x <= 6) || 600;
    return { maxT: Math.ceil(fim / passo) * passo, passoT: passo };
  }, [series, emSegundos]);
  if (!series.length) return <div className="grafico-vazio">Sem dados de retenção.</div>;
  const px = (t: number) => M.e + ((L - M.e - M.d) * t) / maxT;
  const py = (v: number) => M.t + (altura - M.t - M.b) * (1 - v / 100);
  const marcas = Array.from({ length: Math.round(maxT / passoT) + 1 }, (_, i) => i * passoT);
  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    setFoco(Math.max(0, Math.min(maxT, (((clientX - r.left) / r.width) * L - M.e) / ((L - M.e - M.d) / maxT))));
  };
  // Ponto de cada série mais perto do tempo apontado.
  const perto = (s: SerieRetencao) => (foco === null ? null : s.pontos.reduce((a, b) => (Math.abs(b.t - foco) < Math.abs(a.t - foco) ? b : a)));
  return (
    <div className="grafico">
      <svg ref={caixa} viewBox={`0 0 ${L} ${altura}`} role="img" aria-label="Retenção dos vídeos" onMouseMove={(e) => mover(e.clientX)} onMouseLeave={() => setFoco(null)} onTouchStart={(e) => mover(e.touches[0].clientX)} onTouchMove={(e) => mover(e.touches[0].clientX)}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.e} x2={L - M.d} y1={py(v)} y2={py(v)} className="grade" />
            <text x={M.e - 6} y={py(v) + 4} textAnchor="end" className="eixo">{v}%</text>
          </g>
        ))}
        {marcas.map((t) => (
          <text key={t} x={px(t)} y={altura - 22} textAnchor="middle" className="eixo">
            {emSegundos ? formatarTempo(t) : `${Math.round(t)}%`}
          </text>
        ))}
        <text x={(M.e + L - M.d) / 2} y={altura - 4} textAnchor="middle" className="eixo titulo-eixo">
          {emSegundos ? 'Tempo do vídeo' : 'Parte do vídeo assistida'}
        </text>
        {foco !== null ? <line x1={px(foco)} x2={px(foco)} y1={M.t} y2={altura - M.b} className="cursor" /> : null}
        {series.map((s, k) => (
          <g key={s.nome} pointerEvents="none">
            <path d={caminhoDe(s.pontos.map((p) => [px(p.t), py(p.valor)]))} fill="none" style={{ stroke: CORES_SERIE[k] }} strokeWidth={2} strokeLinejoin="round" />
            {s.pontos.map((p, i) => <circle key={i} cx={px(p.t)} cy={py(p.valor)} r={perto(s) === p ? 5 : 3} style={{ fill: CORES_SERIE[k], stroke: 'var(--serie-fundo)' }} strokeWidth={2} />)}
          </g>
        ))}
      </svg>
      {foco !== null ? (
        <div className="dica-grafico" style={{ left: `${Math.min(80, Math.max(20, (px(foco) / L) * 100))}%` }}>
          {series.map((s, k) => {
            const p = perto(s)!;
            return (
              <span key={s.nome}>
                <i style={{ background: CORES_SERIE[k] }} /> {s.nome}: {formatar(p.valor, 'pct')} {emSegundos ? `aos ${formatarTempo(p.t)}` : `em ${Math.round(p.t)}% do vídeo`}
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="legenda-grafico">
        {series.map((s, k) => (
          <span key={s.nome}>
            <i style={{ background: CORES_SERIE[k] }} /> {s.nome}
          </span>
        ))}
      </div>
    </div>
  );
};
