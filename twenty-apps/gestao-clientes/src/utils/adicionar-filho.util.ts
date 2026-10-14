import { type NoMapa } from 'src/types/no-mapa';
import { atualizarNo } from 'src/utils/atualizar-no.util';

export const adicionarFilho = (
  raiz: NoMapa,
  paiId: string,
  novo: NoMapa,
): NoMapa =>
  atualizarNo(raiz, paiId, (pai) => ({
    ...pai,
    recolhido: false,
    filhos: [...pai.filhos, novo],
  }));
