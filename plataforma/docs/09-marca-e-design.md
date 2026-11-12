# 09 · Marca e design

## Direção

**Instrumento de navegação.** A interface se inspira em carta náutica e painel de aeroporto: precisa, calma, legível. O destaque vem da informação (preço, rota, data), não de enfeite.

## O que evitamos

- Grades de cards iguais.
- Gradientes.
- Ícones decorativos.
- Animações pesadas.
- Visual de painel administrativo genérico.

As listas de ofertas são **linhas de um painel de partidas**, não cartões. Os indicadores do painel formam **um único instrumento** dividido em células, não blocos soltos.

## Tokens (`public/css/base.css`)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--fg` grafite | `#142220` | `#e3ebe9` | texto |
| `--accent` oceano | `#0b5a70` | `#5cb2c8` | marca, ações, país selecionado no globo |
| `--amber` âmbar | `#9a5b00` | `#f0b14d` | **só** rótulo de achado e rotas no globo |
| `--bg` névoa | `#f4f6f5` | `#0d1413` | fundo |
| `--ok` / `--bad` | verde / vermelho | — | estados (nunca como cor de série) |

Os dois temas, claro e escuro, são desenhados com o mesmo cuidado.

## Tipografia

| Papel | Fonte |
|---|---|
| Títulos | Archivo (geométrica, firme) |
| Texto | IBM Plex Sans |
| Números, códigos IATA, datas e preços | IBM Plex Mono, com algarismos tabulares, para alinhar como num painel de voos |

## Marca

- **Símbolo:** círculo com meridiano (azul) e linha do equador em âmbar, feito só com CSS.
- **Nome provisório:** Meridia.
- **Alternativas** da análise: Farelight, Rotalis, Altitude Fares, Voyalis, Waypoint, Tarifa Norte.
- **Estrutura:** marca principal + canais regionais ("Meridia · achados saindo de Natal").

## Globo

- Projeção ortográfica em Canvas 2D (d3-geo), polígonos Natural Earth 1:110m.
- Arrastar gira, roda ou pinça aproxima, toque seleciona país ou aeroporto (alvo de 14 px).
- Ao escolher a origem, desenha arcos de grande círculo até os destinos com achados publicados.
- Respeita "reduzir movimento" do sistema (sem animação de voo).
- **Evolução:** MapLibre GL com projeção de globo e tiles vetoriais (Protomaps no R2) quando precisarmos de ruas, bairros e hotéis no mapa.
