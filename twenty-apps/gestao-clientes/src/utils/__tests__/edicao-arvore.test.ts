import { describe, expect, it } from 'vitest';

import { adicionarFilho } from 'src/utils/adicionar-filho.util';
import { adicionarIrmao } from 'src/utils/adicionar-irmao.util';
import { atualizarNo } from 'src/utils/atualizar-no.util';
import { encontrarNo } from 'src/utils/encontrar-no.util';
import { encontrarPai } from 'src/utils/encontrar-pai.util';
import { moverNo } from 'src/utils/mover-no.util';
import { removerNo } from 'src/utils/remover-no.util';
import { criarArvore } from 'src/utils/__tests__/arvore.fixture';

const novo = (id: string) => ({ id, texto: id, filhos: [] });

describe('edição da árvore do mapa', () => {
  it('atualiza só o nó pedido e preserva os demais por referência', () => {
    const raiz = criarArvore();
    const proxima = atualizarNo(raiz, 'a1', (no) => ({ ...no, texto: 'Vídeos' }));
    expect(encontrarNo(proxima, 'a1')?.texto).toBe('Vídeos');
    expect(proxima.filhos[1]).toBe(raiz.filhos[1]);
    expect(raiz.filhos[0].filhos[0].texto).toBe('Criativos');
  });

  it('devolve a mesma árvore quando o id não existe', () => {
    const raiz = criarArvore();
    expect(atualizarNo(raiz, 'nao-existe', (no) => no)).toBe(raiz);
  });

  it('adiciona filho no fim e expande o pai recolhido', () => {
    const raiz = atualizarNo(criarArvore(), 'a', (no) => ({ ...no, recolhido: true }));
    const proxima = adicionarFilho(raiz, 'a', novo('a3'));
    const pai = encontrarNo(proxima, 'a');
    expect(pai?.filhos.map((filho) => filho.id)).toEqual(['a1', 'a2', 'a3']);
    expect(pai?.recolhido).toBe(false);
  });

  it('adiciona irmão logo depois do nó; na raiz vira filho', () => {
    const proxima = adicionarIrmao(criarArvore(), 'a1', novo('x'));
    expect(encontrarNo(proxima, 'a')?.filhos.map((filho) => filho.id)).toEqual(['a1', 'x', 'a2']);
    const naRaiz = adicionarIrmao(criarArvore(), 'raiz', novo('y'));
    expect(naRaiz.filhos.map((filho) => filho.id)).toEqual(['a', 'b', 'y']);
  });

  it('remove o nó com a subárvore, mas nunca a raiz', () => {
    const proxima = removerNo(criarArvore(), 'a');
    expect(proxima.filhos.map((filho) => filho.id)).toEqual(['b']);
    expect(encontrarNo(proxima, 'a1')).toBeNull();
    const raiz = criarArvore();
    expect(removerNo(raiz, 'raiz')).toBe(raiz);
  });

  it('move entre irmãos e ignora movimentos para fora da lista', () => {
    const raiz = criarArvore();
    expect(moverNo(raiz, 'a2', -1).filhos[0].filhos.map((filho) => filho.id)).toEqual(['a2', 'a1']);
    expect(moverNo(raiz, 'a1', -1)).toBe(raiz);
    expect(moverNo(raiz, 'raiz', 1)).toBe(raiz);
  });

  it('encontra o pai de um nó', () => {
    expect(encontrarPai(criarArvore(), 'a2')?.id).toBe('a');
    expect(encontrarPai(criarArvore(), 'raiz')).toBeNull();
  });
});
