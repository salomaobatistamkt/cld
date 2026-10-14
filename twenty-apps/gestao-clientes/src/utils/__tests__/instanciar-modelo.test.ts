import { describe, expect, it } from 'vitest';

import { MODELOS_MAPA } from 'src/constants/modelos-mapa';
import { type NoMapa } from 'src/types/no-mapa';
import { instanciarModelo } from 'src/utils/instanciar-modelo.util';

const coletarIds = (no: NoMapa): string[] => [no.id, ...no.filhos.flatMap(coletarIds)];

describe('instanciarModelo', () => {
  it('cria a árvore do modelo com ids únicos e o título dado', () => {
    for (const modelo of MODELOS_MAPA) {
      const raiz = instanciarModelo(modelo, 'Meu plano');
      const ids = coletarIds(raiz);
      expect(raiz.texto).toBe('Meu plano');
      expect(raiz.filhos).toHaveLength(modelo.ramos.length);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
