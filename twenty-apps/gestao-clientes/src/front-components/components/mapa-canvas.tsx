import { useMemo, useRef, useState } from 'react';
import { useTheme } from 'twenty-ui/theme';

import { TEXTO_MAXIMO_VISIVEL } from 'src/constants/texto-maximo-visivel';
import { Botao } from 'src/front-components/components/botao';
import { type NoMapa } from 'src/types/no-mapa';
import { type NoPosicionado } from 'src/types/no-posicionado';
import { calcularLayoutMapa } from 'src/utils/calcular-layout-mapa.util';

type MapaCanvasProps = {
  raiz: NoMapa;
  selecionadoId?: string | null;
  onSelecionar?: (id: string | null) => void;
  onAlternarRecolhido?: (id: string) => void;
  onAbrirRegistro?: (registro: { objeto: string; id: string }) => void;
};

const LARGURA_MINIMA = 640;
const ALTURA_MINIMA = 360;
const ZOOM_MINIMO = 0.25;
const ZOOM_MAXIMO = 4;

const truncar = (texto: string) =>
  texto.length > TEXTO_MAXIMO_VISIVEL
    ? `${texto.slice(0, TEXTO_MAXIMO_VISIVEL - 1)}…`
    : texto || ' ';

// Desenha o mapa em SVG. O zoom e o arraste mexem só no viewBox, então o mapa
// sempre cabe no widget sem barra de rolagem.
export const MapaCanvas = ({
  raiz,
  selecionadoId = null,
  onSelecionar,
  onAlternarRecolhido,
  onAbrirRegistro,
}: MapaCanvasProps) => {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const arraste = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });

  const layout = useMemo(() => calcularLayoutMapa(raiz), [raiz]);
  const porId = useMemo(
    () => new Map(layout.nos.map((posicionado) => [posicionado.no.id, posicionado])),
    [layout],
  );

  const larguraBase = Math.max(layout.largura, LARGURA_MINIMA);
  const alturaBase = Math.max(layout.altura, ALTURA_MINIMA);
  const larguraVisivel = larguraBase / zoom;
  const alturaVisivel = alturaBase / zoom;
  const origemX = (layout.largura - larguraVisivel) / 2 - deslocamento.x;
  const origemY = (layout.altura - alturaVisivel) / 2 - deslocamento.y;

  const unidadesPorPixel = () => {
    const caixa = svgRef.current?.getBoundingClientRect?.();
    if (!caixa || !caixa.width || !caixa.height) {
      return larguraVisivel / 900;
    }
    // preserveAspectRatio "meet": a escala é dada pelo eixo mais apertado.
    return Math.max(larguraVisivel / caixa.width, alturaVisivel / caixa.height);
  };

  const ajustarZoom = (fator: number) =>
    setZoom((atual) => Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, atual * fator)));

  const centralizar = () => {
    setZoom(1);
    setDeslocamento({ x: 0, y: 0 });
  };

  const corTexto = (cor: string) =>
    (theme.tag.text as Record<string, string>)[cor] ?? theme.font.color.primary;
  const corFundo = (cor: string) =>
    (theme.tag.background as Record<string, string>)[cor] ??
    theme.background.tertiary;

  const desenharLigacao = (posicionado: NoPosicionado) => {
    if (!posicionado.paiId) {
      return null;
    }
    const pai = porId.get(posicionado.paiId);
    if (!pai) {
      return null;
    }
    const x1 = pai.x + pai.largura;
    const y1 = pai.y + pai.altura / 2;
    const x2 = posicionado.x;
    const y2 = posicionado.y + posicionado.altura / 2;
    const meio = (x1 + x2) / 2;
    return (
      <path
        key={`ligacao-${posicionado.no.id}`}
        d={`M ${x1} ${y1} C ${meio} ${y1}, ${meio} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={corTexto(posicionado.cor)}
        strokeOpacity={0.5}
        strokeWidth={posicionado.nivel === 1 ? 2.5 : 1.75}
      />
    );
  };

  const desenharNo = (posicionado: NoPosicionado) => {
    const { no, x, y, largura, altura, nivel, cor } = posicionado;
    const selecionado = no.id === selecionadoId;
    const raizDoMapa = nivel === 0;
    const fundo = raizDoMapa
      ? theme.background.invertedPrimary
      : nivel === 1
        ? corFundo(cor)
        : theme.background.primary;
    const texto = raizDoMapa
      ? theme.font.color.inverted
      : nivel === 1
        ? corTexto(cor)
        : theme.font.color.primary;
    const temFilhos = no.filhos.length > 0;
    const abreRegistro = Boolean(no.registro && onAbrirRegistro);

    return (
      <g key={no.id}>
        {selecionado ? (
          <rect
            x={x - 4}
            y={y - 4}
            width={largura + 8}
            height={altura + 8}
            rx={10}
            fill="none"
            stroke={theme.color.blue}
            strokeWidth={2}
          />
        ) : null}
        <rect
          x={x}
          y={y}
          width={largura}
          height={altura}
          rx={raizDoMapa ? 10 : 7}
          fill={fundo}
          stroke={raizDoMapa ? 'none' : corTexto(cor)}
          strokeOpacity={nivel === 1 ? 0.9 : 0.45}
          strokeWidth={1.25}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (!onSelecionar && abreRegistro && no.registro) {
              onAbrirRegistro?.(no.registro);
              return;
            }
            onSelecionar?.(no.id);
          }}
          onDoubleClick={() => {
            if (abreRegistro && no.registro) {
              onAbrirRegistro?.(no.registro);
            }
          }}
        />
        <text
          x={x + largura / 2}
          y={y + altura / 2 + (raizDoMapa ? 5 : 4)}
          textAnchor="middle"
          fill={texto}
          fontSize={raizDoMapa ? 15 : 13}
          fontWeight={nivel <= 1 ? 600 : 400}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {truncar(no.texto)}
          {abreRegistro ? ' ↗' : ''}
        </text>
        {temFilhos && onAlternarRecolhido ? (
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => onAlternarRecolhido(no.id)}
          >
            <circle
              cx={x + largura + 9}
              cy={y + altura / 2}
              r={8}
              fill={theme.background.primary}
              stroke={corTexto(raizDoMapa ? 'gray' : cor)}
              strokeOpacity={0.7}
            />
            <text
              x={x + largura + 9}
              y={y + altura / 2 + 3.5}
              textAnchor="middle"
              fontSize={posicionado.temFilhosOcultos ? 9 : 12}
              fontWeight={600}
              fill={corTexto(raizDoMapa ? 'gray' : cor)}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {posicionado.temFilhosOcultos ? no.filhos.length : '−'}
            </text>
          </g>
        ) : null}
      </g>
    );
  };

  return (
    <div
      style={{
        background: theme.background.secondary,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${origemX} ${origemY} ${larguraVisivel} ${alturaVisivel}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', fontFamily: 'Inter, sans-serif', touchAction: 'none' }}
        onPointerMove={(evento) => {
          if (!arraste.current) {
            return;
          }
          const escala = unidadesPorPixel();
          const dx = (evento.clientX - arraste.current.x) * escala;
          const dy = (evento.clientY - arraste.current.y) * escala;
          arraste.current = { x: evento.clientX, y: evento.clientY };
          setDeslocamento((atual) => ({ x: atual.x + dx, y: atual.y + dy }));
        }}
        onPointerUp={() => {
          arraste.current = null;
        }}
        onPointerLeave={() => {
          arraste.current = null;
        }}
        onWheel={(evento) => ajustarZoom(evento.deltaY > 0 ? 0.9 : 1.1)}
      >
        <rect
          x={origemX - larguraVisivel}
          y={origemY - alturaVisivel}
          width={larguraVisivel * 3}
          height={alturaVisivel * 3}
          fill="transparent"
          style={{ cursor: 'grab' }}
          onPointerDown={(evento) => {
            arraste.current = { x: evento.clientX, y: evento.clientY };
          }}
          onClick={() => onSelecionar?.(null)}
        />
        {layout.nos.map(desenharLigacao)}
        {layout.nos.map(desenharNo)}
      </svg>
      <div
        style={{
          display: 'flex',
          gap: 4,
          position: 'absolute',
          right: 12,
          bottom: 12,
        }}
      >
        <Botao titulo="Diminuir zoom" onClick={() => ajustarZoom(0.8)}>
          −
        </Botao>
        <Botao titulo="Ajustar à tela" onClick={centralizar}>
          {Math.round(zoom * 100)}%
        </Botao>
        <Botao titulo="Aumentar zoom" onClick={() => ajustarZoom(1.25)}>
          +
        </Botao>
      </div>
    </div>
  );
};
