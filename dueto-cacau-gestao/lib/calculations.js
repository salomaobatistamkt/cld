/**
 * LÓGICA DE CUSTOS E PRECIFICAÇÃO — Dueto CaCau
 *
 * Tudo parte de três números da operação:
 *   1. Custo da sua hora de trabalho   = salário desejado ÷ horas trabalhadas no mês
 *   2. Custos fixos por hora           = soma dos custos fixos do mês ÷ horas trabalhadas no mês
 *   3. Horas trabalhadas no mês        = horas por dia × dias por semana × 4,33 semanas
 *
 * Custo de uma receita =
 *     ingredientes + embalagens + gás
 *   + mão de obra   (minutos ÷ 60 × custo da hora de trabalho)
 *   + custos fixos  (minutos ÷ 60 × custos fixos por hora)
 *   + equipe        (minutos ÷ 60 × custo/hora de cada pessoa da equipe envolvida)
 *   + outras receitas usadas dentro dela (ex.: massa + recheio), cada uma × quantidade
 *
 * Preço sugerido  = custo ÷ (1 − margem)      → a margem é sobre o PREÇO de venda
 * Lucro           = preço − custo
 * Lucro por hora  = lucro da receita ÷ horas gastas nela
 * Canais          = preço desejado ÷ (1 − taxa do canal)   → quanto cobrar para receber o preço líquido
 * Revenda         = preço × (1 − desconto)
 */

export const SEMANAS_POR_MES = 4.33;

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const soma = (lista, fn) => (lista || []).reduce((acc, item) => acc + fn(item), 0);

export const arredondar = (v, casas = 2) => {
  const f = 10 ** casas;
  return Math.round((num(v) + Number.EPSILON) * f) / f;
};

/** Custo de 1 g / 1 ml / 1 unidade de um insumo ou embalagem. */
export const custoUnitario = (item) => {
  const qtd = num(item?.qtdEmbalagem);
  return qtd > 0 ? num(item?.preco) / qtd : 0;
};

export const horasTrabalhadasMes = (horasDia, diasSemana) => num(horasDia) * num(diasSemana) * SEMANAS_POR_MES;

/** Custo de operação: quanto custa cada hora e cada minuto do negócio funcionando. */
export const calcularOperacao = (config) => {
  const mo = config?.maoDeObra || {};
  const horasMes = horasTrabalhadasMes(mo.horasDia, mo.diasSemana);
  const salario = num(mo.salario);
  const custoHoraTrabalho = horasMes > 0 ? salario / horasMes : 0;

  const custosFixosMes = soma(config?.custosFixos, (c) => num(c.valor));
  const fixosPorHora = horasMes > 0 ? custosFixosMes / horasMes : 0;

  const equipe = (config?.equipe || []).map((p) => {
    const horas = horasTrabalhadasMes(p.horasDia, p.diasSemana);
    return { ...p, horasMes: horas, custoHora: horas > 0 ? num(p.salario) / horas : 0 };
  });
  const salariosEquipe = soma(equipe, (p) => num(p.salario));

  const custoHoraOperacao = custoHoraTrabalho + fixosPorHora;
  return {
    horasMes,
    salario,
    custoHoraTrabalho,
    custosFixosMes,
    fixosPorHora,
    custoHoraOperacao,
    custoMinutoOperacao: custoHoraOperacao / 60,
    equipe,
    salariosEquipe,
    custoMensalTotal: salario + custosFixosMes + salariosEquipe,
  };
};

export const calcularGas = (uso, fontes) => {
  const fonte = (fontes || []).find((g) => g.id === uso.fonteId);
  if (!fonte) return 0;
  const peso = num(fonte.pesoBotijao);
  if (peso <= 0) return 0;
  return (num(uso.minutos) / 60) * (num(fonte.kgPorHora) / peso) * num(fonte.precoBotijao);
};

const VAZIO = {
  ingredientes: 0, embalagens: 0, gas: 0, maoDeObra: 0, fixos: 0, equipe: 0, componentes: 0,
  total: 0, porUnidade: 0, rendimento: 1, minutos: 0, minutosTotais: 0, semPreco: [],
};

