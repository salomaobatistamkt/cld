// Nó de um mapa mental. `registro` liga o nó a um registro do CRM
// (ex.: a entrega criada a partir dele, ou o serviço no mapa do cliente).
export type NoMapa = {
  id: string;
  texto: string;
  cor?: string;
  recolhido?: boolean;
  registro?: { objeto: string; id: string };
  filhos: NoMapa[];
};
