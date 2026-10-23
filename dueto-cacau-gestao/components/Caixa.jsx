import React, { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { resumoCaixa } from '@/lib/calculations';
import { Abas, Cartao, CabPagina, Campo, Kpi, Modal, Numero, Tag, Texto, Vazio, brl, dataLonga, mesAtual, confirmar, useToast } from './ui';

const CATEGORIAS = {
  entrada: ['Vendas', 'Encomendas', 'Outras entradas'],
  saida: ['Insumos', 'Embalagens', 'Gás', 'Contas fixas', 'Marketing', 'Entregas', 'Retirada de pró-labore', 'Outras saídas'],
};
const hojeISO = () => new Date().toISOString().slice(0, 10);
const novo = (tipo = 'entrada') => ({ data: hojeISO(), tipo, categoria: CATEGORIAS[tipo][0], valor: null, descricao: '' });

export const Caixa = () => {
  const caixa = useStore((s) => s.caixa);
  const st = useStore();
  const mostrar = useToast((s) => s.mostrar);
  const [mes, setMes] = useState(mesAtual());
  const [aba, setAba] = useState('todos');
  const [edicao, setEdicao] = useState(null);

  const noMes = (data) => data?.startsWith(mes);
  const resumo = useMemo(() => resumoCaixa(caixa, noMes), [caixa, mes]);
  const lista = useMemo(
    () => caixa.filter((l) => noMes(l.data) && (aba === 'todos' || l.tipo === aba)).sort((a, b) => b.data.localeCompare(a.data)),
    [caixa, mes, aba],
  );

  const salvar = () => {
    const d = edicao.dados;
    if (!d.valor || d.valor <= 0) { mostrar('Informe um valor maior que zero', true); return; }
    if (edicao.id) st.updateLancamento(edicao.id, d); else st.addLancamento(d);
    mostrar('Lançamento salvo');
    setEdicao(null);
  };

  const categorias = Object.entries(resumo.porCategoria);

  return (
    <div className="pagina">
      <CabPagina titulo="Caixa" descricao="Tudo o que entrou e saiu do negócio no mês.">
        <input type="month" lang="pt-BR" value={mes} onChange={(e) => setMes(e.target.value || mesAtual())} aria-label="Mês" style={{ width: 'auto' }} />
        <button type="button" className="btn secundario" onClick={() => setEdicao({ dados: novo('saida') })}><ArrowDownCircle size={16} />Registrar saída</button>
        <button type="button" className="btn primario" onClick={() => setEdicao({ dados: novo('entrada') })}><ArrowUpCircle size={16} />Registrar entrada</button>
      </CabPagina>

      <div className="kpis">
        <Kpi icone={ArrowUpCircle} rotulo="Entradas" valor={brl(resumo.entradas)} />
        <Kpi icone={ArrowDownCircle} rotulo="Saídas" valor={brl(resumo.saidas)} />
        <Kpi destaque icone={Wallet} rotulo="Saldo do mês" valor={brl(resumo.saldo)} rodape={resumo.saldo >= 0 ? 'Sobrou no mês' : 'Gastou mais do que entrou'} />
      </div>

      <div className="duas-colunas">
        <Cartao semPad titulo="Lançamentos">
          <div style={{ padding: '0 22px' }}>
            <Abas ativo={aba} onChange={setAba} itens={[{ id: 'todos', rotulo: 'Todos' }, { id: 'entrada', rotulo: 'Entradas' }, { id: 'saida', rotulo: 'Saídas' }]} />
          </div>
          {lista.length === 0 ? (
            <Vazio icone={Landmark} titulo="Sem lançamentos neste mês" texto="Registre uma entrada ou saída para começar." />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="direita">Valor</th><th /></tr></thead>
                <tbody>
                  {lista.map((l) => (
                    <tr key={l.id}>
                      <td className="num">{dataLonga(l.data)}</td>
                      <td>{l.descricao || <span className="fraco">Sem descrição</span>}</td>
                      <td><Tag cor={l.tipo === 'entrada' ? 'verde' : 'cinza'}>{l.categoria}</Tag></td>
                      <td className={`direita num ${l.tipo === 'entrada' ? 'entrada' : 'saida'}`}>{l.tipo === 'entrada' ? '+' : '−'} {brl(l.valor)}</td>
                      <td className="direita" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn fantasma icone" aria-label="Editar lançamento" onClick={() => setEdicao({ id: l.id, dados: { ...l } })}><Pencil size={14} /></button>
                        <button type="button" className="btn fantasma icone perigo" aria-label="Excluir lançamento" onClick={() => confirmar('Excluir este lançamento?') && st.deleteLancamento(l.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Por categoria" descricao="Onde o dinheiro entrou e saiu.">
          {categorias.length === 0 ? <p className="muted">Nada para mostrar ainda.</p> : (
            <div className="lista-simples">
              {categorias.map(([nome, v]) => (
                <div key={nome}>
                  <span>{nome}</span>
                  <span className="num">
                    {v.entrada ? <span className="entrada">+ {brl(v.entrada)}</span> : null}
                    {v.entrada && v.saida ? ' · ' : null}
                    {v.saida ? <span className="saida">− {brl(v.saida)}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </div>

      {edicao ? (
        <Modal
          titulo={edicao.id ? 'Editar lançamento' : edicao.dados.tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
          onClose={() => setEdicao(null)}
          rodape={<><button type="button" className="btn secundario" onClick={() => setEdicao(null)}>Cancelar</button><button type="button" className="btn primario" onClick={salvar}>Salvar lançamento</button></>}
        >
          <div className="grade-campos">
            <Campo rotulo="Tipo">
              <select value={edicao.dados.tipo} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, tipo: e.target.value, categoria: CATEGORIAS[e.target.value][0] } })}>
                <option value="entrada">Entrada</option><option value="saida">Saída</option>
              </select>
            </Campo>
            <Campo rotulo="Categoria">
              <select value={edicao.dados.categoria} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, categoria: e.target.value } })}>
                {[...new Set([...CATEGORIAS[edicao.dados.tipo], edicao.dados.categoria])].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Valor"><Numero prefixo="R$" value={edicao.dados.valor} onChange={(v) => setEdicao({ ...edicao, dados: { ...edicao.dados, valor: v } })} /></Campo>
            <Campo rotulo="Data"><input type="date" value={edicao.dados.data} onChange={(e) => setEdicao({ ...edicao, dados: { ...edicao.dados, data: e.target.value } })} /></Campo>
          </div>
          <Campo rotulo="Descrição"><Texto value={edicao.dados.descricao} onChange={(v) => setEdicao({ ...edicao, dados: { ...edicao.dados, descricao: v } })} placeholder="Ex.: Compra de chocolate" /></Campo>
        </Modal>
      ) : null}
    </div>
  );
};
