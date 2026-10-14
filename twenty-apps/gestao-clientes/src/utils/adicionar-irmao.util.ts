import { type NoMapa } from 'src/types/no-mapa';
import { adicionarFilho } from 'src/utils/adicionar-filho.util';
import { atualizarNo } from 'src/utils/atualizar-no.util';
import { encontrarPai } from 'src/utils/encontrar-pai.util';

// Insere `novo` logo depois de `irmaoId`. Na ideia central (sem pai) vira filho.
export const adicionarIrmao = (
  raiz: NoMapa,
  irmaoId: string,
  novo: NoMapa,
): NoMapa => {
  const pai = encontrarPai(raiz, irmaoId);
  if (!pai) {
    return adicionarFilho(raiz, irmaoId, novo);
  }
  return atualizarNo(raiz, pai.id, (no) => {
    const indice = no.filhos.findIndex((filho) => filho.id === irmaoId);
    const filhos = [...no.filhos];
    filhos.splice(indice + 1, 0, novo);
    return { ...no, filhos };
  });
};
