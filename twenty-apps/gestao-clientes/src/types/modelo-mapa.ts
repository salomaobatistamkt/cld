export type EstruturaModelo = { texto: string; filhos?: EstruturaModelo[] };

export type ModeloMapa = {
  nome: string;
  descricao: string;
  ramos: EstruturaModelo[];
};
