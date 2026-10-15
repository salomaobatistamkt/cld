import { Info } from 'lucide-react';
import { useState } from 'react';

import { Confirmar } from '@/components/ui';
import { dadosVazios, useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

// Aviso enquanto o sistema mostra os dados de demonstração.
export const FaixaExemplos = () => {
  const { usandoExemplos, substituirTudo, dados } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const [confirmar, setConfirmar] = useState(false);
  if (!usandoExemplos) return null;
  return (
    <div className="faixa">
      <Info size={18} color="#93c5fd" />
      <p>
        <b>Você está vendo dados de exemplo.</b> Explore à vontade: nada disso é real. Quando quiser começar com seus clientes, apague os exemplos.
      </p>
      <button type="button" className="btn primario" onClick={() => setConfirmar(true)}>
        Começar do zero
      </button>
      {confirmar ? (
        <Confirmar
          texto="Apagar todos os clientes, serviços, entregas, quadros, lançamentos e processos de exemplo? As configurações (tipos de serviço, categorias) ficam."
          rotuloAcao="Apagar exemplos"
          aoCancelar={() => setConfirmar(false)}
          aoConfirmar={() => {
            substituirTudo({ ...dadosVazios(), config: dados.config }, false);
            setConfirmar(false);
            mostrar('Pronto! Agora é só cadastrar seu primeiro cliente.');
          }}
        />
      ) : null}
    </div>
  );
};
