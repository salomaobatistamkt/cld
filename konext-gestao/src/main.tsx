import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { iniciarSistema } from './lib/inicio';
import { useStore } from './lib/store';

// O Excalidraw busca as fontes a partir daqui (copiadas para /fonts no build).
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL('./', window.location.href).href;

// No servidor, a sessão pode expirar: pede a senha de novo por cima da tela.
window.addEventListener('konext:sessao-expirada', () => useStore.setState({ precisaEntrar: true }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

iniciarSistema();
