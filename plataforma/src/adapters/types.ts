// Contrato único que todo fornecedor de voos implementa.
// Para adicionar um fornecedor novo: criar um arquivo neste diretório e registrá-lo em index.ts.
export type FlightQuery = {
  origin: string;          // IATA
  destination: string;     // IATA
  depart: string;          // YYYY-MM-DD ou YYYY-MM (mês inteiro)
  ret?: string;            // YYYY-MM-DD ou YYYY-MM; ausente = só ida
  limit?: number;
};

export type FlightQuote = {
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string | null;
  price_cents: number;
  currency: string;
  fare_type: "ida_volta" | "trecho";
  includes_taxes: number | null;  // null = a fonte não confirma
  airline: string | null;
  transfers: number | null;
  source: string;
  source_link: string | null;   // link do parceiro (já com código de afiliado quando configurado)
  observed_at: string;           // quando a fonte registrou esse preço
};

export type AdapterStatus = {
  id: string;
  name: string;
  kind: "voo" | "hospedagem" | "carro" | "onibus";
  configured: boolean;
  mode: "real" | "pendente";
  detail: string;
};

export interface FlightAdapter {
  id: string;
  status(): AdapterStatus;
  search(q: FlightQuery): Promise<FlightQuote[]>;
}
