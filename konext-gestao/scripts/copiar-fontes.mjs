// Copia as fontes do Excalidraw para public/fonts (sem a Xiaolai, de 13 MB, só para chinês).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const origem = 'node_modules/@excalidraw/excalidraw/dist/prod/fonts';
const destino = 'public/fonts';
if (!existsSync(origem)) process.exit(0);
mkdirSync(destino, { recursive: true });
for (const pasta of readdirSync(origem)) {
  if (pasta === 'Xiaolai') continue;
  cpSync(join(origem, pasta), join(destino, pasta), { recursive: true });
}
