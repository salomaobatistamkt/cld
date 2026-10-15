import { Plus, Settings, X } from 'lucide-react';
import { useState } from 'react';

import { Campo } from '@/components/ui';
import { type Config } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

const ListaEditavel = ({ titulo, itens, aoMudar, dica }: { titulo: string; itens: string[]; aoMudar: (itens: string[]) => void; dica: string }) => {
  const [novo, setNovo] = useState('');
  const adicionar = () => {
    const valor = novo.trim();
    if (!valor || itens.includes(valor)) return;
    aoMudar([...itens, valor]);
    setNovo('');
  };
  return (
    <section className="cartao">
      <div className="cartao-titulo">
        <h3>{titulo}</h3>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>{dica}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {itens.map((item) => (
          <span key={item} className="chip" style={{ fontSize: 13, padding: '4px 6px 4px 10px' }}>
            {item}
            <button type="button" className="btn fantasma icone" style={{ padding: 2 }} aria-label={`Remover ${item}`} onClick={() => aoMudar(itens.filter((i) => i !== item))}>
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          adicionar();
        }}
      >
        <input id={`novo-${titulo}`} className="input" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Adicionar…" />
        <button type="submit" className="btn" disabled={!novo.trim()}>
          <Plus size={15} /> Adicionar
        </button>
      </form>
    </section>
  );
};

export const Configuracoes = () => {
  const { dados, salvarConfig, backend } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const config = dados.config;
  const mudar = (parcial: Partial<Config>) => {
    salvarConfig({ ...config, ...parcial });
    mostrar('Configuração salva');
  };

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Settings size={26} /> Configurações
          </h1>
          <p>Personalize as listas usadas nos cadastros.</p>
        </div>
      </div>
      <section className="cartao">
        <div className="grade-form">
          <Campo rotulo="Nome da empresa" dica="Aparece no painel e nas apresentações.">
            <input id="cfg-empresa" defaultValue={config.empresa} onBlur={(e) => e.target.value.trim() && e.target.value !== config.empresa && mudar({ empresa: e.target.value.trim() })} />
          </Campo>
          <Campo rotulo="Onde os dados ficam salvos">
            <input id="cfg-modo" readOnly value={backend?.modo === 'servidor' ? 'No servidor (todos os acessos veem os mesmos dados)' : 'Neste navegador (modo protótipo)'} />
          </Campo>
        </div>
      </section>
      <div className="grade-2">
        <ListaEditavel titulo="Tipos de serviço" itens={config.tiposServico} aoMudar={(tiposServico) => mudar({ tiposServico })} dica="Os serviços que você oferece. Crie novos sempre que lançar um serviço." />
        <ListaEditavel titulo="Áreas dos processos" itens={config.areasProcesso} aoMudar={(areasProcesso) => mudar({ areasProcesso })} dica="Agrupam os processos da empresa." />
        <ListaEditavel titulo="Categorias de entrada" itens={config.categoriasEntrada} aoMudar={(categoriasEntrada) => mudar({ categoriasEntrada })} dica="Tipos de recebimento no caixa." />
        <ListaEditavel titulo="Categorias de saída" itens={config.categoriasSaida} aoMudar={(categoriasSaida) => mudar({ categoriasSaida })} dica="Tipos de despesa no caixa." />
      </div>
    </div>
  );
};
