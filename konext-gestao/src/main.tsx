import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { iniciarSistema } from './lib/inicio';
import { useStore } from './lib/store';
import { Portal } from './views/desempenho/Portal';

// O Excalidraw busca as fontes a partir daqui (copiadas para /fonts no build).
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL('./', window.location.href).href;

// No servidor, a sessão pode expirar: pede a senha de novo por cima da tela.
window.addEventListener('konext:sessao-expirada', () => useStore.setState({ precisaEntrar: true }));

// Portal de resultados do cliente (/resultados/<token>): página pública, sem o sistema.
const portal = window.location.pathname.match(/^\/resultados\/([\w-]{20,64})\/?$/);

createRoot(document.getElementById('root')!).render(<StrictMode>{portal ? <Portal token={portal[1]} /> : <App />}</StrictMode>);

if (!portal) iniciarSistema();
