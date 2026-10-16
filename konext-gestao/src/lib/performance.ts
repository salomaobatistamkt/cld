// Classificação de performance: referências configuráveis (não são regras universais).
// Toda classificação traz a justificativa e só aparece quando há dados suficientes.
import { type CampanhaRel, type Derivadas, formatar, PARAMETROS_PADRAO, type ParametrosPerformance, type RegraPerformance } from './metricas';

export type Nivel = 'otimo' | 'bom' | 'atencao' | 'alerta' | 'info' | 'insuficiente';
export type Classificacao = { nivel: Nivel; rotulo: string; explicacao: string };

export const COR_NIVEL: Record<Nivel, string> = { otimo: 'green', bom: 'sky', atencao: 'amber', alerta: 'red', info: 'violet', insuficiente: 'slate' };

export const parametrosCom = (p?: Partial<ParametrosPerformance> | null): ParametrosPerformance => ({ ...PARAMETROS_PADRAO, ...(p || {}), regras: Array.isArray(p?.regras) ? p!.regras : [] });

export type Contexto = { clienteId?: string; procedimento?: string; objetivo?: string; tipoResultado?: string };

// A regra mais específica que combina com o contexto ajusta os limites de custo e CTR.
export const limitesPara = (p: ParametrosPerformance, ctx: Contexto) => {
  const casa = (r: RegraPerformance) =>
    (!r.clienteId || r.clienteId === ctx.clienteId) &&
    (!r.procedimento || r.procedimento.trim().toLowerCase() === (ctx.procedimento || '').trim().toLowerCase()) &&
    (!r.objetivo || r.objetivo === ctx.objetivo) &&
    (!r.tipoResultado || r.tipoResultado === ctx.tipoResultado);
  const peso = (r: RegraPerformance) => [r.clienteId, r.procedimento, r.objetivo, r.tipoResultado].filter(Boolean).length;
  const regra = p.regras.filter(casa).sort((a, b) => peso(b) - peso(a))[0];
  return {
    custoOtimo: regra?.custoOtimo ?? p.custoOtimo,
    custoBom: regra?.custoBom ?? p.custoBom,
    ctrBom: regra?.ctrBom ?? p.ctrBom,
    ctrExcelente: regra?.ctrExcelente ?? p.ctrExcelente,
    regra: regra ? descreverRegra(regra) : null,
  };
};

export const descreverRegra = (r: RegraPerformance) =>
  [r.procedimento && `procedimento “${r.procedimento}”`, r.objetivo && `objetivo ${r.objetivo}`, r.tipoResultado && `resultado “${r.tipoResultado}”`, r.clienteId && 'deste cliente'].filter(Boolean).join(', ') || 'geral';

// CTR usado: de saída para tráfego/vendas (quando existe); senão, o do link.
export const ctrDe = (m: Derivadas, objetivo = '') => {
  if (/TRAFFIC|SALES|CONVERSIONS|LINK_CLICKS/.test(objetivo) && m.ctrSaida !== null) return { valor: m.ctrSaida, rotulo: 'CTR de saída' };
  return { valor: m.ctrLink, rotulo: 'CTR do link' };
};

