// Nomes de cidades em português (OurAirports traz em inglês).
export const PT = {
  "Lisbon": "Lisboa", "Rome": "Roma", "London": "Londres", "New York": "Nova York", "Montevideo": "Montevidéu",
  "Asunción": "Assunção", "Asuncion": "Assunção", "Mexico City": "Cidade do México", "Florence": "Florença", "Milan": "Milão",
  "Munich": "Munique", "Geneva": "Genebra", "Brussels": "Bruxelas", "Cape Town": "Cidade do Cabo", "Bogota": "Bogotá",
  "Cancun": "Cancún", "Seville": "Sevilha", "Athens": "Atenas", "Amsterdam": "Amsterdã", "Zurich": "Zurique", "Vienna": "Viena",
  "Prague": "Praga", "Istanbul": "Istambul", "Tokyo": "Tóquio", "Venice": "Veneza", "Naples": "Nápoles", "Edinburgh": "Edimburgo",
  "Copenhagen": "Copenhague", "Stockholm": "Estocolmo", "Berlin": "Berlim", "Warsaw": "Varsóvia", "Moscow": "Moscou",
  "Marrakesh": "Marrakech", "Rio De Janeiro": "Rio de Janeiro", "Buenos Aires (Ezeiza)": "Buenos Aires", "Panama City": "Cidade do Panamá",
  "Havana": "Havana", "Santo Domingo": "Santo Domingo", "Punta del Este": "Punta del Este", "Cordoba": "Córdoba", "Bariloche": "Bariloche",
  "San Carlos de Bariloche": "Bariloche", "Mendoza": "Mendoza", "Lyon": "Lyon", "Nice": "Nice", "Porto": "Porto", "Funchal": "Funchal",
  "Ponta Delgada": "Ponta Delgada", "Faro": "Faro", "Barcelona": "Barcelona", "Madrid": "Madri", "Paris": "Paris", "Washington": "Washington",
  "Philadelphia": "Filadélfia", "Toronto": "Toronto", "Montreal": "Montreal", "Seoul": "Seul", "Beijing": "Pequim", "Shanghai": "Xangai",
  "Doha": "Doha", "Jerusalem": "Jerusalém", "Tel Aviv": "Tel Aviv", "Johannesburg": "Joanesburgo", "Luanda": "Luanda", "Maputo": "Maputo",
  "Santa Cruz": "Santa Cruz de la Sierra", "Cusco": "Cusco", "Lima": "Lima", "Quito": "Quito", "Caracas": "Caracas",
};
export const ptCity = c => PT[c] ?? c;
// Aeroportos que ficam em município vizinho: mostramos a cidade que as pessoas procuram.
export const BY_IATA = {
  MVD: "Montevidéu", AEP: "Buenos Aires", EZE: "Buenos Aires", CNF: "Belo Horizonte", CWB: "Curitiba", ASU: "Assunção",
  LIM: "Lima", SCL: "Santiago", NAT: "Natal", GRU: "São Paulo", CGH: "São Paulo", GIG: "Rio de Janeiro", SDU: "Rio de Janeiro",
  REC: "Recife", JPA: "João Pessoa", VIX: "Vitória", FLN: "Florianópolis", POA: "Porto Alegre", SSA: "Salvador", BSB: "Brasília",
  JFK: "Nova York", EWR: "Nova York", LGA: "Nova York", MIA: "Miami", MCO: "Orlando", LHR: "Londres", LGW: "Londres",
  CDG: "Paris", ORY: "Paris", FCO: "Roma", MXP: "Milão", MAD: "Madri", BCN: "Barcelona", OPO: "Porto", LIS: "Lisboa",
  PUJ: "Punta Cana", CUN: "Cancún", BOG: "Bogotá", PTY: "Cidade do Panamá", MEX: "Cidade do México", COR: "Córdoba",
  BRC: "Bariloche", MDZ: "Mendoza", PDP: "Punta del Este", VVI: "Santa Cruz de la Sierra", CUZ: "Cusco",
};
