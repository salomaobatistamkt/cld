// Registra a Nunito (latim) antes de converter modelos, para o Excalidraw medir
// os textos com a fonte certa e não cortar títulos.
let carregando: Promise<void> | null = null;

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

export const prepararFontes = () => {
  if (!carregando) {
    carregando = (async () => {
      try {
        const url = new URL('./fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2', window.location.href).href;
        const face = new FontFace('Nunito', `url(${url})`, { unicodeRange: LATIN, weight: '500' });
        document.fonts.add(await face.load());
      } catch {
        // Sem a fonte, o Excalidraw usa a reserva; o quadro continua funcionando.
      }
    })();
  }
  return carregando;
};
