// Regra única da rotina, usada pelo servidor (avisos ao n8n) e pela tela Rotina.
// Nada é gravado com antecedência: as tarefas de cada dia são calculadas a partir
// dos serviços ativos e do processo de cada tipo de serviço. Só o "feito" é gravado.

const doisDigitos = (n) => String(n).padStart(2, '0');

export const isoDaData = (data) => `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}-${doisDigitos(data.getUTCDate())}`;

const dataUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};

export const somarDiasISO = (iso, dias) => {
  const data = dataUTC(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return isoDaData(data);
};

const ultimoDiaDoMes = (data) => new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();

// O item da rotina cai nesta data? Semanal: dia da semana (0 = domingo).
// Mensal: dia do mês; dia 30/31 em mês mais curto cai no último dia.
export const caiNoDia = (item, iso) => {
  const data = dataUTC(iso);
  if (item.quando === 'semanal') return item.dias.includes(data.getUTCDay());
  const dia = data.getUTCDate();
  const ultimo = ultimoDiaDoMes(data);
  return item.dias.some((d) => d === dia || (d > ultimo && dia === ultimo));
};

export const idOcorrencia = (servicoId, itemId, iso) => `${servicoId}~${itemId}~${iso}`;

// Tarefas da rotina entre duas datas (AAAA-MM-DD, inclusive), ordenadas por dia e hora.
export const ocorrenciasDaRotina = ({ servicos, processos, de, ate }) => {
  const lista = [];
  const ativos = servicos.filter((s) => s.status === 'ativo' && processos?.[s.tipo]?.rotina?.length);
  for (let dia = de; dia <= ate; dia = somarDiasISO(dia, 1)) {
    for (const servico of ativos) {
      if (servico.inicio && dia < servico.inicio) continue;
      for (const item of processos[servico.tipo].rotina) {
        if (!item.dias?.length || !caiNoDia(item, dia)) continue;
        lista.push({ id: idOcorrencia(servico.id, item.id, dia), data: dia, hora: item.hora || '', item, servico });
      }
    }
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '99').localeCompare(b.hora || '99'));
};
