import React, { useMemo, useState } from 'react';
import { Bike, CheckCircle2, PackageOpen, Pencil, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCalculo } from '@/lib/hooks';
import { totalPedido, num } from '@/lib/calculations';
import { Abas, Cartao, CabPagina, Campo, Modal, Numero, Tag, Texto, Vazio, brl, dataLonga, confirmar, useToast } from './ui';

const STATUS = {
  pendente: { rotulo: 'A entregar', cor: 'ouro' },
  entregue: { rotulo: 'Entregue', cor: 'verde' },
  cancelado: { rotulo: 'Cancelado', cor: 'cinza' },
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

const novoPedido = (receitas) => ({
  cliente: '', data: hojeISO(), tipo: 'entrega', status: 'pendente', notas: '',
  itens: receitas[0] ? [{ receitaId: receitas[0].id, qtd: 1, preco: 0 }] : [],
});

export const Pedidos = () => {
  const pedidos = useStore((s) => s.pedidos);
  const receitas = useStore((s) => s.receitas);
  const st = useStore();
  const { preco, custo } = useCalculo();
  const mostrar = useToast((s) => s.mostrar);
  const [aba, setAba] = useState('pendente');
  const [edicao, setEdicao] = useState(null); // { id?, dados }

  const lista = useMemo(() => {
    const filtrados = pedidos.filter((p) => (aba === 'todos' ? true : p.status === aba));
    return [...filtrados].sort((a, b) => (aba === 'entregue' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)));
  }, [pedidos, aba]);

  const nomeReceita = (id) => receitas.find((r) => r.id === id)?.nome || 'Receita removida';
  const contagem = (s) => pedidos.filter((p) => p.status === s).length;

  const abrirNovo = () => setEdicao({ dados: novoPedido(receitas) });
  const abrirEdicao = (p) => setEdicao({ id: p.id, dados: JSON.parse(JSON.stringify(p)) });
  const precoDaReceita = (receitaId) => preco(receitaId)?.precoUnidade || 0;

  const salvar = () => {
    const d = { ...edicao.dados, itens: edicao.dados.itens.map((i) => ({ ...i, preco: num(i.preco) || precoDaReceita(i.receitaId) })) };
    if (!d.cliente.trim()) { mostrar('Informe o nome do cliente', true); return; }
    if (!d.itens.length) { mostrar('Adicione ao menos um item', true); return; }
    if (edicao.id) st.updatePedido(edicao.id, d); else st.addPedido(d);
    mostrar('Pedido salvo');
    setEdicao(null);
  };

  const lucroPedido = (p) => p.itens.reduce((acc, i) => acc + num(i.qtd) * (num(i.preco) - (custo(i.receitaId)?.porUnidade || 0)), 0);

  return (
    <div className="pagina">
      <CabPagina titulo="Pedidos e entregas" descricao="Tudo o que está encomendado, quando entregar e quanto cada pedido deixa de lucro.">
        <button type="button" className="btn primario" onClick={abrirNovo} disabled={!receitas.length}><Plus size={16} />Novo pedido</button>
      </CabPagina>

      <Abas ativo={aba} onChange={setAba} itens={[
        { id: 'pendente', rotulo: `A entregar (${contagem('pendente')})` },
        { id: 'entregue', rotulo: `Entregues (${contagem('entregue')})` },
        { id: 'cancelado', rotulo: `Cancelados (${contagem('cancelado')})` },
        { id: 'todos', rotulo: 'Todos' },
      ]} />

      <Cartao semPad>
        {lista.length === 0 ? (
          <Vazio icone={PackageOpen} titulo="Nenhum pedido nesta lista" texto={receitas.length ? 'Registre um pedido para acompanhar entrega e lucro.' : 'Cadastre uma receita antes de criar pedidos.'}>
            {receitas.length ? <button type="button" className="btn primario" onClick={abrirNovo}><Plus size={16} />Novo pedido</button> : null}
          </Vazio>
        ) : lista.map((p) => (
          <div key={p.id} className="pedido">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <Tag cor={STATUS[p.status]?.cor}>{STATUS[p.status]?.rotulo}</Tag>
                <Tag cor="cinza">{p.tipo === 'entrega' ? <><Bike size={12} />Entrega</> : <><ShoppingBag size={12} />Retirada</>}</Tag>
                <span className="muted">{dataLonga(p.data)}</span>
              </div>
              <h3>{p.cliente}</h3>
              <div className="itens">{p.itens.map((i) => `${i.qtd}× ${nomeReceita(i.receitaId)}`).join(' · ')}</div>
              {p.notas ? <div className="fraco" style={{ fontSize: 12.5, marginTop: 3 }}>{p.notas}</div> : null}
              <div className="acoes" style={{ marginTop: 10 }}>
                {p.status === 'pendente' ? <button type="button" className="btn verde pequeno" onClick={() => { st.updatePedido(p.id, { status: 'entregue' }); mostrar('Pedido entregue'); }}><CheckCircle2 size={14} />Marcar como entregue</button> : null}
                <button type="button" className="btn secundario pequeno" onClick={() => abrirEdicao(p)}><Pencil size={13} />Editar</button>
                <button type="button" className="btn fantasma pequeno perigo" onClick={() => confirmar('Excluir este pedido?') && st.deletePedido(p.id)}><Trash2 size={13} />Excluir</button>
              </div>
            </div>
            <div>
              <div className="valor num">{brl(totalPedido(p))}</div>
              <div className="fraco direita" style={{ fontSize: 12.5 }}>lucro estimado {brl(lucroPedido(p))}</div>
            </div>
          </div>
        ))}
      </Cartao>

      {edicao ? (
        <Modal
          titulo={edicao.id ? 'Editar pedido' : 'Novo pedido'}
          onClose={() => setEdicao(null)}
          rodape={<><button type="button" className="btn secundario" onClick={() => setEdicao(null)}>Cancelar</button><button type="button" className="btn primario" onClick={salvar}>Salvar pedido</button></>}
        >
          <div className="grade-campos">
            <Campo rotulo="Cliente"><Texto value={edicao.dados.cliente} onChange={(v) => setEdicao({ ...edicao, dados: { ...edicao.dados, cliente: v } })} /></Campo>
            <Campo rotulo="Data de entrega"><input type="date" value={edicao.dados.data} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, data: e.target.value } })} /></Campo>
            <Campo rotulo="Como vai receber">
              <select value={edicao.dados.tipo} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, tipo: e.target.value } })}>
                <option value="entrega">Entrega</option><option value="retirada">Retirada</option>
              </select>
            </Campo>
            <Campo rotulo="Situação">
              <select value={edicao.dados.status} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, status: e.target.value } })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
              </select>
            </Campo>
          </div>

          <div className="secao-form">
            <h3>Itens do pedido</h3>
            {edicao.dados.itens.map((item, idx) => {
              const mudar = (d) => setEdicao({ ...edicao, dados: { ...edicao.dados, itens: edicao.dados.itens.map((x, k) => (k === idx ? { ...x, ...d } : x)) } });
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 90px 130px auto', gap: 8, alignItems: 'center' }}>
                  <select value={item.receitaId} onChange={(e) => mudar({ receitaId: e.target.value, preco: precoDaReceita(e.target.value) })} aria-label="Receita">
                    {receitas.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                  <Numero value={item.qtd} sufixo="×" min={1} onChange={(v) => mudar({ qtd: v ?? 1 })} aria-label="Quantidade" />
                  <Numero value={item.preco || null} prefixo="R$" placeholder={String(precoDaReceita(item.receitaId))} onChange={(v) => mudar({ preco: v ?? 0 })} aria-label="Preço por unidade" />
                  <button type="button" className="btn fantasma icone perigo" aria-label="Remover item" onClick={() => setEdicao({ ...edicao, dados: { ...edicao.dados, itens: edicao.dados.itens.filter((_, k) => k !== idx) } })}><Trash2 size={15} /></button>
                </div>
              );
            })}
            <div>
              <button type="button" className="btn secundario pequeno" onClick={() => setEdicao({ ...edicao, dados: { ...edicao.dados, itens: [...edicao.dados.itens, { receitaId: receitas[0].id, qtd: 1, preco: precoDaReceita(receitas[0].id) }] } })}><Plus size={14} />Adicionar item</button>
              <span className="fraco" style={{ marginLeft: 10 }}>Preço em branco usa o preço da precificação.</span>
            </div>
          </div>
          <Campo rotulo="Observações"><textarea rows={2} value={edicao.dados.notas} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, notas: e.target.value } })} /></Campo>
          <div className="resumo-modal">
            <div><small>Total do pedido</small><strong className="num">{brl(edicao.dados.itens.reduce((a, i) => a + num(i.qtd) * (num(i.preco) || precoDaReceita(i.receitaId)), 0))}</strong></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
