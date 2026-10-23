import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ListTodo, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Cartao, CabPagina, Campo, Modal, Tag, Texto, brl, dataCurta, confirmar, useToast } from './ui';

const COLUNAS = [
  { id: 'a_fazer', rotulo: 'A fazer', icone: ListTodo },
  { id: 'fazendo', rotulo: 'Fazendo', icone: Loader2 },
  { id: 'feito', rotulo: 'Feito', icone: CheckCircle2 },
];
const PRIORIDADES = { alta: { rotulo: 'Urgente', cor: 'vinho' }, media: { rotulo: 'Normal', cor: 'ouro' }, baixa: { rotulo: 'Sem pressa', cor: 'verde' } };
const hojeISO = () => new Date().toISOString().slice(0, 10);

const vazia = () => ({ titulo: '', descricao: '', coluna: 'a_fazer', prioridade: 'media', prazo: '', pedidoId: null });

export const Tarefas = () => {
  const tarefas = useStore((s) => s.tarefas);
  const pedidos = useStore((s) => s.pedidos);
  const st = useStore();
  const mostrar = useToast((s) => s.mostrar);
  const [edicao, setEdicao] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [filtro, setFiltro] = useState('todas');

  const visiveis = useMemo(() => tarefas.filter((t) => (filtro === 'todas' ? true : filtro === 'pedidos' ? !!t.pedidoId : t.prioridade === filtro)), [tarefas, filtro]);
  const porColuna = (id) => visiveis
    .filter((t) => t.coluna === id)
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));

  const mover = (t, delta) => {
    const i = COLUNAS.findIndex((c) => c.id === t.coluna);
    const nova = COLUNAS[Math.min(Math.max(i + delta, 0), COLUNAS.length - 1)].id;
    if (nova !== t.coluna) st.updateTarefa(t.id, { coluna: nova });
  };

  const salvar = () => {
    if (!edicao.dados.titulo.trim()) { mostrar('Escreva o que precisa ser feito', true); return; }
    if (edicao.id) st.updateTarefa(edicao.id, edicao.dados); else st.addTarefa(edicao.dados);
    mostrar('Tarefa salva');
    setEdicao(null);
  };

  const atrasada = (t) => t.coluna !== 'feito' && t.prazo && t.prazo < hojeISO();

  return (
    <div className="pagina">
      <CabPagina titulo="Tarefas e demandas" descricao="O que precisa acontecer na confeitaria: compras, produção, encomendas e pendências. Arraste os cartões entre as colunas.">
        <button type="button" className="btn primario" onClick={() => setEdicao({ dados: vazia() })}><Plus size={16} />Nova tarefa</button>
      </CabPagina>

      <div className="seletor-receita" aria-label="Filtro">
        {[['todas', 'Todas'], ['alta', 'Urgentes'], ['pedidos', 'De pedidos']].map(([id, rotulo]) => (
          <button type="button" key={id} className={`chip${filtro === id ? ' ativo' : ''}`} onClick={() => setFiltro(id)}>{rotulo}</button>
        ))}
      </div>

      <div className="quadro">
        {COLUNAS.map((col) => {
          const itens = porColuna(col.id);
          const Icone = col.icone;
          return (
            <div
              key={col.id}
              className={`coluna${alvo === col.id ? ' alvo' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setAlvo(col.id); }}
              onDragLeave={() => setAlvo((a) => (a === col.id ? null : a))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) st.updateTarefa(id, { coluna: col.id });
                setAlvo(null);
              }}
            >
              <div className="coluna-topo">
                <h3><Icone size={18} color="#b58d3a" />{col.rotulo}</h3>
                <span className="contagem">{itens.length}</span>
              </div>
              {itens.length === 0 ? <p className="fraco" style={{ padding: '10px 6px', fontSize: 13 }}>{col.id === 'feito' ? 'O que for concluído aparece aqui.' : 'Solte um cartão aqui.'}</p> : null}
              {itens.map((t) => {
                const pedido = pedidos.find((p) => p.id === t.pedidoId);
                return (
                  <article key={t.id} className={`tarefa ${t.prioridade}${t.coluna === 'feito' ? ' feita' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}>
                    <h4>{t.titulo}</h4>
                    {t.descricao ? <p>{t.descricao}</p> : null}
                    <div className="rodape-tarefa">
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Tag cor={PRIORIDADES[t.prioridade]?.cor}>{PRIORIDADES[t.prioridade]?.rotulo}</Tag>
                        {t.prazo ? <Tag cor={atrasada(t) ? 'vinho' : 'cinza'}><CalendarDays size={12} />{atrasada(t) ? 'Atrasada · ' : ''}{dataCurta(t.prazo)}</Tag> : null}
                        {pedido ? <Tag cor="cinza">Pedido: {pedido.cliente}</Tag> : null}
                      </div>
                      <div className="mover">
                        <button type="button" className="btn fantasma icone" aria-label="Mover para a coluna anterior" disabled={t.coluna === 'a_fazer'} onClick={() => mover(t, -1)}><ArrowLeft size={14} /></button>
                        <button type="button" className="btn fantasma icone" aria-label="Mover para a próxima coluna" disabled={t.coluna === 'feito'} onClick={() => mover(t, 1)}><ArrowRight size={14} /></button>
                        <button type="button" className="btn fantasma icone" aria-label="Editar tarefa" onClick={() => setEdicao({ id: t.id, dados: { ...t } })}><Pencil size={14} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {col.id === 'a_fazer' ? <button type="button" className="btn fantasma pequeno" onClick={() => setEdicao({ dados: vazia() })}><Plus size={14} />Adicionar tarefa</button> : null}
            </div>
          );
        })}
      </div>

      {edicao ? (
        <Modal
          titulo={edicao.id ? 'Editar tarefa' : 'Nova tarefa'}
          onClose={() => setEdicao(null)}
          rodape={
            <>
              {edicao.id ? <button type="button" className="btn fantasma perigo" style={{ marginRight: 'auto' }} onClick={() => { if (confirmar('Excluir esta tarefa?')) { st.deleteTarefa(edicao.id); setEdicao(null); } }}><Trash2 size={15} />Excluir</button> : null}
              <button type="button" className="btn secundario" onClick={() => setEdicao(null)}>Cancelar</button>
              <button type="button" className="btn primario" onClick={salvar}>Salvar tarefa</button>
            </>
          }
        >
          <Campo rotulo="O que precisa ser feito?"><Texto autoFocus value={edicao.dados.titulo} onChange={(v) => setEdicao({ ...edicao, dados: { ...edicao.dados, titulo: v } })} placeholder="Ex.: Comprar caixas para o panetone" /></Campo>
          <Campo rotulo="Detalhes"><textarea rows={3} value={edicao.dados.descricao} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, descricao: e.target.value } })} /></Campo>
          <div className="grade-campos">
            <Campo rotulo="Coluna">
              <select value={edicao.dados.coluna} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, coluna: e.target.value } })}>
                {COLUNAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Prioridade">
              <select value={edicao.dados.prioridade} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, prioridade: e.target.value } })}>
                {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Prazo"><input type="date" value={edicao.dados.prazo} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, prazo: e.target.value } })} /></Campo>
            <Campo rotulo="Ligada a um pedido">
              <select value={edicao.dados.pedidoId || ''} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, pedidoId: e.target.value || null } })}>
                <option value="">Nenhum</option>
                {pedidos.filter((p) => p.status === 'pendente').map((p) => <option key={p.id} value={p.id}>{p.cliente} · {dataCurta(p.data)}</option>)}
              </select>
            </Campo>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