/**
 * Custo completo de uma receita. `estado` = { ingredientes, embalagens, receitas, config }.
 * `visitadas` evita que uma receita dependa dela mesma.
 */
export const calcularReceita = (receitaId, estado, visitadas = new Set()) => {
  const receita = (estado.receitas || []).find((r) => r.id === receitaId);
  if (!receita) return null;
  const rendimento = Math.max(num(receita.rendimento), 1);
  if (visitadas.has(receitaId)) return { ...VAZIO, rendimento };
  const visitou = new Set(visitadas).add(receitaId);

  const operacao = calcularOperacao(estado.config);
  const semPreco = [];

  const ingredientes = soma(receita.ingredientes, (linha) => {
    const ing = (estado.ingredientes || []).find((i) => i.id === linha.insumoId);
    if (!ing) return 0;
    if (custoUnitario(ing) === 0) semPreco.push(ing.nome);
    return num(linha.qtd) * custoUnitario(ing);
  });

  const embalagens = soma(receita.embalagens, (linha) => {
    const emb = (estado.embalagens || []).find((e) => e.id === linha.embalagemId);
    if (!emb) return 0;
    if (custoUnitario(emb) === 0) semPreco.push(emb.nome);
    return num(linha.qtd) * custoUnitario(emb);
  });

  const gas = soma(receita.gas, (uso) => calcularGas(uso, estado.config?.gas));

  const minutos = num(receita.minutos);
  const horas = minutos / 60;
  const maoDeObra = horas * operacao.custoHoraTrabalho;
  const fixos = horas * operacao.fixosPorHora;
  const equipe = soma(receita.equipeIds, (id) => {
    const pessoa = operacao.equipe.find((p) => p.id === id);
    return pessoa ? horas * pessoa.custoHora : 0;
  });

  let componentes = 0;
  let minutosComponentes = 0;
  (receita.componentes || []).forEach((comp) => {
    const sub = calcularReceita(comp.receitaId, estado, visitou);
    if (!sub) return;
    componentes += sub.total * num(comp.qtd);
    minutosComponentes += sub.minutosTotais * num(comp.qtd);
    sub.semPreco.forEach((n) => semPreco.push(n));
  });

  const total = ingredientes + embalagens + gas + maoDeObra + fixos + equipe + componentes;
  return {
    ingredientes, embalagens, gas, maoDeObra, fixos, equipe, componentes,
    total,
    porUnidade: total / rendimento,
    rendimento,
    minutos,
    minutosTotais: minutos + minutosComponentes,
    semPreco: [...new Set(semPreco)],
  };
};

/** Receitas que não podem virar componente de `receitaId` (evita dependência circular). */
export const componentesInvalidos = (receitaId, receitas) => {
  const invalidos = new Set([receitaId]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    (receitas || []).forEach((r) => {
      if (invalidos.has(r.id)) return;
      if ((r.componentes || []).some((c) => invalidos.has(c.receitaId))) {
        invalidos.add(r.id);
        mudou = true;
      }
    });
  }
  return invalidos;
};

