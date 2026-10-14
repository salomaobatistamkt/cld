import { type EstruturaModelo, type ModeloMapa } from 'src/types/modelo-mapa';
import { type NoMapa } from 'src/types/no-mapa';
import { gerarIdNo } from 'src/utils/gerar-id-no.util';

const instanciar = (estrutura: EstruturaModelo): NoMapa => ({
  id: gerarIdNo(),
  texto: estrutura.texto,
  filhos: (estrutura.filhos ?? []).map(instanciar),
});

export const instanciarModelo = (modelo: ModeloMapa, titulo: string): NoMapa => ({
  id: gerarIdNo(),
  texto: titulo,
  filhos: modelo.ramos.map(instanciar),
});
