import { type NoMapa } from 'src/types/no-mapa';

// Devolve uma nova árvore com `alterar` aplicado ao nó `id` (imutável).
export const atualizarNo = (
  raiz: NoMapa,
  id: string,
  alterar: (no: NoMapa) => NoMapa,
): NoMapa => {
  if (raiz.id === id) {
    return alterar(raiz);
  }
  let mudou = false;
  const filhos = raiz.filhos.map((filho) => {
    const novo = atualizarNo(filho, id, alterar);
    if (novo !== filho) {
      mudou = true;
    }
    return novo;
  });
  return mudou ? { ...raiz, filhos } : raiz;
};
