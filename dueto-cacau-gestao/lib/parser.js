/**
 * LEITOR DE RECEITA EM TÓPICOS
 *
 * Entende um texto assim:
 *
 *   Brownie artesanal
 *   Rendimento: 12 unidades
 *   Tempo: 1h30
 *   Forno: 35 min
 *   300g de açúcar
 *   90 g de chocolate em pó
 *   - 3 ovos
 *   1 lata de leite condensado
 *   2 colheres (sopa) de manteiga
 *
 * e devolve o nome, rendimento, tempos e a lista de ingredientes, já ligando cada
 * item ao insumo cadastrado (com a quantidade convertida para a unidade do insumo).
 */

export const semAcento = (t) =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const NUMEROS_EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, meia: 0.5, meio: 0.5 };

const parseQuantidade = (texto) => {
  const t = semAcento(texto).replace(',', '.');
  if (NUMEROS_EXTENSO[t] !== undefined) return NUMEROS_EXTENSO[t];
  const misto = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (misto) return Number(misto[1]) + Number(misto[2]) / Number(misto[3]);
  const fracao = t.match(/^(\d+)\/(\d+)$/);
  if (fracao) return Number(fracao[1]) / Number(fracao[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Unidades reconhecidas → { base: 'g' | 'ml' | 'un' | 'embalagem', fator } */
const UNIDADES = [
  { re: /^(kg|quilos?|kilos?)\b/, base: 'g', fator: 1000 },
  { re: /^(mg|miligramas?)\b/, base: 'g', fator: 0.001 },
  { re: /^(g|gr|gramas?)\b/, base: 'g', fator: 1 },
  { re: /^(ml|mililitros?)\b/, base: 'ml', fator: 1 },
  { re: /^(l|lt|litros?)\b/, base: 'ml', fator: 1000 },
  { re: /^colheres?\s*(?:\(\s*)?(?:de\s+)?sopa\)?/, base: 'ml', fator: 15, aprox: true },
  { re: /^colheres?\s*(?:\(\s*)?(?:de\s+)?(?:cha|cafe)\)?/, base: 'ml', fator: 5, aprox: true },
  { re: /^colheres?\s*(?:\(\s*)?(?:de\s+)?sobremesa\)?/, base: 'ml', fator: 10, aprox: true },
  { re: /^colheres?\b/, base: 'ml', fator: 15, aprox: true },
  { re: /^(xicaras?|xic)\b/, base: 'ml', fator: 240, aprox: true },
  { re: /^copos?\b/, base: 'ml', fator: 200, aprox: true },
  { re: /^pitadas?\b/, base: 'g', fator: 0.5, aprox: true },
  { re: /^(un|und|unid|unidades?)\b/, base: 'un', fator: 1 },
  { re: /^(dentes?|fatias?|folhas?)\b/, base: 'un', fator: 1 },
  { re: /^(latas?|caixas?|caixinhas?|pacotes?|saches?|barras?|potes?|tabletes?|garrafas?)\b/, base: 'embalagem', fator: 1 },
];

const PREFIXO_TOPICO = /^\s*(?:[-–—•*·▪●]+|\d+\s*[.)])\s+/;
const QTD_INICIO = /^(?:(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\s*\/\s*\d+)?)|(meia|meio|uma?|duas?|dois|tr[eê]s|quatro|cinco)(?![\p{L}\d]))/iu;

/** Lê o tempo: "1h30", "90 min", "1 hora e 15", "45". Devolve minutos. */
export const parseTempo = (texto) => {
  const t = semAcento(texto);
  const hm = t.match(/(\d+)\s*h(?:oras?)?\s*(?:e\s*)?(\d+)?/);
  if (hm) return Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minutos?|m\b)?/);
  return m ? Math.round(Number(m[1].replace(',', '.'))) : null;
};

const parseLinhaIngrediente = (linhaOriginal) => {
  const linha = linhaOriginal.replace(PREFIXO_TOPICO, '').trim();
  const q = linha.match(QTD_INICIO);
  if (!q) return null;
  const qtd = parseQuantidade((q[1] || q[2]).replace(/\s+/g, ' '));
  if (qtd === null) return null;

  let resto = linha.slice(q[0].length).trim();
  let unidade = null;
  const restoNorm = semAcento(resto);
  for (const u of UNIDADES) {
    const m = restoNorm.match(u.re);
    if (m) {
      unidade = u;
      resto = resto.slice(m[0].length).trim();
      break;
    }
  }
  resto = resto.replace(/^[\s.:)]*(?:de|d')\s+/i, '').replace(/^[\s.:)]+/, '').trim();
  const nome = resto.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').replace(/[.;,]+$/, '').trim();
  if (!nome) return null;
  return { linha: linhaOriginal.trim(), qtd, unidade, nome };
};

const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'com', 'para', 'a', 'o', 'e']);
const singular = (p) => (p.length > 3 && p.endsWith('s') && !p.endsWith('ss') ? p.slice(0, -1) : p);
const tokens = (nome) =>
  semAcento(nome).split(/[^a-z0-9]+/).filter((p) => p && !stopwords.has(p)).map(singular);

/** Pontua o quanto o nome digitado parece com um insumo cadastrado (0 a 1). */
export const similaridade = (digitado, cadastrado) => {
  const a = tokens(digitado);
  const b = tokens(cadastrado);
  if (!a.length || !b.length) return 0;
  if (a.join(' ') === b.join(' ')) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  const comuns = [...sa].filter((x) => sb.has(x)).length;
  if (!comuns) return 0;
  const uniao = new Set([...sa, ...sb]).size;
  const jaccard = comuns / uniao;
  const contido = comuns === sa.size || comuns === sb.size;
  return contido ? Math.max(0.78, jaccard) : jaccard;
};

