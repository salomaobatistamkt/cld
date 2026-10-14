import { type NoMapa } from 'src/types/no-mapa';

export const encontrarPai = (raiz: NoMapa, id: string): NoMapa | null => {
  for (const filho of raiz.filhos) {
    if (filho.id === id) {
      return raiz;
    }
    const pai = encontrarPai(filho, id);
    if (pai) {
      return pai;
    }
  }
  return null;
};
