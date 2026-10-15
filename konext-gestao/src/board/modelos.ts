// Modelos prontos para o quadro branco, descritos no formato "esqueleto" do
// Excalidraw (convertToExcalidrawElements transforma em elementos de verdade).
type Esqueleto = Record<string, unknown>;

const FONTE = 6; // Nunito: limpa, sem o traço "à mão".
const TINTA = '#1e293b';

type OpcoesCaixa = {
  fundo?: string;
  borda?: string;
  cor?: string;
  tamanho?: number;
  forma?: 'rectangle' | 'ellipse' | 'diamond';
  tracejado?: boolean;
};

// Posição de cada caixa, para as setas saírem e chegarem nas bordas certas.
const caixas = new Map<string, { x: number; y: number; w: number; h: number }>();

const caixa = (id: string, x: number, y: number, w: number, h: number, texto: string, o: OpcoesCaixa = {}): Esqueleto => {
  caixas.set(id, { x, y, w, h });
  return {
  type: o.forma ?? 'rectangle',
  id,
  x,
  y,
  width: w,
  height: h,
  backgroundColor: o.fundo ?? '#ffffff',
  strokeColor: o.borda ?? TINTA,
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: o.tracejado ? 'dashed' : 'solid',
  roughness: 0,
  roundness: o.forma === 'ellipse' || o.forma === 'diamond' ? null : { type: 3 },
  label: { text: texto, fontSize: o.tamanho ?? 18, fontFamily: FONTE, strokeColor: o.cor ?? TINTA },
  };
};

// Pontos de saída/chegada: bordas laterais se a ligação é mais horizontal, senão topo/base.
const pontas = (de: string, para: string) => {
  const a = caixas.get(de);
  const b = caixas.get(para);
  if (!a || !b) return { x: 0, y: 0, dx: 100, dy: 0 };
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const folga = 8;
  let inicio: { x: number; y: number };
  let fim: { x: number; y: number };
  if (Math.abs(cb.x - ca.x) >= Math.abs(cb.y - ca.y)) {
    const direita = cb.x > ca.x;
    inicio = { x: direita ? a.x + a.w + folga : a.x - folga, y: ca.y };
    fim = { x: direita ? b.x - folga : b.x + b.w + folga, y: cb.y };
  } else {
    const abaixo = cb.y > ca.y;
    inicio = { x: ca.x, y: abaixo ? a.y + a.h + folga : a.y - folga };
    fim = { x: cb.x, y: abaixo ? b.y - folga : b.y + b.h + folga };
  }
  return { x: inicio.x, y: inicio.y, dx: fim.x - inicio.x, dy: fim.y - inicio.y };
};

const seta = (de: string, para: string, o: { tracejada?: boolean; ponta?: boolean; cor?: string; rotulo?: string } = {}): Esqueleto => {
  const p = pontas(de, para);
  return {
  type: 'arrow',
  x: p.x,
  y: p.y,
  width: Math.abs(p.dx),
  height: Math.abs(p.dy),
  points: [
    [0, 0],
    [p.dx, p.dy],
  ],
  start: { id: de },
  end: { id: para },
  strokeColor: o.cor ?? TINTA,
  strokeWidth: 2,
  strokeStyle: o.tracejada === false ? 'solid' : 'dashed',
  roughness: 0,
  endArrowhead: o.ponta === false ? null : 'arrow',
  ...(o.rotulo ? { label: { text: o.rotulo, fontSize: 14, fontFamily: FONTE } } : {}),
  };
};

const texto = (x: number, y: number, conteudo: string, tamanho = 18, cor = TINTA, largura?: number): Esqueleto => ({
  type: 'text',
  x,
  y,
  text: conteudo,
  fontSize: tamanho,
  fontFamily: FONTE,
  strokeColor: cor,
  roughness: 0,
  ...(largura ? { width: largura } : {}),
});

const titulo = (conteudo: string, sub: string, y = -150) => [texto(0, y, conteudo, 36, '#0f172a'), texto(0, y + 50, sub, 18, '#64748b')];

