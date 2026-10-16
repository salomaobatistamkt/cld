// Orientações de gestão de tráfego: o guia fixo da agência e as regras automáticas que
// cruzam as métricas de cada campanha para sugerir o próximo passo.
import { type CampanhaRel, formatar, type ParametrosPerformance, type Relatorio } from './metricas';
import { classificarCusto, ctrDe, limitesPara } from './performance';
import { hojeISO } from './util';

export type Acao = 'nao-mexer' | 'criativo' | 'publico' | 'oferta' | 'saturacao' | 'pausar' | 'nao-escalar' | 'escalar' | 'ok';

export const ROTULO_ACAO: Record<Acao, { texto: string; cor: string }> = {
  'nao-mexer': { texto: 'Não mexer ainda', cor: 'slate' },
  criativo: { texto: 'Ajustar criativo', cor: 'amber' },
  publico: { texto: 'Ajustar público', cor: 'amber' },
  oferta: { texto: 'Alinhar oferta', cor: 'amber' },
  saturacao: { texto: 'Saturou', cor: 'red' },
  pausar: { texto: 'Avaliar pausa', cor: 'red' },
  'nao-escalar': { texto: 'Não escalar ainda', cor: 'slate' },
  escalar: { texto: 'Pronta para escalar', cor: 'green' },
  ok: { texto: 'Dentro do esperado', cor: 'green' },
};

export type Orientacao = { campanha: CampanhaRel; acao: Acao; porque: string[]; fazer: string[] };

