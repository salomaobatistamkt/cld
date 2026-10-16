// Gráficos em SVG puro (sem bibliotecas): linha do tempo com cursor e dica, barras e retenção.
// Regras: um eixo por gráfico, marcas finas, rótulos na cor do texto, tabela/valores visíveis.
import { useMemo, useRef, useState } from 'react';

import { dataCurta, type Formato, formatar } from '@/lib/metricas';

// Paleta categórica validada (claro e escuro) — no máximo 3 séries juntas. As cores vêm do tema
// (--serie-1…3 em styles.css), então o mesmo gráfico serve ao painel escuro e ao portal claro.
export const CORES_SERIE = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)'];

const escalaBonita = (max: number) => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

type Ponto = { x: string; y: number | null };

// Linha do tempo: uma métrica por vez (um eixo só). Passe o mouse/dedo para ver o valor do dia.
export const GraficoLinha = ({ pontos, formato, rotulo, altura = 220, cor = CORES_SERIE[0] }: { pontos: Ponto[]; formato: Formato; rotulo: string; altura?: number; cor?: string }) => {
  const [foco, setFoco] = useState<number | null>(null);
  const caixa = useRef<SVGSVGElement>(null);
  const L = 640;
  const M = { e: 56, d: 12, t: 12, b: 26 };
  const validos = pontos.filter((p) => p.y !== null) as Array<{ x: string; y: number }>;
  const max = escalaBonita(Math.max(0, ...validos.map((p) => p.y)));
  const passo = pontos.length > 1 ? (L - M.e - M.d) / (pontos.length - 1) : 0;
  const px = (i: number) => M.e + (pontos.length > 1 ? i * passo : (L - M.e - M.d) / 2);
  const py = (v: number) => M.t + (altura - M.t - M.b) * (1 - v / max);
  const caminho = useMemo(() => {
    let d = '';
    let aberto = false;
    pontos.forEach((p, i) => {
      if (p.y === null) {
        aberto = false;
        return;
      }
      d += `${aberto ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.y).toFixed(1)} `;
      aberto = true;
    });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos, max, altura]);
  if (!validos.length) return <div className="grafico-vazio">Sem dados de {rotulo.toLowerCase()} no período.</div>;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const cadaRotulo = Math.max(1, Math.ceil(pontos.length / 7));
  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r || !pontos.length) return;
    const x = ((clientX - r.left) / r.width) * L;
    const i = pontos.length > 1 ? Math.round((x - M.e) / passo) : 0;
    setFoco(Math.max(0, Math.min(pontos.length - 1, i)));
  };
  const p = foco !== null ? pontos[foco] : null;
  return (
    <div className="grafico">
      <svg
        ref={caixa}
        viewBox={`0 0 ${L} ${altura}`}
        role="img"
        aria-label={`${rotulo} por dia`}
        onMouseMove={(e) => mover(e.clientX)}
        onMouseLeave={() => setFoco(null)}
        onTouchStart={(e) => mover(e.touches[0].clientX)}
        onTouchMove={(e) => mover(e.touches[0].clientX)}
      >
        {marcas.map((v) => (
          <g key={v}>
            <line x1={M.e} x2={L - M.d} y1={py(v)} y2={py(v)} className="grade" />
            <text x={M.e - 6} y={py(v) + 4} textAnchor="end" className="eixo">
              {formatar(v, formato === 'pct' || formato === 'decimal' ? formato : formato === 'moeda' ? 'moeda' : 'numero').replace(',00', '')}
            </text>
          </g>
        ))}
        {pontos.map((pt, i) =>
          i % cadaRotulo === 0 || i === pontos.length - 1 ? (
            <text key={pt.x} x={px(i)} y={altura - 6} textAnchor="middle" className="eixo">
              {dataCurta(pt.x)}
            </text>
          ) : null,
        )}
        <path d={caminho} fill="none" style={{ stroke: cor }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.length <= 31
          ? pontos.map((pt, i) => (pt.y !== null ? <circle key={pt.x} cx={px(i)} cy={py(pt.y)} r={foco === i ? 5 : 2.5} style={{ fill: cor, stroke: 'var(--serie-fundo)' }} strokeWidth={2} /> : null))
          : null}
        {p ? <line x1={px(foco!)} x2={px(foco!)} y1={M.t} y2={altura - M.b} className="cursor" /> : null}
      </svg>
      {p ? (
        <div className="dica-grafico" style={{ left: `${(px(foco!) / L) * 100}%` }}>
          <b>{dataCurta(p.x)}</b>
          <span>
            {rotulo}: {formatar(p.y, formato)}
          </span>
        </div>
      ) : null}
    </div>
  );
};

