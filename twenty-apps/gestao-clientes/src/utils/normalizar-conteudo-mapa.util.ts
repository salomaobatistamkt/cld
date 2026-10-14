import { type NoMapa } from 'src/types/no-mapa';
import { gerarIdNo } from 'src/utils/gerar-id-no.util';

const normalizarNo = (valor: unknown, profundidade: number): NoMapa | null => {
  if (
    profundidade > 50 ||
    typeof valor !== 'object' ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return null;
  }
  const bruto = valor as Record<string, unknown>;
  const filhos = Array.isArray(bruto.filhos)
    ? bruto.filhos
        .map((filho) => normalizarNo(filho, profundidade + 1))
        .filter((filho): filho is NoMapa => filho !== null)
    : [];
  const registro =
    typeof bruto.registro === 'object' &&
    bruto.registro !== null &&
    typeof (bruto.registro as Record<string, unknown>).objeto === 'string' &&
    typeof (bruto.registro as Record<string, unknown>).id === 'string'
      ? (bruto.registro as { objeto: string; id: string })
      : undefined;

  return {
    id: typeof bruto.id === 'string' && bruto.id ? bruto.id : gerarIdNo(),
    texto: typeof bruto.texto === 'string' ? bruto.texto : '',
    ...(typeof bruto.cor === 'string' ? { cor: bruto.cor } : {}),
    ...(bruto.recolhido === true ? { recolhido: true } : {}),
    ...(registro ? { registro } : {}),
    filhos,
  };
};

// Lê o campo RAW_JSON `conteudo` com segurança: qualquer valor inválido vira
// um mapa novo com só a ideia central.
export const normalizarConteudoMapa = (
  conteudo: unknown,
  tituloPadrao: string,
): NoMapa => {
  const valor =
    typeof conteudo === 'string'
      ? (() => {
          try {
            return JSON.parse(conteudo) as unknown;
          } catch {
            return null;
          }
        })()
      : conteudo;

  return (
    normalizarNo(valor, 0) ?? {
      id: gerarIdNo(),
      texto: tituloPadrao || 'Ideia central',
      filhos: [],
    }
  );
};