// Funil no estilo do quadro do Canva: tráfego → site → checkout → upsell →
// obrigado → pós-venda → sucesso, com automação por cima e captura por baixo.
const funil = (): Esqueleto[] => [
  ...titulo('Funil de vendas', 'Arraste, renomeie e conecte as etapas. Dê dois cliques para editar um texto.'),
  caixa('meta', 0, 150, 190, 70, 'Anúncios Meta', { fundo: '#dbeafe', borda: '#2563eb' }),
  caixa('google', 0, 300, 190, 70, 'Anúncios Google', { fundo: '#dcfce7', borda: '#16a34a' }),
  caixa('site', 280, 220, 190, 80, 'Site / Landing page', { fundo: '#ffffff' }),
  caixa('checkout', 560, 220, 170, 80, 'Checkout', { fundo: '#fee2e2', borda: '#dc2626' }),
  caixa('upsell', 820, 200, 210, 120, 'Upsell\n1. Produto A\n2. Produto B\n3. Produto C', { fundo: '#f1f5f9', tamanho: 16 }),
  caixa('obrigado', 1120, 220, 200, 80, 'Página de\nagradecimento', { fundo: '#ffffff' }),
  caixa('pos', 1410, 220, 180, 80, 'Pós-venda', { fundo: '#1e293b', borda: '#1e293b', cor: '#ffffff' }),
  caixa('sucesso', 1680, 210, 230, 100, 'Sucesso e experiência\ndo cliente', { fundo: '#fef3c7', borda: '#d97706' }),
  caixa('abandono', 820, -10, 230, 70, 'Automação:\nabandono de carrinho', { fundo: '#e2e8f0', tamanho: 16 }),
  caixa('msg', 1140, -30, 330, 110, 'Olá, {nome}! Vi que você não\nfinalizou sua compra. Use o\ncupom VOLTA5 e ganhe 5% off.', { fundo: '#14532d', borda: '#14532d', cor: '#ffffff', tamanho: 15 }),
  caixa('dados', 560, 420, 170, 60, 'Recolher dados', { fundo: '#1e293b', borda: '#1e293b', cor: '#ffffff', tamanho: 16 }),
  caixa('whats', 820, 400, 170, 60, 'WhatsApp', { fundo: '#dcfce7', borda: '#16a34a' }),
  caixa('email', 820, 520, 170, 60, 'E-mail', { fundo: '#fee2e2', borda: '#dc2626' }),
  texto(1060, 395, 'Comunidade e remarketing\nEx.: desafio de 7 dias, ofertas, lista de transmissão', 15, '#334155'),
  texto(1060, 530, 'E-mail marketing e promocional', 15, '#334155'),
  texto(1680, 340, 'Encantar vai além de um bom atendimento:\nambiente, linguagem e resolução de\nproblemas comunicam cuidado. O resultado\né um cliente que volta e indica.', 14, '#475569'),
  seta('meta', 'site'),
  seta('google', 'site'),
  seta('site', 'checkout'),
  seta('checkout', 'upsell'),
  seta('upsell', 'obrigado'),
  seta('obrigado', 'pos'),
  seta('pos', 'sucesso'),
  seta('checkout', 'abandono', { rotulo: 'não comprou' }),
  seta('abandono', 'msg'),
  seta('checkout', 'dados'),
  seta('dados', 'whats'),
  seta('dados', 'email'),
];

const mapa = (): Esqueleto[] => {
  const ramos: Array<[string, string, string, number, number]> = [
    ['r1', 'Objetivo\n+30% em encomendas', '#dbeafe', -420, -170],
    ['r2', 'Público\nfamílias do bairro', '#dcfce7', -460, 40],
    ['r3', 'Oferta\nkit café da manhã', '#fef3c7', -380, 230],
    ['r4', 'Criativos\nreels + carrossel', '#fce7f3', 380, -170],
    ['r5', 'Canais\nInstagram, WhatsApp', '#ede9fe', 420, 40],
    ['r6', 'Métricas\npedidos, CPL, ROAS', '#ccfbf1', 360, 230],
  ];
  return [
    ...titulo('Mapa mental', 'Ideia central no meio, ramos em volta. Duplique um ramo com Ctrl+D.', -340).map((el) => ({ ...el, x: -460 })),
    caixa('centro', -130, 20, 260, 110, 'Campanha de Natal', { forma: 'ellipse', fundo: '#1e293b', borda: '#1e293b', cor: '#ffffff', tamanho: 22 }),
    ...ramos.flatMap(([id, rotulo, fundo, x, y]) => [
      caixa(id, x, y, 230, 80, rotulo, { fundo, borda: '#94a3b8', tamanho: 16 }),
      seta('centro', id, { tracejada: false, ponta: false, cor: '#94a3b8' }),
    ]),
  ];
};

