import { CORES_RAMOS } from 'src/constants/cores-ramos';
import { type LayoutMapa } from 'src/types/layout-mapa';
import { type NoMapa } from 'src/types/no-mapa';
import { type NoPosicionado } from 'src/types/no-posicionado';
import { estimarLarguraNo } from 'src/utils/estimar-largura-no.util';

const ALTURA_NO = 34;
const ALTURA_RAIZ = 46;
const ESPACO_VERTICAL = 12;
const ESPACO_HORIZONTAL = 64;
const MARGEM = 32;

const alturaDoNo = (nivel: number) => (nivel === 0 ? ALTURA_RAIZ : ALTURA_NO);

const filhosVisiveis = (no: NoMapa) => (no.recolhido ? [] : no.filhos);

const alturaDaSubarvore = (
  no: NoMapa,
  nivel: number,
  cache: Map<string, number>,
): number => {
  const filhos = filhosVisiveis(no);
  const somaFilhos =
    filhos.reduce(
      (soma, filho) => soma + alturaDaSubarvore(filho, nivel + 1, cache),
      0,
    ) +
    Math.max(0, filhos.length - 1) * ESPACO_VERTICAL;
  const altura = Math.max(alturaDoNo(nivel), somaFilhos);
  cache.set(no.id, altura);
  return altura;
};

// Árvore horizontal: ideia central à esquerda, ramos crescendo para a direita.
// Cada ramo de primeiro nível ganha uma cor, herdada pelos descendentes.
export const calcularLayoutMapa = (raiz: NoMapa): LayoutMapa => {
  const cache = new Map<string, number>();
  alturaDaSubarvore(raiz, 0, cache);
  const nos: NoPosicionado[] = [];

  const posicionar = (
    no: NoMapa,
    nivel: number,
    x: number,
    topo: number,
    corHerdada: string,
    paiId: string | null,
  ) => {
    const alturaSubarvore = cache.get(no.id) ?? alturaDoNo(nivel);
    const altura = alturaDoNo(nivel);
    const largura = estimarLarguraNo(no.texto, nivel);
    const cor = no.cor ?? corHerdada;
    nos.push({
      no,
      x,
      y: topo + alturaSubarvore / 2 - altura / 2,
      largura,
      altura,
      nivel,
      cor,
      paiId,
      temFilhosOcultos: Boolean(no.recolhido) && no.filhos.length > 0,
    });

    const filhos = filhosVisiveis(no);
    const somaFilhos =
      filhos.reduce((soma, filho) => soma + (cache.get(filho.id) ?? 0), 0) +
      Math.max(0, filhos.length - 1) * ESPACO_VERTICAL;
    let cursor = topo + (alturaSubarvore - somaFilhos) / 2;
    filhos.forEach((filho, indice) => {
      const corFilho =
        nivel === 0 ? CORES_RAMOS[indice % CORES_RAMOS.length] : cor;
      posicionar(
        filho,
        nivel + 1,
        x + largura + ESPACO_HORIZONTAL,
        cursor,
        corFilho,
        no.id,
      );
      cursor += (cache.get(filho.id) ?? 0) + ESPACO_VERTICAL;
    });
  };

  posicionar(raiz, 0, MARGEM, MARGEM, 'gray', null);

  const largura =
    Math.max(...nos.map((posicionado) => posicionado.x + posicionado.largura)) +
    MARGEM;
  const altura = (cache.get(raiz.id) ?? ALTURA_RAIZ) + MARGEM * 2;

  return { nos, largura, altura };
};
