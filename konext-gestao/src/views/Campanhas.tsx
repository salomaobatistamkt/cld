import { Megaphone, Settings } from 'lucide-react';
import { useState } from 'react';

import { PainelCampanhas } from '@/components/PainelCampanhas';
import { Avatar, Vazio } from '@/components/ui';
import { useStore } from '@/lib/store';

import { FaixaExemplos } from './FaixaExemplos';

// Métricas do Meta Ads de cada cliente que tem conta de anúncios ligada.
export const Campanhas = () => {
  const { dados, ir } = useStore();
  const comConta = dados.clientes.filter((c) => c.metaContaId);
  const [selecionado, setSelecionado] = useState(comConta[0]?.id ?? '');
  const cliente = comConta.find((c) => c.id === selecionado) ?? comConta[0];

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <Megaphone size={26} /> Campanhas
          </h1>
          <p>O desempenho dos anúncios no Meta de cada cliente. Os números vêm da plataforma quando você clica em Atualizar.</p>
        </div>
        <button type="button" className="btn" onClick={() => ir({ tela: 'config', aba: 'integracoes' })}>
          <Settings size={16} /> Conexão com o Meta
        </button>
      </div>

      {comConta.length === 0 ? (
        <Vazio
          icone={<Megaphone size={28} />}
          texto="Nenhum cliente com conta de anúncios. Edite um cliente e informe a conta do Meta (act_…)."
          acao={<button type="button" className="btn" onClick={() => ir({ tela: 'clientes' })}>Ir para clientes</button>}
        />
      ) : (
        <>
          <div className="seletor-clientes" role="tablist" aria-label="Clientes">
            {comConta.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cliente?.id === c.id} className={cliente?.id === c.id ? 'ativo' : ''} onClick={() => setSelecionado(c.id)}>
                <Avatar nome={c.nome} cor={c.cor} tamanho={26} />
                {c.nome}
              </button>
            ))}
          </div>
          {cliente ? (
            <section className="cartao">
              <PainelCampanhas key={cliente.id} contaId={cliente.metaContaId} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
};
