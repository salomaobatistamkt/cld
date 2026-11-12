// DDD → unidade federativa (plano de numeração da Anatel).
// ATENÇÃO: é só uma indicação inicial de origem provável. Nunca trate como localização atual.
const MAP: Record<string, string> = {};
const add = (uf: string, ...ddds: number[]) => ddds.forEach(d => (MAP[String(d)] = "BR-" + uf));

add("SP", 11, 12, 13, 14, 15, 16, 17, 18, 19);
add("RJ", 21, 22, 24);
add("ES", 27, 28);
add("MG", 31, 32, 33, 34, 35, 37, 38);
add("PR", 41, 42, 43, 44, 45, 46);
add("SC", 47, 48, 49);
add("RS", 51, 53, 54, 55);
add("DF", 61);
add("GO", 62, 64);
add("TO", 63);
add("MT", 65, 66);
add("MS", 67);
add("AC", 68);
add("RO", 69);
add("BA", 71, 73, 74, 75, 77);
add("SE", 79);
add("PE", 81, 87);
add("AL", 82);
add("PB", 83);
add("RN", 84);
add("CE", 85, 88);
add("PI", 86, 89);
add("PA", 91, 93, 94);
add("AM", 92, 97);
add("RR", 95);
add("AP", 96);
add("MA", 98, 99);

/** Extrai o DDD de um telefone brasileiro (aceita +55, espaços, parênteses). */
export function dddFromPhone(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  const ddd = d.slice(0, 2);
  return MAP[ddd] ? ddd : null;
}

export const regionFromDdd = (ddd: string | null) => (ddd ? MAP[ddd] ?? null : null);
