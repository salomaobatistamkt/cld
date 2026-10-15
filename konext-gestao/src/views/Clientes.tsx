import { Briefcase, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormCliente, novoCliente } from '@/components/formularios';
import { Avatar, Tag, Vazio } from '@/components/ui';
import { STATUS_CLIENTE } from '@/lib/constantes';
import { valorMensal } from '@/lib/financeiro';
import { useStore } from '@/lib/store';
import { type StatusCliente } from '@/lib/types';
import { diasAte, formatarMoeda } from '@/lib/util';

import { FaixaExemplos } from './FaixaExemplos';

export const Clientes = () => {
  const { dados, ir } = useStore();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusCliente | 'todos'>('todos');
  const [criando, setCriando] = useState(false);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dados.clientes
      .filter((c) => status === 'todos' || c.status === status)
      .filter((c) => !termo || [c.nome, c.empresa, c.segmento, c.contato.nome].some((campo) => campo.toLowerCase().includes(termo)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [dados.clientes, busca, status]);

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <Briefcase size={26} /> Clientes
          </h1>
          <p>Cada cliente com seus serviços, entregas, estratégias e financeiro.</p>
        </div>
        <button type="button" className="btn primario" onClick={() => setCriando(true)}>
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      <div className="acoes">
        <label className="busca">
          <Search size={16} />
          <input id="busca-clientes" placeholder="Buscar por nome, empresa ou segmento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="segmentado" role="group" aria-label="Filtrar por status">
          <button type="button" className={status === 'todos' ? 'ativo' : ''} onClick={() => setStatus('todos')}>
            Todos
          </button>
          {(Object.keys(STATUS_CLIENTE) as StatusCliente[]).map((valor) => (
            <button key={valor} type="button" className={status === valor ? 'ativo' : ''} onClick={() => setStatus(valor)}>
              {STATUS_CLIENTE[valor].label}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <Vazio
          icone={<Briefcase size={28} />}
          texto={dados.clientes.length ? 'Nenhum cliente com esse filtro.' : 'Nenhum cliente ainda. Cadastre o primeiro para começar.'}
          acao={
            <button type="button" className="btn primario" onClick={() => setCriando(true)}>
              <Plus size={16} /> Novo cliente
            </button>
          }
        />
      ) : (
        <div className="grade-3">
          {lista.map((cliente) => {
            const servicos = dados.servicos.filter((s) => s.clienteId === cliente.id && s.status === 'ativo');
            const abertas = dados.entregas.filter((e) => e.clienteId === cliente.id && e.status !== 'entregue');
            const atrasadas = abertas.filter((e) => e.prazo && diasAte(e.prazo) < 0).length;
            return (
              <button key={cliente.id} type="button" className="cartao-cliente" onClick={() => ir({ tela: 'cliente', id: cliente.id })}>
                <div className="topo">
                  <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={44} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nome">{cliente.nome}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {cliente.segmento || 'Segmento não informado'}
                    </div>
                  </div>
                  <Tag rotulo={STATUS_CLIENTE[cliente.status]} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 22 }}>
                  {servicos.length ? servicos.map((s) => <span key={s.id} className="chip">{s.tipo}</span>) : <span className="muted" style={{ fontSize: 12.5 }}>Sem serviço ativo</span>}
                </div>
                <div className="numeros">
                  <div>
                    <b>{formatarMoeda(servicos.reduce((soma, s) => soma + valorMensal(s), 0), true)}</b>
                    <span>por mês</span>
                  </div>
                  <div>
                    <b>{abertas.length}</b>
                    <span>entregas abertas</span>
                  </div>
                  <div>
                    <b style={{ color: atrasadas ? 'var(--tag-red)' : undefined }}>{atrasadas}</b>
                    <span>atrasadas</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {criando ? (
        <FormCliente
          inicial={novoCliente()}
          aoFechar={(salvo) => {
            setCriando(false);
            if (salvo) ir({ tela: 'cliente', id: salvo.id });
          }}
        />
      ) : null}
    </div>
  );
};
