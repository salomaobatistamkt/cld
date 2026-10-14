import { describe, expect, it } from 'vitest';

import { diasAte } from 'src/utils/dias-ate.util';
import { formatarData } from 'src/utils/formatar-data.util';
import { valorMensal } from 'src/utils/valor-mensal.util';

const hoje = new Date(2026, 9, 14);

describe('datas e valores', () => {
  it('calcula dias até uma data (negativo quando já passou)', () => {
    expect(diasAte('2026-10-14', hoje)).toBe(0);
    expect(diasAte('2026-10-21', hoje)).toBe(7);
    expect(diasAte('2026-10-10', hoje)).toBe(-4);
  });

  it('formata datas curtas no ano corrente', () => {
    expect(formatarData('2026-03-05', hoje)).toBe('05/03');
    expect(formatarData('2027-01-02', hoje)).toBe('02/01/27');
    expect(formatarData(null, hoje)).toBe('—');
  });

  it('normaliza o valor do contrato para mensal e ignora projetos pontuais', () => {
    const valor = { amountMicros: 3_000_000_000, currencyCode: 'BRL' };
    expect(valorMensal(valor, 'MENSAL')).toBe(3000);
    expect(valorMensal(valor, 'TRIMESTRAL')).toBe(1000);
    expect(valorMensal(valor, 'ANUAL')).toBe(250);
    expect(valorMensal(valor, 'PONTUAL')).toBe(0);
    expect(valorMensal(null, 'MENSAL')).toBe(0);
  });
});
