import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { EditorQuadro } from '@/board/EditorQuadro';
import { Confirmar } from '@/components/ui';
import { useStore } from '@/lib/store';

// Editor do quadro em tela cheia, com barra no estilo do Canva.
const TelaQuadro = ({ id }: { id: string }) => {
  const { dados, salvar, remover, ir } = useStore();
  const quadro = dados.quadros.find((q) => q.id === id);
  const [excluir, setExcluir] = useState(false);
  const [titulo, setTitulo] = useState(quadro?.titulo ?? '');
  const voltar = () => ir(quadro?.clienteId ? { tela: 'cliente', id: quadro.clienteId, aba: 'estrategia' } : { tela: 'quadros' });

  if (!quadro) return null;
  const cliente = dados.clientes.find((c) => c.id === quadro.clienteId);

  return (
    <div className="editor-quadro">
      <div className="editor-topo">
        <button type="button" className="btn pequeno" onClick={voltar} aria-label="Voltar">
          <ArrowLeft size={15} /> <span className="texto-botao">Voltar</span>
        </button>
        <input
          id="titulo-quadro"
          className="titulo-quadro"
          value={titulo}
          aria-label="Nome do quadro"
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => {
            const atual = useStore.getState().dados.quadros.find((q) => q.id === id);
            if (atual && titulo.trim() && titulo !== atual.titulo) salvar('quadros', { ...atual, titulo: titulo.trim() });
          }}
        />
        {cliente ? <span className="nome-cliente">{cliente.nome}</span> : null}
        <span className="salvo">Salvo automaticamente</span>
        <button type="button" className="btn pequeno" onClick={() => setExcluir(true)} aria-label="Excluir quadro">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="area-excalidraw">
        <EditorQuadro
          quadro={quadro}
          aoSalvar={(proximo) => {
            const atual = useStore.getState().dados.quadros.find((q) => q.id === id);
            salvar('quadros', { ...proximo, titulo: atual?.titulo ?? proximo.titulo });
          }}
        />
      </div>
      {excluir ? (
        <Confirmar
          texto={`Excluir o quadro "${quadro.titulo}"?`}
          aoCancelar={() => setExcluir(false)}
          aoConfirmar={() => {
            remover('quadros', id);
            voltar();
          }}
        />
      ) : null}
    </div>
  );
};

export default TelaQuadro;
