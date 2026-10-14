import { type NoMapa } from 'src/types/no-mapa';
import { atualizarNo } from 'src/utils/atualizar-no.util';
import { encontrarPai } from 'src/utils/encontrar-pai.util';

// Move o nó uma posição para cima (-1) ou para baixo (+1) entre os irmãos.
export const moverNo = (raiz: NoMapa, id: string, direcao: -1 | 1): NoMapa => {
  const pai = encontrarPai(raiz, id);
  if (!pai) {
    return raiz;
  }
  const indice = pai.filhos.findIndex((filho) => filho.id === id);
  const destino = indice + direcao;
  if (destino < 0 || destino >= pai.filhos.length) {
    return raiz;
  }
  return atualizarNo(raiz, pai.id, (no) => {
    const filhos = [...no.filhos];
    [filhos[indice], filhos[destino]] = [filhos[destino], filhos[indice]];
    return { ...no, filhos };
  });
};
