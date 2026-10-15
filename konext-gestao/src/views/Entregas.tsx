import { Columns3, List, Package, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormEntrega, novaEntrega } from '@/components/formularios';
import { classePrazo, Kanban } from '@/components/Kanban';
import { Avatar, Tag, Vazio } from '@/components/ui';
import { PRIORIDADE, STATUS_ENTREGA } from '@/lib/constantes';
import { useStore } from '@/lib/store';
import { type Entrega } from '@/lib/types';
import { formatarData, prazoRelativo } from '@/lib/util';

import { FaixaExemplos } from './FaixaExemplos';

export const Entregas = () => {
  const { dados } = useStore();
  const [cliente, setCliente] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [modo, setModo] = useState<'quadro' | 'lista'>('quadro');
  const [ocultarEntregues, setOcultarEntregues] = useState(false);
  const [editando, setEditando] = useState<Entrega | null>(null);

  const filtradas = useMemo(
    () =>
      dados.entregas.filter((e) => {
        if (cliente !== 'todos' && e.clienteId !== cliente) return false;
        if (tipo !== 'todos' && dados.servicos.find((s) => s.id === e.servicoId)?.tipo !== tipo) return false;
        if (ocultarEntregues && e.status === 'entregue') return false;
        return true;
      }),
    [dados, cliente, tipo, ocultarEntregues],
  );

  return (
    <div className="pagina" style={{ maxWidth: 'none' }}>
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <Package size={26} /> Entregas
          </h1>
          <p>Arraste os cartões entre as colunas para atualizar o andamento.</p>
        </div>
        <button type="button" className="btn primario" disabled={!dados.clientes.length} onClick={() => setEditando(novaEntrega(cliente !== 'todos' ? cliente : dados.clientes[0]?.id ?? ''))}>
          <Plus size={16} /> Nova entrega
        </button>
      </div>

      <div className="acoes">
        <select id="filtro-cliente" className="input" style={{ width: 'auto' }} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
          <option value="todos">Todos os clientes</option>
          {dados.clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select id="filtro-tipo" className="input" style={{ width: 'auto' }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de serviço">
          <option value="todos">Todos os serviços</option>
          {dados.config.tiposServico.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, color: 'var(--text-2)' }}>
          <input id="ocultar-entregues" type="checkbox" checked={ocultarEntregues} onChange={(e) => setOcultarEntregues(e.target.checked)} /> Ocultar entregues
        </label>
        <div className="segmentado" style={{ marginLeft: 'auto' }}>
          <button type="button" className={modo === 'quadro' ? 'ativo' : ''} onClick={() => setModo('quadro')}>
            <Columns3 size={15} /> Quadro
          </button>
          <button type="button" className={modo === 'lista' ? 'ativo' : ''} onClick={() => setModo('lista')}>
            <List size={15} /> Lista
          </button>
        </div>
      </div>

      {dados.clientes.length === 0 ? (
        <Vazio texto="Cadastre um cliente primeiro para criar entregas." />
      ) : modo === 'quadro' ? (
        <Kanban entregas={filtradas} clienteFixo={cliente !== 'todos' ? cliente : undefined} />
      ) : (
        <section className="cartao">
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Entrega</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Prazo</th>
                  <th>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {[...filtradas]
                  .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
                  .map((e) => {
                    const c = dados.clientes.find((item) => item.id === e.clienteId);
                    return (
                      <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => setEditando(e)}>
                        <td><b>{e.titulo}</b></td>
                        <td>
                          {c ? (
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Avatar nome={c.nome} cor={c.cor} tamanho={22} /> {c.nome}
                            </span>
                          ) : '—'}
                        </td>
                        <td><Tag rotulo={STATUS_ENTREGA[e.status]} /></td>
                        <td><Tag rotulo={PRIORIDADE[e.prioridade]} /></td>
                        <td className={classePrazo(e)}>{e.prazo ? `${formatarData(e.prazo)} · ${e.status === 'entregue' ? 'entregue' : prazoRelativo(e.prazo)}` : '—'}</td>
                        <td>{e.responsavel || '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {editando ? <FormEntrega inicial={editando} aoFechar={() => setEditando(null)} /> : null}
    </div>
  );
};
