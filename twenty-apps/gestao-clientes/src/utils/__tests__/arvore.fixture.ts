import { type NoMapa } from 'src/types/no-mapa';

export const criarArvore = (): NoMapa => ({
  id: 'raiz',
  texto: 'Cliente X',
  filhos: [
    {
      id: 'a',
      texto: 'Tráfego',
      filhos: [
        { id: 'a1', texto: 'Criativos', filhos: [] },
        { id: 'a2', texto: 'Relatório', filhos: [] },
      ],
    },
    { id: 'b', texto: 'Site', filhos: [] },
  ],
});
