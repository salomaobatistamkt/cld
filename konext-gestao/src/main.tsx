import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { criarBackendServidor, detectarServidor } from './lib/backend';
import { criarBackendPadrao, useStore } from './lib/store';

// O Excalidraw busca as fontes a partir daqui (copiadas para /fonts no build).
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL('./', window.location.href).href;

const iniciar = async () => {
  const servidor = await detectarServidor();
  try {
    await useStore.getState().iniciar(servidor ? criarBackendServidor() : criarBackendPadrao());
  } catch (falha) {
    console.error(falha);
    if (!servidor) return;
    // Servidor fora do ar: abre com os dados deste navegador para não travar.
    await useStore.getState().iniciar(criarBackendPadrao());
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

iniciar();
