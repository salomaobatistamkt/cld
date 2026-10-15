import { PenTool, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, Campo, Modal, Vazio } from '@/components/ui';
import { useStore } from '@/lib/store';
import { type Quadro } from '@/lib/types';
import { formatarData, hojeISO, novoId } from '@/lib/util';
import { MODELOS } from '@/board/modelos';

import { FaixaExemplos } from './FaixaExemplos';

// Gera miniaturas dos quadros que ainda não têm (ex.: modelos nunca abertos).
const useMiniaturasPendentes = (quadros: Quadro[]) => {
  const salvar = useStore((estado) => estado.salvar);
  useEffect(() => {
    const pendentes = quadros.filter((q) => !q.miniatura);
    if (!pendentes.length) return;
    let cancelado = false;
    import('@/board/EditorQuadro').then(async ({ elementosIniciais, gerarMiniatura }) => {
      for (const quadro of pendentes) {
        if (cancelado) return;
        try {
          const elements = await elementosIniciais(quadro);
          const miniatura = await gerarMiniatura(elements, quadro.cena.files);
          const atual = useStore.getState().dados.quadros.find((q) => q.id === quadro.id);
          if (atual && !atual.miniatura) salvar('quadros', { ...atual, cena: { ...atual.cena, elements: atual.cena.elements.length ? atual.cena.elements : elements }, miniatura });
        } catch {
          // sem miniatura, mostra só o ícone
        }
      }
    });
    return () => {
      cancelado = true;
    };
  }, [quadros.map((q) => q.id + (q.miniatura ? '1' : '0')).join()]); // eslint-disable-line react-hooks/exhaustive-deps
};

export const GradeQuadros = ({ quadros }: { quadros: Quadro[] }) => {
  const { dados, ir } = useStore();
  useMiniaturasPendentes(quadros);
  return (
    <div className="grade-3">
      {[...quadros]
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
        .map((q) => {
          const cliente = dados.clientes.find((c) => c.id === q.clienteId);
          return (
            <button key={q.id} type="button" className="cartao-quadro" onClick={() => ir({ tela: 'quadro', id: q.id })}>
              <div className="previa">{q.miniatura ? <img src={q.miniatura} alt="" /> : <PenTool size={28} color="#94a3b8" />}</div>
              <div className="info">
                <b>{q.titulo}</b>
                <span className="muted" style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {cliente ? (
                    <>
                      <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={18} /> {cliente.nome} ·
                    </>
                  ) : (
                    'Interno ·'
                  )}{' '}
                  editado {formatarData(q.atualizadoEm)}
                </span>
              </div>
            </button>
          );
        })}
    </div>
  );
};

export const NovoQuadro = ({ clienteId, aoFechar }: { clienteId: string | null; aoFechar: () => void }) => {
  const { dados, salvar, ir } = useStore();
  const [titulo, setTitulo] = useState('');
  const [cliente, setCliente] = useState(clienteId ?? '');
  const [modelo, setModelo] = useState('funil');

  const criar = () => {
    const quadro: Quadro = {
      id: novoId(),
      titulo: titulo.trim() || MODELOS[modelo].nome,
      clienteId: cliente || null,
      cena: { elements: [], files: {} },
      miniatura: '',
      atualizadoEm: hojeISO(),
      modelo,
    };
    salvar('quadros', quadro);
    aoFechar();
    ir({ tela: 'quadro', id: quadro.id });
  };

  return (
    <Modal
      titulo="Novo quadro de estratégia"
      aoFechar={aoFechar}
      rodape={
        <>
          <span />
          <button type="button" className="btn primario" onClick={criar}>
            Criar e abrir
          </button>
        </>
      }
    >
      <div className="grade-form">
        <Campo rotulo="Nome do quadro">
          <input id="q-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Funil de vendas — Black Friday" autoFocus />
        </Campo>
        <Campo rotulo="Cliente">
          <select id="q-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Interno (da empresa)</option>
            {dados.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="grade-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        {Object.entries(MODELOS).map(([id, m]) => (
          <button
            key={id}
            type="button"
            className="cartao"
            onClick={() => setModelo(id)}
            style={{ textAlign: 'left', cursor: 'pointer', borderColor: modelo === id ? 'var(--accent)' : undefined, background: modelo === id ? 'var(--accent-soft)' : undefined }}
          >
            <b>{m.nome}</b>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              {m.descricao}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

export const Quadros = () => {
  const { dados } = useStore();
  const [criando, setCriando] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const quadros = dados.quadros.filter((q) => filtro === 'todos' || (filtro === 'interno' ? !q.clienteId : q.clienteId === filtro));

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <PenTool size={26} /> Estratégias
          </h1>
          <p>Quadros brancos para funis, mapas mentais, jornadas e planos de campanha.</p>
        </div>
        <button type="button" className="btn primario" onClick={() => setCriando(true)}>
          <Plus size={16} /> Novo quadro
        </button>
      </div>
      <div className="acoes">
        <select id="filtro-quadros" className="input" style={{ width: 'auto' }} value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar quadros">
          <option value="todos">Todos os quadros</option>
          <option value="interno">Internos (da empresa)</option>
          {dados.clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      {quadros.length === 0 ? (
        <Vazio
          icone={<PenTool size={28} />}
          texto="Nenhum quadro ainda. Comece por um modelo de funil ou mapa mental."
          acao={
            <button type="button" className="btn primario" onClick={() => setCriando(true)}>
              <Plus size={16} /> Novo quadro
            </button>
          }
        />
      ) : (
        <GradeQuadros quadros={quadros} />
      )}
      {criando ? <NovoQuadro clienteId={filtro !== 'todos' && filtro !== 'interno' ? filtro : null} aoFechar={() => setCriando(false)} /> : null}
    </div>
  );
};
