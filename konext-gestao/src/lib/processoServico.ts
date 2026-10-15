import { ocorrenciasDaRotina } from '../../server/recorrencia.mjs';

import { type Config, type Entrega, type ItemRotina, type ProcessoServico, type Servico } from './types';
import { hojeISO, novoId, somarDias } from './util';

export const processoDoTipo = (config: Config, tipo: string): ProcessoServico | null => config.processosServico?.[tipo] ?? null;

// Etapas do processo que ainda não viraram entrega deste serviço.
export const etapasPendentes = (servico: Servico, config: Config, entregas: Entrega[]) => {
  const processo = processoDoTipo(config, servico.tipo);
  if (!processo) return [];
  const feitas = new Set(entregas.filter((e) => e.servicoId === servico.id && e.modeloId).map((e) => e.modeloId));
  return processo.etapas.filter((etapa) => !feitas.has(etapa.id));
};

// Cria as entregas das etapas do processo, com prazo contado a partir do início do serviço.
export const entregasDoProcesso = (servico: Servico, config: Config, entregas: Entrega[]): Entrega[] => {
  const inicio = servico.inicio || hojeISO();
  return etapasPendentes(servico, config, entregas).map((etapa, indice) => ({
    id: novoId(),
    clienteId: servico.clienteId,
    servicoId: servico.id,
    titulo: etapa.titulo,
    descricao: [etapa.fase ? `Fase: ${etapa.fase}` : '', etapa.descricao].filter(Boolean).join('\n'),
    status: 'a_fazer',
    prioridade: 'media',
    prazo: somarDias(inicio, Math.max(0, etapa.dias || 0)),
    responsavel: '',
    link: '',
    entregueEm: '',
    ordem: Date.now() + indice,
    interna: etapa.interna,
    modeloId: etapa.id,
  }));
};

export type TarefaRotina = { id: string; data: string; hora: string; item: ItemRotina; servico: Servico };

export const tarefasDaRotina = (servicos: Servico[], config: Config, de: string, ate: string): TarefaRotina[] =>
  ocorrenciasDaRotina({ servicos, processos: config.processosServico ?? {}, de, ate });

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// "Toda seg e qui, 09:00" / "Todo mês, dias 10, 20 e 30, 10:00"
export const descreverRecorrencia = (item: ItemRotina) => {
  const lista = (partes: string[]) => (partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0] ?? '');
  const dias = [...item.dias].sort((a, b) => (item.quando === 'semanal' ? ((a + 6) % 7) - ((b + 6) % 7) : a - b));
  const quando =
    item.quando === 'semanal'
      ? `Toda ${lista(dias.map((d) => DIAS_SEMANA_CURTO[d]))}`
      : `Todo mês, dia${dias.length > 1 ? 's' : ''} ${lista(dias.map(String))}`;
  return item.hora ? `${quando}, ${item.hora}` : quando;
};
