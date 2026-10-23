import Head from 'next/head';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Dueto CaCau · Gestão</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Gestão da confeitaria Dueto CaCau: receitas, precificação, pedidos e tarefas." />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