export const encontrarInsumo = (nome, insumos, unidadeBase = null) => {
  let melhor = null;
  let melhorNota = 0;
  (insumos || []).forEach((i) => {
    let nota = similaridade(nome, i.nome);
    // "500 ml de leite" não deve virar "leite condensado" (que é em g): unidade diferente derruba a nota.
    const medidas = ['g', 'ml'];
    if (nota < 1 && medidas.includes(unidadeBase) && medidas.includes(i.unidade) && unidadeBase !== i.unidade) nota -= 0.3;
    if (nota > melhorNota) {
      melhor = i;
      melhorNota = nota;
    }
  });
  return melhorNota >= 0.5 ? { insumo: melhor, nota: melhorNota } : null;
};

const titulo = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Converte a quantidade digitada para a unidade do insumo. Devolve { qtd, aviso }. */
const converter = (item, insumo) => {
  const u = item.unidade;
  if (!insumo) return { qtd: item.qtd * (u ? u.fator : 1), unidadeBase: u && u.base !== 'embalagem' ? u.base : 'un' };
  const alvo = insumo.unidade;
  if (!u) {
    if (alvo === 'un') return { qtd: item.qtd };
    return { qtd: item.qtd, aviso: `Sem unidade em “${item.nome}” — usei ${item.qtd} ${alvo}. Confira.` };
  }
  if (u.base === 'embalagem') {
    return { qtd: item.qtd * Number(insumo.qtdEmbalagem || 1) };
  }
  const bruto = item.qtd * u.fator;
  if (u.base === alvo) return { qtd: bruto, aviso: u.aprox ? `Medida caseira em “${item.nome}” — conferir a quantidade.` : undefined };
  if ((u.base === 'g' && alvo === 'ml') || (u.base === 'ml' && alvo === 'g')) {
    return { qtd: bruto, aviso: `“${item.nome}”: considerei 1 g = 1 ml.` };
  }
  return { qtd: bruto, aviso: `“${item.nome}” está cadastrado em ${alvo}, mas a receita usa ${u.base}. Confira.` };
};

const CAMPOS = [
  { re: /^(?:rendimento|rende|rendem|porcoes|porcao|serve|serve para)\s*[:\-]?\s*(.*)$/, campo: 'rendimento' },
  { re: /^(?:tempo(?:\s+de\s+preparo)?|preparo|tempo total|maos? na massa)\s*[:\-]\s*(.*)$/, campo: 'minutos' },
  { re: /^(?:forno|tempo de forno|assar)\s*[:\-]\s*(.*)$/, campo: 'forno' },
  { re: /^(?:fogao|tempo de fogao|cozinhar)\s*[:\-]\s*(.*)$/, campo: 'fogao' },
  { re: /^(?:categoria|tipo)\s*[:\-]\s*(.*)$/, campo: 'categoria' },
  { re: /^(?:nome(?:\s+da\s+receita)?|receita)\s*[:\-]\s*(.*)$/, campo: 'nome' },
];

/**
 * Lê o texto completo. `insumos` é a lista cadastrada.
 * Devolve { nome, categoria, rendimento, minutos, forno, fogao, itens, ignoradas, avisos }.
 */
export const lerReceitaEmTopicos = (texto, insumos = []) => {
  const resultado = { nome: '', categoria: '', rendimento: null, minutos: null, forno: null, fogao: null, itens: [], ignoradas: [], avisos: [] };
  const linhas = String(texto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  linhas.forEach((linha) => {
    const norm = semAcento(linha.replace(PREFIXO_TOPICO, ''));

    const campo = CAMPOS.find((c) => c.re.test(norm));
    if (campo) {
      const valor = norm.match(campo.re)[1];
      const original = linha.replace(PREFIXO_TOPICO, '').replace(/^[^:\-]*[:\-]\s*/, '');
      if (campo.campo === 'nome') resultado.nome = titulo(original.trim());
      else if (campo.campo === 'categoria') resultado.categoria = titulo(original.trim());
      else if (campo.campo === 'rendimento') {
        const n = valor.match(/\d+(?:[.,]\d+)?/);
        if (n) resultado.rendimento = Number(n[0].replace(',', '.'));
      } else {
        const min = parseTempo(valor);
        if (min !== null) resultado[campo.campo] = min;
      }
      return;
    }

    const item = parseLinhaIngrediente(linha);
    if (item) {
      const achado = encontrarInsumo(item.nome, insumos, item.unidade && item.unidade.base);
      const { qtd, aviso, unidadeBase } = converter(item, achado?.insumo);
      if (aviso) resultado.avisos.push(aviso);
      resultado.itens.push({
        linha: item.linha,
        nomeDigitado: item.nome,
        qtd: Math.round(qtd * 1000) / 1000,
        insumoId: achado ? achado.insumo.id : null,
        confianca: achado ? achado.nota : 0,
        novo: achado ? null : { nome: titulo(item.nome), unidade: unidadeBase || 'un' },
      });
      return;
    }

    if (!resultado.nome && !PREFIXO_TOPICO.test(linha)) {
      resultado.nome = titulo(linha.replace(/[:.]+$/, ''));
      return;
    }
    resultado.ignoradas.push(linha);
  });

  if (!resultado.nome) resultado.nome = 'Nova receita';
  return resultado;
};
