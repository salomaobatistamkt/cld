import { useMemo } from 'react';
import { useStore } from './store';
import { calcularPreco, calcularReceita, calcularOperacao } from './calculations';

/** Estado usado nas contas + atalhos de cálculo, sempre atualizado com a loja. */
export const useCalculo = () => {
  const ingredientes = useStore((s) => s.ingredientes);
  const embalagens = useStore((s) => s.embalagens);
  const receitas = useStore((s) => s.receitas);
  const config = useStore((s) => s.config);

  return useMemo(() => {
    const estado = { ingredientes, embalagens, receitas, config };
    return {
      estado,
      operacao: calcularOperacao(config),
      custo: (id) => calcularReceita(id, estado),
      preco: (id, opcoes) => calcularPreco(id, estado, opcoes),
    };
  }, [ingredientes, embalagens, receitas, config]);
};