// Barras horizontais: comparação de valores (campanhas, segmentos). Valor sempre escrito ao lado.
export const Barras = ({
  itens,
  formato,
  cor = CORES_SERIE[0],
  max: maxFixo,
}: {
  itens: Array<{ rotulo: string; valor: number | null; detalhe?: string; tom?: string }>;
  formato: Formato;
  cor?: string;
  max?: number;
}) => {
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

// Curva de retenção: % das reproduções que chegaram a cada ponto (até 3 criativos por vez).
export type SerieRetencao = { nome: string; pontos: Array<{ rotulo: string; valor: number | null }> };
export const GraficoRetencao = ({ series, altura = 220 }: { series: SerieRetencao[]; altura?: number }) => {
  const [foco, setFoco] = useState<number | null>(null);
  const L = 640;
  const M = { e: 44, d: 14, t: 12, b: 26 };
  const etapas = series[0]?.pontos.map((p) => p.rotulo) ?? [];
  if (!etapas.length) return <div className="grafico-vazio">Sem dados de retenção.</div>;
  const passo = (L - M.e - M.d) / Math.max(1, etapas.length - 1);
  const px = (i: number) => M.e + i * passo;
  const py = (v: number) => M.t + (altura - M.t - M.b) * (1 - v / 100);
  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${L} ${altura}`} role="img" aria-label="Retenção dos vídeos" onMouseLeave={() => setFoco(null)}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.e} x2={L - M.d} y1={py(v)} y2={py(v)} className="grade" />
            <text x={M.e - 6} y={py(v) + 4} textAnchor="end" className="eixo">
              {v}%
            </text>
          </g>
        ))}
        {etapas.map((e, i) => (
          <g key={e}>
            <text x={px(i)} y={altura - 6} textAnchor="middle" className="eixo">
              {e}
            </text>
            <rect x={px(i) - passo / 2} y={M.t} width={passo} height={altura - M.t - M.b} fill="transparent" onMouseEnter={() => setFoco(i)} onTouchStart={() => setFoco(i)} />
          </g>
        ))}
        {foco !== null ? <line x1={px(foco)} x2={px(foco)} y1={M.t} y2={altura - M.b} className="cursor" /> : null}
        {series.slice(0, 3).map((s, k) => {
          let d = '';
          let aberto = false;
          s.pontos.forEach((p, i) => {
            if (p.valor === null) {
              aberto = false;
              return;
            }
            d += `${aberto ? 'L' : 'M'}${px(i)},${py(p.valor)} `;
            aberto = true;
          });
          return (
            <g key={s.nome} pointerEvents="none">
              <path d={d} fill="none" style={{ stroke: CORES_SERIE[k] }} strokeWidth={2} strokeLinejoin="round" />
              {s.pontos.map((p, i) => (p.valor !== null ? <circle key={i} cx={px(i)} cy={py(p.valor)} r={foco === i ? 5 : 3} style={{ fill: CORES_SERIE[k], stroke: 'var(--serie-fundo)' }} strokeWidth={2} /> : null))}
            </g>
          );
        })}
      </svg>
      {foco !== null ? (
        <div className="dica-grafico" style={{ left: `${(px(foco) / L) * 100}%` }}>
          <b>{etapas[foco]}</b>
          {series.slice(0, 3).map((s, k) => (
            <span key={s.nome}>
              <i style={{ background: CORES_SERIE[k] }} /> {s.nome}: {formatar(s.pontos[foco].valor, 'pct')}
            </span>
          ))}
        </div>
      ) : null}
      {series.length > 1 ? (
        <div className="legenda-grafico">
          {series.slice(0, 3).map((s, k) => (
            <span key={s.nome}>
              <i style={{ background: CORES_SERIE[k] }} /> {s.nome}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};
