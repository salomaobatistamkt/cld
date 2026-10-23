import React, { useMemo, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { custoUnitario } from '@/lib/calculations';
import { Abas, Cartao, CabPagina, Numero, Tag, Texto, Vazio, UNIDADES, brl4, brl, confirmar, useToast } from './ui';

const Tabela = ({ itens, tipo, usos, onAdd, onUpdate, onDelete }) => {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase())), [itens, busca]);
  const rotuloTipo = tipo === 'insumo' ? 'insumo' : 'embalagem';

  return (
    <Cartao
      semPad
      titulo={tipo === 'insumo' ? 'Ingredientes' : 'Embalagens'}
      descricao={tipo === 'insumo'
        ? 'Informe quanto vem em cada embalagem e quanto você pagou. O custo de 1 g, 1 ml ou 1 unidade é calculado sozinho.'
        : 'Caixas, adesivos, celofane, laços. Funciona igual aos ingredientes.'}
      acoes={<button type="button" className="btn primario pequeno" onClick={() => onAdd({ nome: `Novo ${rotuloTipo}` })}><Plus size={14} />Adicionar</button>}
    >
      <div style={{ padding: '0 22px 12px' }}>
        {itens.length > 6 ? <input type="search" placeholder={`Buscar ${rotuloTipo}`} value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" /> : null}
      </div>
      {lista.length === 0 ? (
        <Vazio icone={Package} titulo={itens.length ? 'Nada encontrado' : `Nenhum ${rotuloTipo} cadastrado`} texto="Adicione o primeiro item e preencha o preço da embalagem." />
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>Unidade</th><th>Vem na embalagem</th><th>Preço pago</th><th className="direita">Custo por unidade</th><th className="direita">Em receitas</th><th /></tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const unitario = custoUnitario(i);
                const n = usos[i.id] || 0;
                return (
                  <tr key={i.id}>
                    <td style={{ minWidth: 190 }}><Texto value={i.nome} onChange={(v) => onUpdate(i.id, { nome: v })} aria-label="Nome" /></td>
                    <td style={{ width: 120 }}>
                      <select value={i.unidade} onChange={(e) => onUpdate(i.id, { unidade: e.target.value })} aria-label="Unidade">
                        {UNIDADES.map((u) => <option key={u.id} value={u.id}>{u.id}</option>)}
                      </select>
                    </td>
                    <td style={{ width: 150 }}><Numero value={i.qtdEmbalagem} sufixo={i.unidade} onChange={(v) => onUpdate(i.id, { qtdEmbalagem: v ?? 0 })} aria-label="Quantidade na embalagem" /></td>
                    <td style={{ width: 150 }}><Numero prefixo="R$" value={i.preco} onChange={(v) => onUpdate(i.id, { preco: v ?? 0 })} aria-label="Preço pago" /></td>
                    <td className="direita num">
                      {unitario > 0 ? <strong>{brl4(unitario)}</strong> : <Tag cor="ouro">Sem preço</Tag>}
                      <div className="fraco" style={{ fontSize: 11.5 }}>por {i.unidade}</div>
                    </td>
                    <td className="direita">{n ? <Tag cor="verde">{n} {n === 1 ? 'receita' : 'receitas'}</Tag> : <span className="fraco">—</span>}</td>
                    <td className="direita">
                      <button type="button" className="btn fantasma icone perigo" aria-label={`Excluir ${i.nome}`}
                        onClick={() => { if (!n || confirmar(`“${i.nome}” é usado em ${n} receita(s). Excluir remove das receitas também. Continuar?`)) onDelete(i.id); }}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
};

export const Insumos = () => {
  const st = useStore();
  const [aba, setAba] = useState('ingredientes');

  const usosIng = useMemo(() => {
    const m = {};
    st.receitas.forEach((r) => (r.ingredientes || []).forEach((l) => { m[l.insumoId] = (m[l.insumoId] || 0) + 1; }));
    return m;
  }, [st.receitas]);
  const usosEmb = useMemo(() => {
    const m = {};
    st.receitas.forEach((r) => (r.embalagens || []).forEach((l) => { m[l.embalagemId] = (m[l.embalagemId] || 0) + 1; }));
    return m;
  }, [st.receitas]);

  return (
    <div className="pagina">
      <CabPagina titulo="Insumos" descricao="Atualize o preço aqui quando o fornecedor mudar. Todas as receitas e preços acompanham." />
      <Abas
        ativo={aba}
        onChange={setAba}
        itens={[
          { id: 'ingredientes', rotulo: `Ingredientes (${st.ingredientes.length})` },
          { id: 'embalagens', rotulo: `Embalagens (${st.embalagens.length})` },
        ]}
      />
      {aba === 'ingredientes' ? (
        <Tabela tipo="insumo" itens={st.ingredientes} usos={usosIng} onAdd={st.addInsumo} onUpdate={st.updateInsumo} onDelete={st.deleteInsumo} />
      ) : (
        <Tabela tipo="embalagem" itens={st.embalagens} usos={usosEmb} onAdd={st.addEmbalagem} onUpdate={st.updateEmbalagem} onDelete={st.deleteEmbalagem} />
      )}
    </div>
  );
};