export const classificarCtr = (m: Derivadas, p: ParametrosPerformance, ctx: Contexto = {}): Classificacao => {
  const { valor, rotulo } = ctrDe(m, ctx.objetivo);
  if (valor === null) return { nivel: 'insuficiente', rotulo: 'Sem dado', explicacao: `${rotulo} indisponível para este período.` };
  if (m.impressoes < p.impressoesParaClassificar)
    return { nivel: 'insuficiente', rotulo: 'Poucos dados', explicacao: `Só ${formatar(m.impressoes, 'numero')} impressões: ainda é cedo para avaliar o ${rotulo}.` };
  const l = limitesPara(p, ctx);
  const v = formatar(valor, 'pct');
  if (valor > p.ctrMuitoAlto) return { nivel: 'otimo', rotulo: 'Excelente', explicacao: `${rotulo} de ${v}, acima de ${p.ctrMuitoAlto}%. Ótimo, mas confira também se os cliques viram resultados de qualidade.` };
  if (valor >= l.ctrExcelente) return { nivel: 'otimo', rotulo: 'Excelente', explicacao: `${rotulo} de ${v} (referência de excelente: a partir de ${l.ctrExcelente}%).` };
  if (valor >= l.ctrBom) return { nivel: 'bom', rotulo: 'Bom', explicacao: `${rotulo} de ${v} (bom: de ${l.ctrBom}% a ${l.ctrExcelente}%).` };
  if (valor >= p.ctrAtencao) return { nivel: 'atencao', rotulo: 'Atenção', explicacao: `${rotulo} de ${v}, entre ${p.ctrAtencao}% e ${l.ctrBom}%. O anúncio pode chamar mais atenção (criativo, chamada, público).` };
  return { nivel: 'alerta', rotulo: 'Baixo', explicacao: `${rotulo} de ${v}, abaixo de ${p.ctrAtencao}%. Poucas pessoas clicam: vale testar outro criativo ou público.` };
};

export const classificarCusto = (m: Derivadas, p: ParametrosPerformance, ctx: Contexto = {}): Classificacao => {
  if (m.custoPorResultado === null) return { nivel: 'insuficiente', rotulo: 'Sem resultados', explicacao: m.resultados === null ? 'A Meta não informou resultados para este período.' : 'Nenhum resultado no período.' };
  if (m.impressoes < p.impressoesParaClassificar) return { nivel: 'insuficiente', rotulo: 'Poucos dados', explicacao: `Só ${formatar(m.impressoes, 'numero')} impressões: o custo ainda vai se estabilizar.` };
  const l = limitesPara(p, { ...ctx, tipoResultado: ctx.tipoResultado ?? m.tipoResultado });
  const v = formatar(m.custoPorResultado, 'moeda');
  const ref = l.regra ? ` (referência ${l.regra})` : '';
  const nota = ' Lembre: resultado barato não significa venda lucrativa; acompanhe a qualidade dos contatos.';
  if (m.custoPorResultado <= l.custoOtimo) return { nivel: 'otimo', rotulo: 'Ótimo', explicacao: `Custo por resultado de ${v}, até ${formatar(l.custoOtimo, 'moeda')}${ref}.${nota}` };
  if (m.custoPorResultado <= l.custoBom) return { nivel: 'bom', rotulo: 'Bom', explicacao: `Custo por resultado de ${v}, entre ${formatar(l.custoOtimo, 'moeda')} e ${formatar(l.custoBom, 'moeda')}${ref}.` };
  return { nivel: 'atencao', rotulo: 'Atenção', explicacao: `Custo por resultado de ${v}, acima de ${formatar(l.custoBom, 'moeda')}${ref}. Avalie criativo, público e a qualidade dos resultados antes de mexer no orçamento.` };
};

export const classificarVolume = (valor: number | null, minimo: number, nome: 'impressões' | 'alcance'): Classificacao => {
  if (valor === null) return { nivel: 'insuficiente', rotulo: 'Sem dado', explicacao: `${nome === 'alcance' ? 'Alcance' : 'Impressões'} indisponível para este período.` };
  if (valor > minimo) return { nivel: 'bom', rotulo: 'Bom volume', explicacao: `${formatar(valor, 'numero')} ${nome}: acima de ${formatar(minimo, 'numero')}, volume suficiente para análise.` };
  return { nivel: 'info', rotulo: 'Volume inicial', explicacao: `${formatar(valor, 'numero')} ${nome}: volume ainda limitado (até ${formatar(minimo, 'numero')}). Depende do período e do orçamento; não indica resultado ruim.` };
};

