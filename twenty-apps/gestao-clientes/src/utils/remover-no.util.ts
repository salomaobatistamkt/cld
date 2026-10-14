import { type NoMapa } from 'src/types/no-mapa';

// A ideia central nunca é removida.
export const removerNo = (raiz: NoMapa, id: string): NoMapa => {
  if (!raiz.filhos.some((filho) => filho.id === id)) {
    let mudou = false;
    const filhos = raiz.filhos.map((filho) => {
      const novo = removerNo(filho, id);
      if (novo !== filho) {
        mudou = true;
      }
      return novo;
    });
    return mudou ? { ...raiz, filhos } : raiz;
  }
  return { ...raiz, filhos: raiz.filhos.filter((filho) => filho.id !== id) };
};
