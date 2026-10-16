import { describe, expect, it } from 'vitest';

import { type Derivadas, PARAMETROS_PADRAO } from './metricas';
import { classificarCtr, classificarCusto, classificarFrequencia, classificarVolume, gerarAlertas, limitesPara, parametrosCom } from './performance';

const m = (parcial: Partial<Derivadas>): Derivadas => ({
  gasto: 100, impressoes: 5000, alcance: 3000, frequencia: 1.6, cpm: 20, cliques: 200, ctrTodos: 4, cliquesLink: 150, ctrLink: 3, cpcLink: 0.66,
  cliquesSaida: null, ctrSaida: null, cpcSaida: null, resultados: 20, tipoResultado: 'Conversas iniciadas', indicador: 'x', custoPorResultado: 5,
  resultadosPorTipo: {}, visitasPerfil: null, fonteVisitas: '', custoVisita: null, seguidores: null, fonteSeguidores: '', custoSeguidor: null,
  video: { reproducoes: null, v3s: null, thruplay: null, p25: null, p50: null, p75: null, p95: null, p100: null, s30: null, tempoMedio: null, custoThruplay: null, custoV3s: null },
  ...parcial,
});
const p = parametrosCom(null);

describe('CTR', () => {
  it('segue as faixas configuradas', () => {
    expect(classificarCtr(m({ ctrLink: 12 }), p).nivel).toBe('otimo');
    expect(classificarCtr(m({ ctrLink: 12 }), p).explicacao).toMatch(/qualidade/);
    expect(classificarCtr(m({ ctrLink: 5 }), p).nivel).toBe('otimo');
    expect(classificarCtr(m({ ctrLink: 3 }), p).nivel).toBe('bom');
    expect(classificarCtr(m({ ctrLink: 2.5 }), p).nivel).toBe('atencao');
    expect(classificarCtr(m({ ctrLink: 1.9 }), p).nivel).toBe('alerta');
  });
  it('não classifica com poucas impressões', () => {
    expect(classificarCtr(m({ ctrLink: 0.5, impressoes: 300 }), p).nivel).toBe('insuficiente');
  });
  it('usa o CTR de saída em tráfego quando existe', () => {
    expect(classificarCtr(m({ ctrLink: 6, ctrSaida: 1 }), p, { objetivo: 'OUTCOME_TRAFFIC' }).explicacao).toMatch(/CTR de saída/);
  });
});

describe('Custo por resultado', () => {
  it('ótimo até 5, bom até 10, atenção acima', () => {
    expect(classificarCusto(m({ custoPorResultado: 5 }), p).nivel).toBe('otimo');
    expect(classificarCusto(m({ custoPorResultado: 9.99 }), p).nivel).toBe('bom');
    expect(classificarCusto(m({ custoPorResultado: 10.01 }), p).nivel).toBe('atencao');
  });
  it('avisa que resultado barato não é venda', () => {
    expect(classificarCusto(m({ custoPorResultado: 2 }), p).explicacao).toMatch(/não significa venda/);
  });
  it('regra mais específica vence', () => {
    const q = parametrosCom({ ...PARAMETROS_PADRAO, regras: [{ id: '1', procedimento: 'Botox', custoOtimo: 20, custoBom: 40 }, { id: '2', procedimento: 'Botox', clienteId: 'c1', custoOtimo: 30 }] });
    expect(limitesPara(q, { procedimento: 'botox' }).custoOtimo).toBe(20);
    expect(limitesPara(q, { procedimento: 'Botox', clienteId: 'c1' }).custoOtimo).toBe(30);
    expect(classificarCusto(m({ custoPorResultado: 15 }), q, { procedimento: 'Botox' }).nivel).toBe('otimo');
    expect(classificarCusto(m({ custoPorResultado: 15 }), q, { procedimento: 'Preenchimento' }).nivel).toBe('atencao');
  });
});

describe('Volume e frequência', () => {
  it('volume limitado não é resultado ruim', () => {
    expect(classificarVolume(800, 1000, 'impressões').nivel).toBe('info');
    expect(classificarVolume(1500, 1000, 'alcance').nivel).toBe('bom');
    expect(classificarVolume(null, 1000, 'alcance').nivel).toBe('insuficiente');
  });
  it('frequência alta pede avaliação, não é ruim por si só', () => {
    expect(classificarFrequencia(m({ frequencia: 0.8 }), p).nivel).toBe('info');
    expect(classificarFrequencia(m({ frequencia: 1.2 }), p).nivel).toBe('info');
    expect(classificarFrequencia(m({ frequencia: 1.8 }), p).nivel).toBe('bom');
    const alta = classificarFrequencia(m({ frequencia: 3 }), p);
    expect(alta.nivel).toBe('atencao');
    expect(alta.explicacao).toMatch(/lembrança de marca/);
  });
});

describe('Alertas', () => {
  const camp = (id: string, parcial: Partial<Derivadas>) => ({ id, nome: id, procedimento: '', status: 'ativa', objetivo: '', orcamentoDiario: null, orcamentoTotal: null, m: m(parcial), inicio: null, aprendizado: false, diasComGasto: 7, variacaoCusto: 0.1, anterior: null });
  it('poucas impressões: só pede para aguardar', () => {
    const a = gerarAlertas([camp('nova', { impressoes: 200, ctrLink: 0.3, custoPorResultado: 50 })], p);
    expect(a).toHaveLength(1);
    expect(a[0].nivel).toBe('info');
  });
  it('não sugere orçamento sem estabilidade', () => {
    const a = gerarAlertas([camp('boa', { ctrLink: 6, custoPorResultado: 3 })], p);
    expect(a[0].texto).toMatch(/confirmar a estabilidade/);
    const ant = new Map([['boa', m({ custoPorResultado: 3.2 })]]);
    expect(gerarAlertas([camp('boa', { ctrLink: 6, custoPorResultado: 3 })], p, undefined, ant)[0].texto).toMatch(/aumento gradual/);
  });
});