/** Preço sugerido, margem, lucro, lucro por hora, canais de venda e revenda. */
export const calcularPreco = (receitaId, estado, opcoes = {}) => {
  const custo = calcularReceita(receitaId, estado);
  if (!custo) return null;
  const receita = estado.receitas.find((r) => r.id === receitaId);
  const config = estado.config || {};

  const temMargemPropria = receita.margem !== null && receita.margem !== undefined && receita.margem !== '';
  const margemAlvo = Math.min(Math.max(temMargemPropria ? num(receita.margem) : num(config.margemPadrao), 0), 0.95);

  const sugeridoReceita = custo.total / (1 - margemAlvo);
  const sugeridoUnidade = sugeridoReceita / custo.rendimento;

  const temPrecoProprio = receita.precoVenda !== null && receita.precoVenda !== undefined && receita.precoVenda !== '';
  const precoUnidade = temPrecoProprio ? num(receita.precoVenda) : arredondar(sugeridoUnidade);

  const lucroUnidade = precoUnidade - custo.porUnidade;
  const lucroReceita = lucroUnidade * custo.rendimento;
  const margemReal = precoUnidade > 0 ? lucroUnidade / precoUnidade : 0;
  const horas = custo.minutosTotais / 60;
  const lucroPorHora = horas > 0 ? lucroReceita / horas : null;

  const canais = (config.canais || []).map((c) => {
    const taxa = Math.min(Math.max(num(c.taxa), 0), 0.95);
    return { id: c.id, nome: c.nome, taxa, preco: arredondar(precoUnidade / (1 - taxa)) };
  });

  const desconto = opcoes.descontoRevenda ?? num(config.descontoRevenda);
  const precoRevenda = precoUnidade * (1 - desconto);
  const lucroRevenda = precoRevenda - custo.porUnidade;
  const revenda = {
    desconto,
    preco: arredondar(precoRevenda),
    lucroUnidade: arredondar(lucroRevenda),
    margem: precoRevenda > 0 ? lucroRevenda / precoRevenda : 0,
  };

  return {
    custo,
    margemAlvo,
    temPrecoProprio,
    sugeridoUnidade: arredondar(sugeridoUnidade),
    sugeridoReceita: arredondar(sugeridoReceita),
    precoUnidade,
    precoReceita: arredondar(precoUnidade * custo.rendimento),
    lucroUnidade: arredondar(lucroUnidade),
    lucroReceita: arredondar(lucroReceita),
    margemReal,
    lucroPorHora: lucroPorHora === null ? null : arredondar(lucroPorHora),
    canais,
    revenda,
  };
};

/** Simulador: dado um preço de venda, qual a margem e o lucro. */
export const simularPreco = (custoPorUnidade, rendimento, preco) => {
  const p = num(preco);
  const lucroUnidade = p - num(custoPorUnidade);
  return {
    lucroUnidade: arredondar(lucroUnidade),
    lucroReceita: arredondar(lucroUnidade * Math.max(num(rendimento), 1)),
    margem: p > 0 ? lucroUnidade / p : 0,
  };
};

/** Resultado dos pedidos entregues no período (receita, custo, lucro, por receita). */
export const calcularResultadoPedidos = (pedidos, estado, filtroData) => {
  let receita = 0;
  let custo = 0;
  let unidades = 0;
  const porReceita = {};

  (pedidos || []).forEach((pedido) => {
    if (pedido.status !== 'entregue') return;
    if (filtroData && !filtroData(pedido.data)) return;
    (pedido.itens || []).forEach((item) => {
      const rec = estado.receitas.find((r) => r.id === item.receitaId);
      if (!rec) return;
      const c = calcularReceita(rec.id, estado);
      const qtd = num(item.qtd);
      const valor = qtd * num(item.preco);
      const custoItem = qtd * (c ? c.porUnidade : 0);
      receita += valor;
      custo += custoItem;
      unidades += qtd;
      const atual = porReceita[rec.nome] || { qtd: 0, receita: 0, custo: 0 };
      atual.qtd += qtd;
      atual.receita += valor;
      atual.custo += custoItem;
      porReceita[rec.nome] = atual;
    });
  });

  const lucro = receita - custo;
  return {
    receita: arredondar(receita),
    custo: arredondar(custo),
    lucro: arredondar(lucro),
    margem: receita > 0 ? lucro / receita : 0,
    unidades,
    porReceita,
  };
};

export const totalPedido = (pedido) => soma(pedido.itens, (i) => num(i.qtd) * num(i.preco));

export const resumoCaixa = (lancamentos, filtroData) => {
  const lista = (lancamentos || []).filter((l) => !filtroData || filtroData(l.data));
  const entradas = soma(lista.filter((l) => l.tipo === 'entrada'), (l) => num(l.valor));
  const saidas = soma(lista.filter((l) => l.tipo === 'saida'), (l) => num(l.valor));
  const porCategoria = {};
  lista.forEach((l) => {
    const c = (porCategoria[l.categoria] ||= { entrada: 0, saida: 0 });
    c[l.tipo] += num(l.valor);
  });
  return { entradas: arredondar(entradas), saidas: arredondar(saidas), saldo: arredondar(entradas - saidas), porCategoria };
};
