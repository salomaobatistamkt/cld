import React, { useMemo, useState } from 'react';
import { BookOpen, ClipboardList, Clock, FileText, Pencil, Plus, Sparkles, Trash2, Wand2, AlertTriangle, Flame, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCalculo } from '@/lib/hooks';
import { calcularReceita, calcularGas, componentesInvalidos, custoUnitario, calcularPreco } from '@/lib/calculations';
import {
  Aviso, Cartao, CabPagina, Campo, Modal, Numero, Tag, Texto, Vazio, brl, minutosTexto, numero, pct, useToast, confirmar,
} from './ui';

const CATEGORIAS = ['Bolo', 'Bolo de pote', 'Brownie', 'Biscoito', 'Brigadeiro', 'Panetone', 'Doce', 'Salgado', 'Pão', 'Outro'];

const vazioReceita = () => ({
  nome: '', categoria: 'Doce', rendimento: 1, minutos: 0, ingredientes: [], embalagens: [], gas: [], componentes: [],
  equipeIds: [], margem: null, precoVenda: null, notas: '',
});

/* ===================================================== Lista ===== */
export const Receitas = ({ abrirNovaAoEntrar, abrirEditorId, onIrParaPreco }) => {
  const receitas = useStore((s) => s.receitas);
  const deleteReceita = useStore((s) => s.deleteReceita);
  const { custo, preco } = useCalculo();
  const mostrar = useToast((s) => s.mostrar);

  const [modo, setModo] = useState(abrirEditorId ? 'editor' : abrirNovaAoEntrar ? 'escolher' : null); // escolher | topicos | editor
  const [editandoId, setEditandoId] = useState(abrirEditorId || null);
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(
    () => receitas.filter((r) => r.nome.toLowerCase().includes(busca.toLowerCase())),
    [receitas, busca],
  );

  const abrirEditor = (id) => { setEditandoId(id); setModo('editor'); };
  const fechar = () => { setModo(null); setEditandoId(null); };

  return (
    <div className="pagina">
      <CabPagina titulo="Receitas" descricao="Cada receita guarda ingredientes, embalagens, tempo e gás. O custo e o preço se atualizam sozinhos quando um insumo muda de valor.">
        <button type="button" className="btn primario" onClick={() => setModo('escolher')}><Plus size={16} />Adicionar receita</button>
      </CabPagina>

      {receitas.length > 4 ? (
        <input type="search" placeholder="Buscar receita" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar receita" />
      ) : null}

      <Cartao semPad>
        {filtradas.length === 0 ? (
          <Vazio icone={BookOpen} titulo="Nenhuma receita por aqui" texto="Cole uma receita em tópicos e o sistema monta o cadastro para você.">
            <button type="button" className="btn primario" onClick={() => setModo('escolher')}><Plus size={16} />Adicionar receita</button>
          </Vazio>
        ) : (
          <div className="lista-receitas">
            {filtradas.map((r) => {
              const c = custo(r.id);
              const p = preco(r.id);
              return (
                <button type="button" key={r.id} className="item-receita" onClick={() => abrirEditor(r.id)}>
                  <div>
                    <strong>{r.nome}</strong>
                    <span className="meta">
                      {r.categoria} · rende {numero(r.rendimento)} · {r.minutos ? minutosTexto(r.minutos) : 'sem tempo informado'} · {r.ingredientes.length} ingredientes
                    </span>
                    {c?.semPreco?.length ? <div style={{ marginTop: 4 }}><Tag cor="ouro"><AlertTriangle size={12} />Sem preço: {c.semPreco.slice(0, 2).join(', ')}{c.semPreco.length > 2 ? '…' : ''}</Tag></div> : null}
                  </div>
                  <div className="extra direita">
                    <div className="num" style={{ fontWeight: 700 }}>{brl(c?.porUnidade)}</div>
                    <div className="fraco" style={{ fontSize: 12 }}>custo por unidade</div>
                  </div>
                  <div className="direita">
                    <div className="num" style={{ fontWeight: 800, color: 'var(--vinho)' }}>{brl(p?.precoUnidade)}</div>
                    <div className="fraco" style={{ fontSize: 12 }}>preço · {pct(p?.margemReal)} de margem</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Cartao>

      {modo === 'escolher' ? (
        <Modal titulo="Adicionar receita" onClose={fechar}>
          <div className="duas-colunas" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <button type="button" className="cartao" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setModo('topicos')}>
              <Wand2 size={22} color="#8b1b28" />
              <h3 style={{ fontSize: 24, color: 'var(--verde)', marginTop: 8 }}>Receita em tópicos</h3>
              <p className="muted" style={{ marginTop: 4 }}>Cole ou digite: nome e uma linha por ingrediente, como “300g de açúcar”. O sistema cadastra tudo.</p>
              <div style={{ marginTop: 10 }}><Tag cor="vinho"><Sparkles size={12} />Mais rápido</Tag></div>
            </button>
            <button type="button" className="cartao" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => { setEditandoId(null); setModo('editor'); }}>
              <ClipboardList size={22} color="#1e3a29" />
              <h3 style={{ fontSize: 24, color: 'var(--verde)', marginTop: 8 }}>Preencher campo a campo</h3>
              <p className="muted" style={{ marginTop: 4 }}>Escolha os insumos já cadastrados, informe quantidades, tempo e gás.</p>
            </button>
          </div>
        </Modal>
      ) : null}

      {modo === 'topicos' ? (
        <ImportadorReceita
          onClose={fechar}
          onCriada={(id) => { mostrar('Receita cadastrada. Revise embalagens e preço.'); abrirEditor(id); }}
        />
      ) : null}

      {modo === 'editor' ? (
        <EditorReceita
          id={editandoId}
          onClose={fechar}
          onVerPreco={(id) => { fechar(); onIrParaPreco?.(id); }}
          onExcluir={(id) => {
            if (confirmar('Excluir esta receita? Ela também sai de outras receitas que a usam.')) { deleteReceita(id); mostrar('Receita excluída'); fechar(); }
          }}
        />
      ) : null}
    </div>
  );
};

/* ===================================================== Importador ===== */
const EXEMPLO = `Brownie artesanal
Rendimento: 12 unidades
Tempo: 1h30
Forno: 35 min
300g de açúcar
90g de chocolate em pó
3 ovos
1 lata de leite condensado
2 colheres (sopa) de margarina
200g de nozes`;

const ImportadorReceita = ({ onClose, onCriada }) => {
  const lerReceitaTexto = useStore((s) => s.lerReceitaTexto);
  const cadastrar = useStore((s) => s.cadastrarReceitaDaPrevia);
  const ingredientes = useStore((s) => s.ingredientes);
  const [texto, setTexto] = useState('');
  const [previa, setPrevia] = useState(null);

  const ler = (t = texto) => {
    const r = lerReceitaTexto(t);
    setPrevia({
      ...r,
      itens: r.itens.map((i) => ({
        ...i,
        novo: i.novo ? { ...i.novo, preco: '', qtdEmbalagem: i.novo.unidade === 'un' ? 1 : 1000 } : null,
      })),
    });
  };

  const mudarItem = (idx, dados) => setPrevia((p) => ({ ...p, itens: p.itens.map((i, k) => (k === idx ? { ...i, ...dados } : i)) }));
  const escolherInsumo = (idx, valor) => {
    const item = previa.itens[idx];
    if (valor === '__novo') {
      mudarItem(idx, {
        insumoId: null,
        novo: item.novo || { nome: item.nomeDigitado, unidade: 'g', preco: '', qtdEmbalagem: 1000 },
      });
    } else {
      mudarItem(idx, { insumoId: valor, confianca: 1 });
    }
  };

  const podeCadastrar = previa && previa.nome.trim() && previa.itens.length > 0;

  return (
    <Modal
      titulo="Receita em tópicos"
      largo
      onClose={onClose}
      rodape={
        <>
          <button type="button" className="btn secundario" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn primario" disabled={!podeCadastrar} onClick={() => onCriada(cadastrar(previa))}>
            <Plus size={16} />Cadastrar receita
          </button>
        </>
      }
    >
      <div className="importador">
        <div className="secao-form">
          <h3>Cole a receita</h3>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={13}
            placeholder={'Nome da receita\n300g de açúcar\n90g de chocolate\n…'}
            aria-label="Receita em tópicos"
          />
          <div className="acoes">
            <button type="button" className="btn verde" disabled={!texto.trim()} onClick={() => ler()}><Wand2 size={16} />Ler receita</button>
            <button type="button" className="btn fantasma" onClick={() => { setTexto(EXEMPLO); ler(EXEMPLO); }}>Usar exemplo</button>
          </div>
          <div className="exemplo-texto">
            <strong>Como escrever</strong>{'\n'}Primeira linha: o nome. Depois, um ingrediente por linha, com quantidade e unidade (g, kg, ml, l, colher, xícara, lata, unidades).{'\n'}Opcional: “Rendimento: 12”, “Tempo: 1h30”, “Forno: 35 min”.
          </div>
        </div>

        <div className="secao-form">
          <h3>O que o sistema entendeu</h3>
          {!previa ? (
            <Vazio icone={FileText} titulo="Aguardando a receita" texto="Cole o texto ao lado e clique em “Ler receita”. Você confere tudo antes de cadastrar." />
          ) : (
            <>
              <div className="grade-campos">
                <Campo rotulo="Nome"><Texto value={previa.nome} onChange={(v) => setPrevia({ ...previa, nome: v })} /></Campo>
                <Campo rotulo="Rende (unidades)"><Numero value={previa.rendimento} onChange={(v) => setPrevia({ ...previa, rendimento: v })} placeholder="1" /></Campo>
                <Campo rotulo="Tempo de preparo"><Numero value={previa.minutos} sufixo="min" onChange={(v) => setPrevia({ ...previa, minutos: v })} /></Campo>
                <Campo rotulo="Tempo de forno" dica="Entra no custo do gás"><Numero value={previa.forno} sufixo="min" onChange={(v) => setPrevia({ ...previa, forno: v })} /></Campo>
              </div>

              {previa.itens.length === 0 ? (
                <Aviso icone={AlertTriangle}>Nenhum ingrediente encontrado. Escreva uma linha por ingrediente, começando pela quantidade (ex.: 300g de açúcar).</Aviso>
              ) : (
                <div className="cartao sem-pad">
                  <div className="tabela-wrap">
                    <table className="tabela">
                      <thead><tr><th>Você escreveu</th><th>Insumo cadastrado</th><th className="direita">Quantidade</th></tr></thead>
                      <tbody>
                        {previa.itens.map((item, idx) => {
                          const insumo = ingredientes.find((i) => i.id === item.insumoId);
                          return (
                            <React.Fragment key={idx}>
                              <tr className={item.insumoId && item.confianca < 0.9 ? 'confianca-baixa' : ''}>
                                <td>{item.nomeDigitado}</td>
                                <td>
                                  <select value={item.insumoId || '__novo'} onChange={(e) => escolherInsumo(idx, e.target.value)}>
                                    <option value="__novo">+ Novo insumo</option>
                                    {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                                  </select>
                                  {item.insumoId && item.confianca < 0.9 ? <div className="alerta" style={{ fontSize: 12, marginTop: 3 }}>Confira se é esse mesmo.</div> : null}
                                </td>
                                <td className="direita">
                                  <Numero value={item.qtd} sufixo={insumo?.unidade || item.novo?.unidade} onChange={(v) => mudarItem(idx, { qtd: v ?? 0 })} />
                                </td>
                              </tr>
                              {!item.insumoId && item.novo ? (
                                <tr>
                                  <td colSpan={3} style={{ background: 'var(--creme-2)' }}>
                                    <div className="grade-campos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                                      <Campo rotulo="Nome do insumo"><Texto value={item.novo.nome} onChange={(v) => mudarItem(idx, { novo: { ...item.novo, nome: v } })} /></Campo>
                                      <Campo rotulo="Unidade">
                                        <select value={item.novo.unidade} onChange={(e) => mudarItem(idx, { novo: { ...item.novo, unidade: e.target.value } })}>
                                          <option value="g">g</option><option value="ml">ml</option><option value="un">un</option>
                                        </select>
                                      </Campo>
                                      <Campo rotulo="Quanto vem na embalagem"><Numero value={item.novo.qtdEmbalagem} sufixo={item.novo.unidade} onChange={(v) => mudarItem(idx, { novo: { ...item.novo, qtdEmbalagem: v ?? 0 } })} /></Campo>
                                      <Campo rotulo="Preço da embalagem" dica="Pode deixar vazio e preencher depois"><Numero value={item.novo.preco} prefixo="R$" onChange={(v) => mudarItem(idx, { novo: { ...item.novo, preco: v } })} /></Campo>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {previa.avisos.length > 0 ? (
                <Aviso icone={AlertTriangle}>
                  {previa.avisos.slice(0, 4).map((a, i) => <div key={i}>{a}</div>)}
                </Aviso>
              ) : null}
              {previa.ignoradas.length > 0 ? (
                <p className="fraco" style={{ fontSize: 12.5 }}>Linhas ignoradas (sem quantidade): {previa.ignoradas.slice(0, 4).join(' · ')}{previa.ignoradas.length > 4 ? '…' : ''}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ===================================================== Editor ===== */
const EditorReceita = ({ id, onClose, onExcluir, onVerPreco }) => {
  const estado = useCalculo();
  const addReceita = useStore((s) => s.addReceita);
  const updateReceita = useStore((s) => s.updateReceita);
  const mostrar = useToast((s) => s.mostrar);

  const original = id ? estado.estado.receitas.find((r) => r.id === id) : null;
  const [f, setF] = useState(() => (original ? JSON.parse(JSON.stringify(original)) : vazioReceita()));
  const { ingredientes, embalagens, receitas, config } = estado.estado;

  const set = (dados) => setF((x) => ({ ...x, ...dados }));
  const lista = (campo, idx, dados) => set({ [campo]: f[campo].map((l, k) => (k === idx ? { ...l, ...dados } : l)) });
  const remover = (campo, idx) => set({ [campo]: f[campo].filter((_, k) => k !== idx) });

  const invalidos = id ? componentesInvalidos(id, receitas) : new Set();
  const disponiveis = receitas.filter((r) => !invalidos.has(r.id));

  // Receita temporária para mostrar o custo ao vivo, mesmo antes de salvar.
  const idTemp = id || '__novo';
  const estadoTemp = { ...estado.estado, receitas: id ? receitas.map((r) => (r.id === id ? { ...f, id } : r)) : [...receitas, { ...f, id: idTemp }] };
  const c = calcularReceita(idTemp, estadoTemp);
  const p = calcularPreco(idTemp, estadoTemp);

  const salvar = () => {
    if (!f.nome.trim()) { mostrar('Dê um nome para a receita', true); return; }
    const dados = { ...f, nome: f.nome.trim(), rendimento: Math.max(Number(f.rendimento) || 1, 1), minutos: Number(f.minutos) || 0 };
    if (id) { updateReceita(id, dados); mostrar('Receita salva'); onClose(); }
    else { const novoId = addReceita(dados); mostrar('Receita salva'); onClose(); return novoId; }
  };

  const custoIng = (l) => {
    const i = ingredientes.find((x) => x.id === l.insumoId);
    return i ? (Number(l.qtd) || 0) * custoUnitario(i) : 0;
  };
  const custoEmb = (l) => {
    const e = embalagens.find((x) => x.id === l.embalagemId);
    return e ? (Number(l.qtd) || 0) * custoUnitario(e) : 0;
  };

  return (
    <Modal
      titulo={id ? 'Editar receita' : 'Nova receita'}
      largo
      onClose={onClose}
      rodape={
        <>
          {id ? <button type="button" className="btn fantasma perigo" onClick={() => onExcluir(id)} style={{ marginRight: 'auto' }}><Trash2 size={15} />Excluir</button> : null}
          {id ? <button type="button" className="btn secundario" onClick={() => onVerPreco(id)}>Ver precificação</button> : null}
          <button type="button" className="btn secundario" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn primario" onClick={salvar}>Salvar receita</button>
        </>
      }
    >
      <div className="resumo-modal">
        <div><small>Custo da receita</small><strong className="num">{brl(c?.total)}</strong></div>
        <div><small>Custo por unidade</small><strong className="num">{brl(c?.porUnidade)}</strong></div>
        <div><small>Preço sugerido por unidade</small><strong className="num" style={{ color: 'var(--vinho)' }}>{brl(p?.sugeridoUnidade)}</strong></div>
        <div><small>Lucro por hora</small><strong className="num">{p?.lucroPorHora === null || p?.lucroPorHora === undefined ? '—' : brl(p.lucroPorHora)}</strong></div>
      </div>
      {c?.semPreco?.length ? <Aviso icone={AlertTriangle}>Faltam preços em: {c.semPreco.join(', ')}. Preencha na tela Insumos para o custo ficar correto.</Aviso> : null}

      <div className="secao-form">
        <h3>Dados da receita</h3>
        <div className="grade-campos">
          <Campo rotulo="Nome"><Texto value={f.nome} onChange={(v) => set({ nome: v })} placeholder="Ex.: Brownie artesanal" /></Campo>
          <Campo rotulo="Categoria">
            <select value={f.categoria} onChange={(e) => set({ categoria: e.target.value })}>
              {[...new Set([...CATEGORIAS, f.categoria])].map((c2) => <option key={c2}>{c2}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Quantas unidades rende?" dica="Ex.: 12 brownies, 1 bolo"><Numero value={f.rendimento} min={1} onChange={(v) => set({ rendimento: v })} /></Campo>
          <Campo rotulo="Tempo de trabalho" dica="Minutos com a mão na massa"><Numero value={f.minutos} sufixo="min" onChange={(v) => set({ minutos: v ?? 0 })} /></Campo>
        </div>
      </div>

      <div className="secao-form">
        <h3>Ingredientes <small>{f.ingredientes.length} itens</small></h3>
        {f.ingredientes.map((l, idx) => {
          const ing = ingredientes.find((x) => x.id === l.insumoId);
          return (
            <div key={idx} className="linha-form ing">
              <select value={l.insumoId} onChange={(e) => lista('ingredientes', idx, { insumoId: e.target.value })} aria-label="Ingrediente">
                {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              <Numero value={l.qtd} sufixo={ing?.unidade} onChange={(v) => lista('ingredientes', idx, { qtd: v ?? 0 })} aria-label="Quantidade" />
              <span className="custo-linha">{brl(custoIng(l))}</span>
              <button type="button" className="btn fantasma icone perigo" onClick={() => remover('ingredientes', idx)} aria-label="Remover ingrediente"><Trash2 size={15} /></button>
            </div>
          );
        })}
        <div>
          <button type="button" className="btn secundario pequeno" disabled={!ingredientes.length} onClick={() => set({ ingredientes: [...f.ingredientes, { insumoId: ingredientes[0]?.id, qtd: 0 }] })}><Plus size={14} />Adicionar ingrediente</button>
          {!ingredientes.length ? <span className="fraco" style={{ marginLeft: 10 }}>Cadastre insumos primeiro, ou use “Receita em tópicos”.</span> : null}
        </div>
      </div>

      <div className="secao-form">
        <h3>Embalagens <small>caixa, etiqueta, laço…</small></h3>
        {f.embalagens.map((l, idx) => {
          const emb = embalagens.find((x) => x.id === l.embalagemId);
          return (
            <div key={idx} className="linha-form ing">
              <select value={l.embalagemId} onChange={(e) => lista('embalagens', idx, { embalagemId: e.target.value })} aria-label="Embalagem">
                {embalagens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              <Numero value={l.qtd} sufixo={emb?.unidade} onChange={(v) => lista('embalagens', idx, { qtd: v ?? 0 })} aria-label="Quantidade" />
              <span className="custo-linha">{brl(custoEmb(l))}</span>
              <button type="button" className="btn fantasma icone perigo" onClick={() => remover('embalagens', idx)} aria-label="Remover embalagem"><Trash2 size={15} /></button>
            </div>
          );
        })}
        <div>
          <button type="button" className="btn secundario pequeno" disabled={!embalagens.length} onClick={() => set({ embalagens: [...f.embalagens, { embalagemId: embalagens[0]?.id, qtd: 1 }] })}><Plus size={14} />Adicionar embalagem</button>
        </div>
      </div>

      <div className="secao-form">
        <h3><Flame size={18} style={{ alignSelf: 'center' }} />Gás <small>fogão e forno usados</small></h3>
        {f.gas.map((l, idx) => (
          <div key={idx} className="linha-form gas">
            <select value={l.fonteId} onChange={(e) => lista('gas', idx, { fonteId: e.target.value })} aria-label="Fogão">
              {config.gas.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <Numero value={l.minutos} sufixo="min" onChange={(v) => lista('gas', idx, { minutos: v ?? 0 })} aria-label="Minutos" />
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="custo-linha">{brl(calcularGas(l, config.gas))}</span>
              <button type="button" className="btn fantasma icone perigo" onClick={() => remover('gas', idx)} aria-label="Remover gás"><Trash2 size={15} /></button>
            </span>
          </div>
        ))}
        <div><button type="button" className="btn secundario pequeno" onClick={() => set({ gas: [...f.gas, { fonteId: config.gas[0]?.id, minutos: 0 }] })}><Plus size={14} />Adicionar fogão ou forno</button></div>
      </div>

      <div className="secao-form">
        <h3>Usa outras receitas? <small>ex.: massa + recheio dentro de um bolo</small></h3>
        {f.componentes.map((l, idx) => (
          <div key={idx} className="linha-form comp">
            <select value={l.receitaId} onChange={(e) => lista('componentes', idx, { receitaId: e.target.value })} aria-label="Receita usada">
              {disponiveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            <Numero value={l.qtd} sufixo="×" onChange={(v) => lista('componentes', idx, { qtd: v ?? 0 })} aria-label="Quantas vezes" />
            <button type="button" className="btn fantasma icone perigo" onClick={() => remover('componentes', idx)} aria-label="Remover receita usada"><Trash2 size={15} /></button>
          </div>
        ))}
        <div><button type="button" className="btn secundario pequeno" disabled={!disponiveis.length} onClick={() => set({ componentes: [...f.componentes, { receitaId: disponiveis[0]?.id, qtd: 1 }] })}><Plus size={14} />Usar outra receita</button></div>
      </div>

      {config.equipe.length > 0 ? (
        <div className="secao-form">
          <h3><Users size={18} style={{ alignSelf: 'center' }} />Equipe nesta receita</h3>
          <div className="seletor-receita">
            {config.equipe.map((pessoa) => {
              const ativo = f.equipeIds.includes(pessoa.id);
              return (
                <button type="button" key={pessoa.id} className={`chip${ativo ? ' ativo' : ''}`}
                  onClick={() => set({ equipeIds: ativo ? f.equipeIds.filter((x) => x !== pessoa.id) : [...f.equipeIds, pessoa.id] })}>
                  {pessoa.nome || 'Sem nome'}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="secao-form">
        <h3>Preço <small>deixe em branco para usar a margem padrão</small></h3>
        <div className="grade-campos">
          <Campo rotulo="Margem de lucro desejada" dica={`Padrão do sistema: ${pct(config.margemPadrao)}`}>
            <Numero value={f.margem === null || f.margem === undefined ? null : Math.round(f.margem * 10000) / 100} sufixo="%" onChange={(v) => set({ margem: v === null ? null : v / 100 })} placeholder={String(Math.round(config.margemPadrao * 100))} />
          </Campo>
          <Campo rotulo="Preço de venda por unidade" dica="Se vazio, usa o preço sugerido">
            <Numero value={f.precoVenda} prefixo="R$" onChange={(v) => set({ precoVenda: v })} placeholder={String(p?.sugeridoUnidade ?? '')} />
          </Campo>
        </div>
        <Campo rotulo="Anotações"><textarea value={f.notas} onChange={(e) => set({ notas: e.target.value })} rows={2} /></Campo>
      </div>
    </Modal>
  );
};
