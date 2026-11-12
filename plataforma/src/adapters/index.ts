import type { Env } from "../lib/util";
import type { AdapterStatus, FlightAdapter } from "./types";
import { travelpayouts } from "./travelpayouts";

/** Fontes de voo ativas, em ordem de preferência. */
export function flightAdapters(env: Env): FlightAdapter[] {
  return [travelpayouts(env)];
}

/** Status de todas as integrações, inclusive as que ainda não existem em código (pendentes). */
export function integrationStatus(env: Env): AdapterStatus[] {
  return [
    ...flightAdapters(env).map(a => a.status()),
    { id: "duffel", name: "Duffel · confirmação em tempo real", kind: "voo", configured: false, mode: "pendente",
      detail: "Fase futura. Cobra por pedido emitido e por busca acima da proporção 1.500:1. Verificar cobertura de GOL, Azul e LATAM antes de contratar." },
    { id: "booking", name: "Booking.com · hospedagem", kind: "hospedagem", configured: false, mode: "pendente",
      detail: "MVP usa link de busca com ID de afiliado (cadastre em Parceiros). Disponibilidade e preço por API exigem parceria aprovada." },
    { id: "rentcars", name: "Rentcars · locação de veículos (Awin)", kind: "carro", configured: false, mode: "pendente",
      detail: "Link de afiliado gerado no painel da Awin. Sem API de preços no MVP." },
    { id: "clickbus", name: "Passagens rodoviárias", kind: "onibus", configured: false, mode: "pendente",
      detail: "Nenhum programa de afiliados público encontrado (ClickBus). Requer contato comercial." },
  ];
}
