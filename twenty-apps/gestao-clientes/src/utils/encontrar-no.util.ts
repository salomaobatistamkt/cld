import { type NoMapa } from 'src/types/no-mapa';

export const encontrarNo = (raiz: NoMapa, id: string): NoMapa | null => {
  if (raiz.id === id) {
    return raiz;
  }
  for (const filho of raiz.filhos) {
    const encontrado = encontrarNo(filho, id);
    if (encontrado) {
      return encontrado;
    }
  }
  return null;
};
