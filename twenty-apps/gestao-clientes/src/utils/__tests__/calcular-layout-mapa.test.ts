import { describe, expect, it } from 'vitest';

import { atualizarNo } from 'src/utils/atualizar-no.util';
import { calcularLayoutMapa } from 'src/utils/calcular-layout-mapa.util';
import { criarArvore } from 'src/utils/__tests__/arvore.fixture';

describe('calcularLayoutMapa', () => {
  it('posiciona cada nível à direita do pai e sem sobreposição vertical', () => {
    const { nos, largura, altura } = calcularLayoutMapa(criarArvore());
    const porId = new Map(nos.map((no) => [no.no.id, no]));
    const raiz = porId.get('raiz')!;
    const a = porId.get('a')!;
    const a1 = porId.get('a1')!;
    const a2 = porId.get('a2')!;

    expect(nos).toHaveLength(5);
    expect(a.x).toBeGreaterThan(raiz.x + raiz.largura);
    expect(a1.x).toBeGreaterThan(a.x + a.largura);
    expect(a2.y).toBeGreaterThanOrEqual(a1.y + a1.altura);
    expect(largura).toBeGreaterThan(a1.x + a1.largura);
    expect(altura).toBeGreaterThan(a2.y + a2.altura);
  });

  it('dá uma cor para cada ramo e os descendentes herdam', () => {
    const { nos } = calcularLayoutMapa(criarArvore());
    const cor = (id: string) => nos.find((no) => no.no.id === id)?.cor;
    expect(cor('a')).not.toBe(cor('b'));
    expect(cor('a1')).toBe(cor('a'));
  });

  it('esconde os filhos de um nó recolhido e sinaliza isso', () => {
    const raiz = atualizarNo(criarArvore(), 'a', (no) => ({ ...no, recolhido: true }));
    const { nos } = calcularLayoutMapa(raiz);
    expect(nos.map((no) => no.no.id)).toEqual(['raiz', 'a', 'b']);
    expect(nos.find((no) => no.no.id === 'a')?.temFilhosOcultos).toBe(true);
  });
});
