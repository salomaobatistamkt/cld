import { describe, expect, it } from 'vitest';

import { normalizarConteudoMapa } from 'src/utils/normalizar-conteudo-mapa.util';

describe('normalizarConteudoMapa', () => {
  it('cria um mapa novo com o título quando o conteúdo está vazio ou inválido', () => {
    for (const conteudo of [null, undefined, 42, 'não é json', []]) {
      const raiz = normalizarConteudoMapa(conteudo, 'Plano Q1');
      expect(raiz.texto).toBe('Plano Q1');
      expect(raiz.filhos).toEqual([]);
    }
  });

  it('aceita objeto ou string JSON e descarta filhos inválidos', () => {
    const arvore = {
      id: 'r',
      texto: 'Raiz',
      cor: 'blue',
      filhos: [{ id: 'f', texto: 'Filho', filhos: [] }, 'lixo', null],
    };
    const doObjeto = normalizarConteudoMapa(arvore, 'x');
    const daString = normalizarConteudoMapa(JSON.stringify(arvore), 'x');
    expect(doObjeto).toEqual(daString);
    expect(doObjeto.filhos).toHaveLength(1);
    expect(doObjeto.cor).toBe('blue');
  });

  it('gera ids para nós sem id e preserva o vínculo com registros', () => {
    const raiz = normalizarConteudoMapa(
      { texto: 'R', filhos: [{ texto: 'E', registro: { objeto: 'entrega', id: '1' } }] },
      'x',
    );
    expect(raiz.id).toBeTruthy();
    expect(raiz.filhos[0].id).not.toBe(raiz.id);
    expect(raiz.filhos[0].registro).toEqual({ objeto: 'entrega', id: '1' });
  });
});
