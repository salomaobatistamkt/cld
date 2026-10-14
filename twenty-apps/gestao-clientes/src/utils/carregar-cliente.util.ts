import { type DadosCliente } from 'src/types/dados-cliente';
import { type Conexao } from 'src/types/no-conexao';
import { consultar } from 'src/utils/consultar.util';
import { nosDaConexao } from 'src/utils/nos-da-conexao.util';

type Item = { id: string; name: string | null };
type EntregaBruta = Item & { status: string | null; servicoContratado: { id: string } | null };
type ClienteBruto = Omit<
  DadosCliente,
  'servicos' | 'entregasAvulsas' | 'acessos' | 'reunioes' | 'mapas'
> & {
  servicosContratados: Conexao<Item & { status: string | null; tipoDeServico: { name: string | null } | null }>;
  entregas: Conexao<EntregaBruta>;
  acessos: Conexao<Item & { categoria: string | null }>;
  reunioes: Conexao<Item & { data: string | null }>;
  mapasMentais: Conexao<Item>;
};

export const carregarCliente = async (id: string): Promise<DadosCliente | null> => {
  const resultado = await consultar<{ companies?: Conexao<ClienteBruto> }>({
    companies: {
      __args: { filter: { id: { eq: id } }, first: 1 },
      edges: {
        node: {
          id: true,
          name: true,
          statusCliente: true,
          segmento: true,
          publicoAlvo: true,
          tomDeVoz: true,
          objetivos: true,
          concorrentes: true,
          coresDaMarca: true,
          servicosContratados: {
            __args: { first: 50 },
            edges: { node: { id: true, name: true, status: true, tipoDeServico: { name: true } } },
          },
          entregas: {
            __args: { first: 200 },
            edges: { node: { id: true, name: true, status: true, servicoContratado: { id: true } } },
          },
          acessos: { __args: { first: 50 }, edges: { node: { id: true, name: true, categoria: true } } },
          reunioes: { __args: { first: 50 }, edges: { node: { id: true, name: true, data: true } } },
          mapasMentais: { __args: { first: 50 }, edges: { node: { id: true, name: true } } },
        },
      },
    },
  });
  const bruto = nosDaConexao(resultado.companies)[0];
  if (!bruto) {
    return null;
  }
  const entregas = nosDaConexao(bruto.entregas);
  return {
    ...bruto,
    servicos: nosDaConexao(bruto.servicosContratados).map((servico) => ({
      id: servico.id,
      name: servico.name,
      status: servico.status,
      tipo: servico.tipoDeServico?.name ?? null,
      entregas: entregas.filter((entrega) => entrega.servicoContratado?.id === servico.id),
    })),
    entregasAvulsas: entregas.filter((entrega) => !entrega.servicoContratado),
    acessos: nosDaConexao(bruto.acessos),
    reunioes: nosDaConexao(bruto.reunioes).sort((a, b) =>
      (b.data ?? '').localeCompare(a.data ?? ''),
    ),
    mapas: nosDaConexao(bruto.mapasMentais),
  };
};
