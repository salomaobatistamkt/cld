import { type NoMapa } from 'src/types/no-mapa';

export type NoPosicionado = {
  no: NoMapa;
  x: number;
  y: number;
  largura: number;
  altura: number;
  nivel: number;
  cor: string;
  paiId: string | null;
  temFilhosOcultos: boolean;
};