export const classificarFrequencia = (m: Derivadas, p: ParametrosPerformance): Classificacao => {
  const f = m.frequencia;
  if (f === null) return { nivel: 'insuficiente', rotulo: 'Sem dado', explicacao: 'Frequência indisponível (depende do alcance do período).' };
  const v = formatar(f, 'decimal');
  if (f < p.freqInicial) return { nivel: 'info', rotulo: 'Verificar', explicacao: `Frequência de ${v}, abaixo de ${p.freqInicial}: confira o período e a consistência dos dados.` };
  if (f < p.freqBoa) return { nivel: 'info', rotulo: 'Inicial', explicacao: `Frequência de ${v}: distribuição inicial, cada pessoa viu os anúncios pouco mais de uma vez.` };
  if (f <= p.freqAlta) return { nivel: 'bom', rotulo: 'Boa exposição', explicacao: `Frequência de ${v}: boa exposição inicial.` };
  return { nivel: 'atencao', rotulo: 'Repetida', explicacao: `Frequência de ${v}, acima de ${p.freqAlta}: as pessoas estão vendo os anúncios várias vezes. Pode ser bom para lembrança de marca, mas, se o CTR e o custo piorarem, é sinal de saturação.` };
};

// Pontos de atenção e recomendações em linguagem simples.
export type Alerta = { nivel: Nivel; titulo: string; texto: string };

export const gerarAlertas = (campanhas: CampanhaRel[], p: ParametrosPerformance, clienteId?: string, anteriorPorId?: Map<string, Derivadas>): Alerta[] => {
  const alertas: Alerta[] = [];
  for (const c of campanhas) {
    if (c.m.gasto <= 0) continue;
    const ctx = { clienteId, procedimento: c.procedimento, objetivo: c.objetivo, tipoResultado: c.m.tipoResultado };
    if (c.m.impressoes < p.impressoesParaClassificar) {
      alertas.push({ nivel: 'info', titulo: c.nome, texto: `Ainda com pouco volume (${formatar(c.m.impressoes, 'numero')} impressões). É cedo para avaliar; aguarde mais dados antes de mudar algo.` });
      continue;
    }
    const ctr = classificarCtr(c.m, p, ctx);
    const custo = classificarCusto(c.m, p, ctx);
    const freq = classificarFrequencia(c.m, p);
    if (ctr.nivel === 'alerta') alertas.push({ nivel: 'alerta', titulo: c.nome, texto: ctr.explicacao });
    if (custo.nivel === 'atencao') alertas.push({ nivel: 'atencao', titulo: c.nome, texto: custo.explicacao });
    const ant = anteriorPorId?.get(c.id);
    if (freq.nivel === 'atencao') {
      const caiu = ant && ant.ctrLink !== null && c.m.ctrLink !== null && c.m.ctrLink < ant.ctrLink * 0.85;
      alertas.push({ nivel: caiu ? 'alerta' : 'info', titulo: c.nome, texto: caiu ? `${freq.explicacao} O CTR caiu em relação ao período anterior: possível saturação, considere renovar os criativos.` : freq.explicacao });
    }
    if (ctr.nivel === 'otimo' && custo.nivel === 'otimo') {
      const estavel = ant && ant.custoPorResultado !== null && c.m.custoPorResultado !== null && c.m.custoPorResultado <= ant.custoPorResultado * 1.15;
      alertas.push({
        nivel: 'otimo',
        titulo: c.nome,
        texto: estavel
          ? 'CTR e custo por resultado ótimos e estáveis em relação ao período anterior. Pode ser avaliado um aumento gradual de orçamento, acompanhando a qualidade dos resultados.'
          : 'CTR e custo por resultado ótimos neste período. Acompanhe mais alguns dias para confirmar a estabilidade antes de mexer no orçamento.',
      });
    }
  }
  const ordem: Nivel[] = ['alerta', 'atencao', 'otimo', 'bom', 'info', 'insuficiente'];
  return alertas.sort((a, b) => ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel));
};
