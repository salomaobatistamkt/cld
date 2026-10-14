import { TEXTO_MAXIMO_VISIVEL } from 'src/constants/texto-maximo-visivel';

export const estimarLarguraNo = (texto: string, nivel: number): number => {
  const visivel = Math.min(texto.length, TEXTO_MAXIMO_VISIVEL);
  const porCaractere = nivel === 0 ? 8.6 : 7.4;
  const minimo = nivel === 0 ? 120 : 64;
  return Math.round(Math.max(minimo, visivel * porCaractere + 32));
};