const diasDesde = (iso: string | null) => (iso ? Math.floor((Date.parse(`${hojeISO()}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86400000) + 1 : null);

export const gerarOrientacoes = (rel: Relatorio, p: ParametrosPerformance, clienteId?: string): Orientacao[] => {
  const campanhas = rel.campanhas.filter((c) => c.m.gasto > 0);
  const cpmConta = rel.resumo.cpm;
  // Conversão (resultados ÷ cliques) média de cada tipo de resultado, para comparar campanhas do mesmo objetivo.
  const convPorTipo = new Map<string, { r: number; c: number; n: number }>();
  for (const c of campanhas) {
    if (!c.m.resultados || !c.m.cliquesLink) continue;
    const t = convPorTipo.get(c.m.tipoResultado) || { r: 0, c: 0, n: 0 };
    convPorTipo.set(c.m.tipoResultado, { r: t.r + c.m.resultados, c: t.c + c.m.cliquesLink, n: t.n + 1 });
  }
  return campanhas.map((c) => {
    const porque: string[] = [];
    const fazer: string[] = [];
    const dias = diasDesde(c.inicio);
    const rodando = Math.min(dias ?? Infinity, c.diasComGasto || Infinity);
    // 1. Quando NÃO mexer
    if (rodando < 3) return { campanha: c, acao: 'nao-mexer', porque: [`Rodando há ${rodando === Infinity ? 'pouco tempo' : `${rodando} dia${rodando > 1 ? 's' : ''}`}.`], fazer: ['Espere pelo menos 3 dias antes de avaliar.', 'Ansiedade não é critério.'] };
    if (c.aprendizado) return { campanha: c, acao: 'nao-mexer', porque: ['Ainda em fase de aprendizado na Meta.'], fazer: ['Não edite agora: qualquer mudança reinicia o aprendizado.', 'Não altere várias coisas ao mesmo tempo.'] };
    if (c.m.impressoes < p.impressoesParaClassificar) return { campanha: c, acao: 'nao-mexer', porque: [`Só ${formatar(c.m.impressoes, 'numero')} impressões no período.`], fazer: ['Orçamento baixo precisa de tempo para gerar dados.'] };

    const ctx = { clienteId, procedimento: c.procedimento, objetivo: c.objetivo, tipoResultado: c.m.tipoResultado };
    const ctr = ctrDe(c.m, c.objetivo).valor;
    const ctrBaixo = ctr !== null && ctr < p.ctrAtencao;
    const ctrAlto = ctr !== null && ctr >= p.ctrBom;
    const cpmAlto = c.m.cpm !== null && cpmConta !== null && c.m.cpm > cpmConta * 1.3;
    const custo = classificarCusto(c.m, p, ctx);
    const freqAlta = c.m.frequencia !== null && c.m.frequencia > p.freqAlta;
    const a = c.anterior;
    const queda = Boolean(a && ((a.ctrLink && c.m.ctrLink !== null && c.m.ctrLink < a.ctrLink * 0.85) || (a.custoPorResultado && c.m.custoPorResultado !== null && c.m.custoPorResultado > a.custoPorResultado * 1.2) || (a.resultados && c.m.resultados !== null && c.m.resultados < a.resultados * 0.8)));
    const media = convPorTipo.get(c.m.tipoResultado);
    const conv = c.m.resultados !== null && c.m.cliquesLink ? c.m.resultados / c.m.cliquesLink : null;
    const convMedia = media && media.n >= 2 && media.c ? media.r / media.c : null;
    const poucaConversao = conv !== null && convMedia !== null && conv < convMedia * 0.5;
    const instavel = c.variacaoCusto !== null && c.variacaoCusto >= 0.4;
    const fmtCpm = `CPM ${formatar(c.m.cpm, 'moeda')} (média da conta ${formatar(cpmConta, 'moeda')})`;
    // Trunca (não arredonda) para o texto não dizer “2,00%, abaixo de 2%”.
    const fmtCtr = `CTR ${formatar(ctr === null ? null : Math.floor(ctr * 100) / 100, 'pct')}`;

    // 2. Cruzamentos de métricas
    if (freqAlta && queda) {
      porque.push(`Frequência ${formatar(c.m.frequencia, 'decimal')} e resultado caindo em relação ao período anterior.`);
      fazer.push('Saturou: renove os criativos e o público.', 'Crie as variações separadas, sem mexer na original.');
      return { campanha: c, acao: 'saturacao', porque, fazer };
    }
    const foraDaMargem = c.m.custoPorResultado !== null && c.m.custoPorResultado > limitesPara(p, ctx).custoBom * 1.5;
    if (foraDaMargem && (ctrBaixo || freqAlta) && c.diasComGasto >= 5) {
      porque.push(`Custo por resultado ${formatar(c.m.custoPorResultado, 'moeda')}, fora da margem, com ${ctrBaixo ? fmtCtr.toLowerCase() + ' baixo' : 'frequência alta'}.`);
      fazer.push('Se o criativo já foi trocado e o público já foi testado e continua ruim: pause.', 'Se ainda não testou, troque primeiro o criativo e depois o público (um de cada vez).');
      return { campanha: c, acao: 'pausar', porque, fazer };
    }
    if (cpmAlto && ctrBaixo) {
      porque.push(`${fmtCpm} alto e ${fmtCtr} baixo.`);
      fazer.push('Caro e sem interesse: troque o criativo.');
      return { campanha: c, acao: 'criativo', porque, fazer };
    }
    if (ctrBaixo) {
      porque.push(`${fmtCtr}, abaixo de ${p.ctrAtencao}%. As pessoas veem mas não clicam.`);
      fazer.push('Ajuste o criativo (gancho, imagem, chamada).', 'Não altere público e criativo ao mesmo tempo.');
      return { campanha: c, acao: 'criativo', porque, fazer };
    }
    if (cpmAlto && ctrAlto) {
      porque.push(`${fmtCpm} alto, mas ${fmtCtr} bom.`);
      fazer.push('Anúncio bom, público caro: ajuste a segmentação.', 'Teste entre público aberto e segmentado.');
      return { campanha: c, acao: 'publico', porque, fazer };
    }
    if (ctrAlto && poucaConversao) {
      porque.push(`${fmtCtr} bom, mas só ${formatar(conv! * 100, 'pct')} dos cliques viram ${c.m.tipoResultado.toLowerCase()} (média das campanhas parecidas: ${formatar(convMedia! * 100, 'pct')}).`);
      fazer.push('A promessa não bate com a entrega: alinhe a oferta com o que aparece depois do clique.');
      return { campanha: c, acao: 'oferta', porque, fazer };
    }
    // 3. Escala
    if (instavel) {
      porque.push('O custo por resultado está variando muito de um dia para o outro.');
      fazer.push('Não escale ainda: espere ficar consistente.');
      return { campanha: c, acao: 'nao-escalar', porque, fazer };
    }
    const custoOk = custo.nivel === 'otimo' || custo.nivel === 'bom';
    if (custoOk && ctrAlto && c.diasComGasto >= 3 && c.variacaoCusto !== null) {
      porque.push(`Resultado consistente há ${c.diasComGasto} dias, custo dentro da meta (${formatar(c.m.custoPorResultado, 'moeda')}) e ${fmtCtr} saudável.`);
      fazer.push('Escala vertical: aumente até 20% e espere 24 a 48 horas.', 'Escala horizontal (mais segura): duplique e teste novo público ou criativo.', 'Não edite a campanha vencedora.');
      return { campanha: c, acao: 'escalar', porque, fazer };
    }
    porque.push(custoOk ? 'Custo e CTR dentro do esperado.' : 'Nenhum sinal claro de problema.');
    fazer.push('Acompanhe e não altere várias coisas ao mesmo tempo.');
    return { campanha: c, acao: 'ok', porque, fazer };
  });
};

// Distribuição do orçamento por papel da campanha, comparada com o modelo base.
export type Papel = 'principal' | 'perfil' | 'remarketing' | 'testes';
export const MODELO_DISTRIBUICAO: Record<Papel, { rotulo: string; pct: number }> = {
  principal: { rotulo: 'Principal (WhatsApp / conversão)', pct: 40 },
  perfil: { rotulo: 'Crescimento (perfil)', pct: 30 },
  remarketing: { rotulo: 'Remarketing', pct: 20 },
  testes: { rotulo: 'Testes', pct: 10 },
};
export const papelDa = (c: CampanhaRel): Papel => {
  if (/remarketing|rmkt|\brmk\b|retarget/i.test(c.nome)) return 'remarketing';
  if (/teste|\btest\b/i.test(c.nome)) return 'testes';
  if (/profile_visit|follow/.test(c.m.indicador) || c.m.visitasPerfil) return 'perfil';
  return 'principal';
};
export const distribuicao = (rel: Relatorio) => {
  const total = rel.campanhas.reduce((t, c) => t + c.m.gasto, 0);
  const porPapel = { principal: 0, perfil: 0, remarketing: 0, testes: 0 } as Record<Papel, number>;
  for (const c of rel.campanhas) porPapel[papelDa(c)] += c.m.gasto;
  return (Object.keys(MODELO_DISTRIBUICAO) as Papel[]).map((p) => ({ papel: p, ...MODELO_DISTRIBUICAO[p], gasto: porPapel[p], atual: total ? (porPapel[p] / total) * 100 : 0 }));
};

// Cruzamento de métricas (resumo para consulta rápida).
export const CRUZAMENTOS = [
  { se: 'CPM alto + CTR baixo', entao: 'Caro e sem interesse — troque o criativo.' },
  { se: 'CPM alto + CTR alto', entao: 'Anúncio bom, público caro — ajuste a segmentação.' },
  { se: 'CTR alto + pouca conversão', entao: 'A promessa não bate com a entrega — alinhe a oferta.' },
  { se: 'Muitas mensagens + pouca venda', entao: 'O tráfego funciona, mas o fechamento falha — melhore o atendimento.' },
  { se: 'Frequência alta + queda', entao: 'Saturou — renove criativos e público.' },
];

// Guia fixo de decisões da agência.
export const GUIA: Array<{ titulo: string; itens: string[]; nota?: string }> = [
  { titulo: 'Quando NÃO mexer', itens: ['Campanha rodando há menos de 3 dias', 'Campanha ainda em aprendizado', 'Orçamento baixo que precisa de tempo', 'Ansiedade não é critério', 'Não alterar várias coisas ao mesmo tempo'] },
  { titulo: 'Quando ajustar o criativo', itens: ['CTR baixo', 'Pessoas não clicando', 'CPM normal, mas ninguém interage', 'Frequência subindo e resultado caindo', 'Criativo já saturado'] },
  { titulo: 'Quando ajustar o público', itens: ['CPM muito alto', 'Público pequeno demais', 'Segmentação excessiva', 'Público muito amplo sem resultado', 'Teste entre aberto e segmentado'] },
  { titulo: 'Quando ajustar o orçamento', itens: ['Campanha está dando resultado consistente', 'Custo por resultado dentro do esperado', 'Não aumentar mais de 20% por vez', 'Não dobrar orçamento do nada', 'Escalar gradualmente'] },
  { titulo: 'Quando pausar a campanha', itens: ['Criativo já foi trocado e continua ruim', 'Público já foi testado e não performa', 'Frequência muito alta e resultado caiu', 'Custo por resultado fora da margem aceitável'] },
  { titulo: 'Quando mudar a estrutura da campanha', itens: ['Objetivo errado escolhido', 'Campanha de perfil tentando vender direto', 'Campanha de WhatsApp sem estrutura comercial', 'Público incompatível com o ticket', 'Orçamento incompatível com o objetivo'] },
  { titulo: 'Quando duplicar em vez de editar', itens: ['Campanha está performando bem', 'Evitar perder histórico', 'Criar variação sem mexer na original', 'Escalar com segurança'] },
  { titulo: 'Quando NÃO escalar', itens: ['Campanha com menos de 3 dias', 'Campanha inconsistente', 'Resultado variando muito', 'Custo por resultado instável', 'Campanha que ainda está em aprendizado'] },
  { titulo: 'Quando está pronta para escalar', itens: ['Resultado consistente por pelo menos 3 a 5 dias', 'Custo por resultado dentro da meta', 'CTR saudável', 'Público validado', 'Criativo validado'] },
  { titulo: 'Escala horizontal (mais segura)', itens: ['Duplicar campanha', 'Testar novo público', 'Testar nova segmentação', 'Testar novo criativo', 'Manter a campanha original intacta'] },
  { titulo: 'Escala vertical (aumentar orçamento)', itens: ['Aumentar até 20% por vez', 'Não dobrar orçamento do nada', 'Esperar 24 a 48 horas após o ajuste', 'Monitorar o impacto no CPM'] },
  { titulo: 'Quando NÃO mexer na campanha vencedora', itens: ['Não editar o criativo vencedor', 'Não mexer no público vencedor', 'Não alterar a estrutura', 'Criar variações separadas'] },
  { titulo: 'Erros comuns na escala', itens: ['Escalar por empolgação', 'Escalar sem margem financeira', 'Mexer em tudo ao mesmo tempo', 'Escalar campanha ruim', 'Não acompanhar as métricas após o aumento'] },
  { titulo: 'Estratégia de escala para clínica', itens: ['Escalar campanhas de WhatsApp com cuidado', 'Escalar campanhas de perfil para base constante', 'Não depender de uma única campanha', 'Criar previsibilidade'] },
  { titulo: '1. Nem toda campanha tem o mesmo objetivo', itens: ['Campanha de perfil → crescimento e base', 'Campanha de WhatsApp → conversão', 'Campanha de site → direcionamento', 'Remarketing → recuperação'] },
  { titulo: '2. Como dividir o orçamento inicial (estrutura base)', itens: ['40% para a campanha principal (WhatsApp ou conversão)', '30% para crescimento (perfil)', '20% para remarketing', '10% para testes'], nota: 'É um modelo base, não uma regra fixa.' },
  { titulo: '3. Quando ajustar a distribuição', itens: ['Quando o perfil está fraco', 'Quando precisa gerar mais lead imediato', 'Quando o remarketing está pequeno', 'Quando a campanha principal está saturando'] },
  { titulo: '4. Orçamento para quem está começando', itens: ['Começar pequeno', 'Não dividir demais um orçamento baixo', 'Priorizar a campanha principal', 'Testar antes de escalar'] },
  { titulo: '5. Orçamento para quem já está vendendo', itens: ['Manter base constante', 'Escalar a campanha vencedora', 'Criar verba separada para teste', 'Não mexer na campanha que paga as contas'] },
  { titulo: '6. Erros comuns na distribuição', itens: ['Colocar tudo em uma campanha', 'Tirar orçamento da campanha que está performando', 'Não reservar verba para teste', 'Aumentar orçamento por emoção'] },
];
