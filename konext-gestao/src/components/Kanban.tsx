import { CalendarClock, Link2, Lock, Plus, User } from 'lucide-react';
import { useState } from 'react';

import { ORDEM_STATUS_ENTREGA, PRIORIDADE, STATUS_ENTREGA } from '@/lib/constantes';
import { useStore } from '@/lib/store';
import { type Entrega, type StatusEntrega } from '@/lib/types';
import { diasAte, formatarData, hojeISO, prazoRelativo } from '@/lib/util';

import { FormEntrega, novaEntrega } from './formularios';
import { Avatar, Tag } from './ui';

export const classePrazo = (entrega: Entrega) => {
  if (!entrega.prazo || entrega.status === 'entregue') return '';
  const dias = diasAte(entrega.prazo);
  if (dias < 0) return 'prazo-atrasado';
  if (dias <= 2) return 'prazo-perto';
  return '';
};

type PropsCard = { entrega: Entrega; mostrarCliente: boolean; aoAbrir: () => void; aoMover?: (status: StatusEntrega) => void };

export const CardEntrega = ({ entrega, mostrarCliente, aoAbrir, aoMover }: PropsCard) => {
  const cliente = useStore((estado) => estado.dados.clientes.find((c) => c.id === entrega.clienteId));
  const servico = useStore((estado) => estado.dados.servicos.find((s) => s.id === entrega.servicoId));
  const [arrastando, setArrastando] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`card-entrega${arrastando ? ' arrastando' : ''}`}
      draggable
      onDragStart={(evento) => {
        evento.dataTransfer.setData('text/plain', entrega.id);
        evento.dataTransfer.effectAllowed = 'move';
        setArrastando(true);
      }}
      onDragEnd={() => setArrastando(false)}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.target !== evento.currentTarget) return;
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          aoAbrir();
        }
      }}
    >
      {mostrarCliente && cliente ? (
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>
          <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={20} />
          {cliente.nome}
        </span>
      ) : null}
      <span className="titulo">{entrega.titulo}</span>
      <span className="meta">
        {entrega.prioridade === 'alta' || entrega.prioridade === 'urgente' ? <Tag rotulo={PRIORIDADE[entrega.prioridade]} /> : null}
        {servico ? <span className="chip">{servico.tipo}</span> : null}
        {entrega.interna ? (
          <span className="tag slate sem-ponto" title="Interna: não aparece na apresentação">
            <Lock size={11} /> Interna
          </span>
        ) : null}
      </span>
      <span className="meta">
        {entrega.prazo ? (
          <span className={classePrazo(entrega)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <CalendarClock size={13} />
            {entrega.status === 'entregue' ? `entregue ${formatarData(entrega.entregueEm || entrega.prazo)}` : `${formatarData(entrega.prazo)} · ${prazoRelativo(entrega.prazo)}`}
          </span>
        ) : null}
        {entrega.responsavel ? (
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <User size={13} />
            {entrega.responsavel}
          </span>
        ) : null}
        {entrega.link ? <Link2 size={13} aria-label="Tem link" /> : null}
      </span>
      {aoMover ? (
        // No toque não existe arrastar: um seletor muda a coluna direto do card.
        <select
          className="mover-toque"
          value={entrega.status}
          aria-label="Mover para"
          onClick={(evento) => evento.stopPropagation()}
          onChange={(evento) => aoMover(evento.target.value as StatusEntrega)}
        >
          {ORDEM_STATUS_ENTREGA.map((status) => (
            <option key={status} value={status}>
              {STATUS_ENTREGA[status].label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
};

export const Kanban = ({ entregas, clienteFixo }: { entregas: Entrega[]; clienteFixo?: string }) => {
  const salvar = useStore((estado) => estado.salvar);
  const primeiroCliente = useStore((estado) => estado.dados.clientes[0]?.id ?? '');
  const [editando, setEditando] = useState<Entrega | null>(null);
  const [sobre, setSobre] = useState<StatusEntrega | null>(null);

  const mover = (id: string, status: StatusEntrega) => {
    const entrega = entregas.find((item) => item.id === id);
    if (!entrega || entrega.status === status) return;
    salvar('entregas', {
      ...entrega,
      status,
      entregueEm: status === 'entregue' ? entrega.entregueEm || hojeISO() : '',
      ordem: Date.now(),
    });
  };

  return (
    <>
      <div className="kanban">
        {ORDEM_STATUS_ENTREGA.map((status) => {
          const daColuna = entregas
            .filter((entrega) => entrega.status === status)
            .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.ordem - b.ordem);
          return (
            <section
              key={status}
              className={`coluna${sobre === status ? ' sobre' : ''}`}
              onDragOver={(evento) => {
                evento.preventDefault();
                setSobre(status);
              }}
              onDragLeave={() => setSobre((atual) => (atual === status ? null : atual))}
              onDrop={(evento) => {
                evento.preventDefault();
                setSobre(null);
                mover(evento.dataTransfer.getData('text/plain'), status);
              }}
              aria-label={STATUS_ENTREGA[status].label}
            >
              <div className="coluna-topo">
                <Tag rotulo={STATUS_ENTREGA[status]} />
                <span className="contagem">{daColuna.length}</span>
              </div>
              {daColuna.map((entrega) => (
                <CardEntrega key={entrega.id} entrega={entrega} mostrarCliente={!clienteFixo} aoAbrir={() => setEditando(entrega)} aoMover={(novo) => mover(entrega.id, novo)} />
              ))}
              <button type="button" className="btn fantasma pequeno" onClick={() => setEditando(novaEntrega(clienteFixo ?? primeiroCliente, status))}>
                <Plus size={14} /> Adicionar
              </button>
            </section>
          );
        })}
      </div>
      {editando ? <FormEntrega inicial={editando} aoFechar={() => setEditando(null)} /> : null}
    </>
  );
};