const jornada = (): Esqueleto[] => {
  const etapas: Array<[string, string, string[]]> = [
    ['Descoberta', '#dbeafe', ['Viu anúncio no Instagram', 'Pesquisou no Google']],
    ['Consideração', '#ede9fe', ['Visitou o site', 'Leu avaliações']],
    ['Decisão', '#fef3c7', ['Agendou avaliação', 'Recebeu lembrete no WhatsApp']],
    ['Experiência', '#dcfce7', ['Atendimento na clínica', 'Pesquisa de satisfação']],
    ['Fidelização', '#fce7f3', ['Retorno em 6 meses', 'Indicação com benefício']],
  ];
  return [
    ...titulo('Jornada do cliente', 'Cada coluna é uma fase. Adicione notas com o que o cliente faz, sente e precisa.'),
    ...etapas.flatMap(([nome, cor, notas], i) => [
      caixa(`fase${i}`, i * 280, 0, 240, 64, nome, { fundo: '#1e293b', borda: '#1e293b', cor: '#ffffff', tamanho: 20 }),
      ...notas.map((nota, j) => caixa(`nota${i}-${j}`, i * 280, 100 + j * 130, 240, 110, nota, { fundo: cor, borda: cor, tamanho: 16 })),
      ...(i < etapas.length - 1 ? [seta(`fase${i}`, `fase${i + 1}`)] : []),
    ]),
  ];
};

const campanha = (): Esqueleto[] => {
  const blocos: Array<[string, string, string]> = [
    ['Objetivo', 'O que queremos alcançar e até quando?', '#dbeafe'],
    ['Público', 'Quem é, onde está, o que deseja?', '#dcfce7'],
    ['Oferta', 'O que vamos oferecer e por quê agora?', '#fef3c7'],
    ['Mensagem', 'Promessa principal e provas', '#fce7f3'],
    ['Criativos', 'Formatos, ganchos, roteiros', '#ede9fe'],
    ['Canais', 'Meta, Google, WhatsApp, e-mail…', '#ccfbf1'],
    ['Cronograma', 'Datas de produção e de veiculação', '#e2e8f0'],
    ['Orçamento', 'Verba por canal e por fase', '#fee2e2'],
    ['Métricas', 'CPL, CPA, ROAS, vendas', '#f1f5f9'],
  ];
  return [
    ...titulo('Plano de campanha', 'Preencha cada bloco. Use notas e setas para ligar as ideias.'),
    ...blocos.map(([nome, ajuda, cor], i) =>
      caixa(`b${i}`, (i % 3) * 360, Math.floor(i / 3) * 230, 330, 200, `${nome}\n\n${ajuda}`, { fundo: cor, borda: '#94a3b8', tamanho: 16 }),
    ),
  ];
};

export const MODELOS: Record<string, { nome: string; descricao: string; gerar: () => Esqueleto[] }> = {
  branco: { nome: 'Em branco', descricao: 'Comece do zero', gerar: () => [] },
  funil: { nome: 'Funil de vendas', descricao: 'Tráfego, site, checkout, upsell, pós-venda e automações', gerar: funil },
  mapa: { nome: 'Mapa mental', descricao: 'Ideia central com ramos coloridos', gerar: mapa },
  jornada: { nome: 'Jornada do cliente', descricao: 'Da descoberta à fidelização', gerar: jornada },
  campanha: { nome: 'Plano de campanha', descricao: 'Objetivo, público, oferta, criativos, canais e métricas', gerar: campanha },
};
