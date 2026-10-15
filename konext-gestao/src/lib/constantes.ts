import { type Prioridade, type Recorrencia, type StatusCliente, type StatusEntrega, type StatusServico } from './types';

export type Rotulo = { label: string; cor: string };

export const STATUS_CLIENTE: Record<StatusCliente, Rotulo> = {
  lead: { label: 'Lead', cor: 'slate' },
  onboarding: { label: 'Onboarding', cor: 'sky' },
  ativo: { label: 'Ativo', cor: 'green' },
  pausado: { label: 'Pausado', cor: 'amber' },
  encerrado: { label: 'Encerrado', cor: 'red' },
};

export const STATUS_SERVICO: Record<StatusServico, Rotulo> = {
  proposta: { label: 'Proposta', cor: 'slate' },
  ativo: { label: 'Ativo', cor: 'green' },
  pausado: { label: 'Pausado', cor: 'amber' },
  encerrado: { label: 'Encerrado', cor: 'red' },
};

export const STATUS_ENTREGA: Record<StatusEntrega, Rotulo> = {
  backlog: { label: 'Ideias / backlog', cor: 'slate' },
  a_fazer: { label: 'A fazer', cor: 'sky' },
  produzindo: { label: 'Produzindo', cor: 'blue' },
  revisao: { label: 'Em revisão', cor: 'violet' },
  aguardando_cliente: { label: 'Aguardando cliente', cor: 'amber' },
  entregue: { label: 'Entregue', cor: 'green' },
};

export const ORDEM_STATUS_ENTREGA = Object.keys(STATUS_ENTREGA) as StatusEntrega[];

export const PRIORIDADE: Record<Prioridade, Rotulo> = {
  baixa: { label: 'Baixa', cor: 'slate' },
  media: { label: 'Média', cor: 'sky' },
  alta: { label: 'Alta', cor: 'amber' },
  urgente: { label: 'Urgente', cor: 'red' },
};

export const RECORRENCIA: Record<Recorrencia, { label: string; meses: number }> = {
  mensal: { label: 'Mensal', meses: 1 },
  trimestral: { label: 'Trimestral', meses: 3 },
  semestral: { label: 'Semestral', meses: 6 },
  anual: { label: 'Anual', meses: 12 },
  pontual: { label: 'Projeto pontual', meses: 0 },
};

export const CORES_AVATAR = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#06b6d4'];
