import { STATUS_ENTREGA_ABERTOS } from 'src/constants/status-entrega-abertos';
import {
  type DadosPainel,
  type EntregaPainel,
  type ServicoPainel,
} from 'src/types/dados-painel';
import { type Conexao } from 'src/types/no-conexao';
import { consultar } from 'src/utils/consultar.util';
import { nosDaConexao } from 'src/utils/nos-da-conexao.util';

const isoDiasAtras = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString().slice(0, 10);
};

export const carregarPainel = async (): Promise<DadosPainel> => {
  const [ativos, abertas, entregues, servicos] = await Promise.all([
    consultar<{ companies?: { totalCount?: number } }>({
      companies: {
        __args: { filter: { statusCliente: { eq: 'ATIVO' } } },
        totalCount: true,
      },
    }),
    consultar<{ entregas?: Conexao<EntregaPainel> }>({
      entregas: {
        __args: {
          filter: { status: { in: STATUS_ENTREGA_ABERTOS } },
          orderBy: [{ prazo: 'AscNullsLast' }],
          first: 200,
        },
        edges: {
          node: {
            id: true,
            name: true,
            status: true,
            prazo: true,
            prioridade: true,
            cliente: { id: true, name: true },
          },
        },
      },
    }),
    consultar<{ entregas?: { totalCount?: number } }>({
      entregas: {
        __args: {
          filter: {
            status: { eq: 'ENTREGUE' },
            dataEntregue: { gte: isoDiasAtras(30) },
          },
        },
        totalCount: true,
      },
    }),
    consultar<{ servicosContratados?: Conexao<ServicoPainel> }>({
      servicosContratados: {
        __args: { filter: { status: { in: ['ATIVO', 'ONBOARDING'] } }, first: 200 },
        edges: {
          node: {
            id: true,
            name: true,
            status: true,
            recorrencia: true,
            dataRenovacao: true,
            valor: { amountMicros: true, currencyCode: true },
            cliente: { id: true, name: true },
          },
        },
      },
    }),
  ]);

  return {
    clientesAtivos: ativos.companies?.totalCount ?? 0,
    entregasAbertas: nosDaConexao(abertas.entregas),
    entreguesNoMes: entregues.entregas?.totalCount ?? 0,
    servicosAtivos: nosDaConexao(servicos.servicosContratados),
  };
};
