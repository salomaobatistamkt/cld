import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TIPOS_DE_SERVICO_INICIAIS } from 'src/constants/tipos-de-servico-iniciais';
import semearTiposDeServico from 'src/logic-functions/semear-tipos-de-servico.post-install';
import { type NoMapa } from 'src/types/no-mapa';
import { carregarCliente } from 'src/utils/carregar-cliente.util';
import { carregarPainel } from 'src/utils/carregar-painel.util';
import { consultar } from 'src/utils/consultar.util';
import { montarMapaDoCliente } from 'src/utils/montar-mapa-do-cliente.util';
import { mutar } from 'src/utils/mutar.util';

const hojeMais = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
};

const contarTipos = async () =>
  (
    await consultar<{ tiposDeServico: { totalCount: number } }>({
      tiposDeServico: { totalCount: true },
    })
  ).tiposDeServico.totalCount;

describe('Gestão de Clientes (servidor real)', () => {
  const ids = { cliente: '', servico: '', mapa: '', entregas: [] as string[] };

  beforeAll(async () => {
    const config = (semearTiposDeServico as unknown as { config: { handler: () => Promise<unknown> } }).config;
    await config.handler();
  });

  afterAll(async () => {
    if (ids.entregas.length) {
      await mutar({ destroyEntregas: { __args: { filter: { id: { in: ids.entregas } } }, id: true } });
    }
    if (ids.mapa) await mutar({ destroyMapaMental: { __args: { id: ids.mapa }, id: true } });
    if (ids.servico) await mutar({ destroyServicoContratado: { __args: { id: ids.servico }, id: true } });
    if (ids.cliente) await mutar({ destroyCompany: { __args: { id: ids.cliente }, id: true } });
  });

  it('o cadastro inicial de tipos de serviço é idempotente', async () => {
    const antes = await contarTipos();
    expect(antes).toBeGreaterThanOrEqual(TIPOS_DE_SERVICO_INICIAIS.length);
    const config = (semearTiposDeServico as unknown as { config: { handler: () => Promise<{ criados: number }> } }).config;
    expect(await config.handler()).toEqual({ criados: 0 });
    expect(await contarTipos()).toBe(antes);
  });

  it('cria cliente, serviço, entregas e mapa e lê tudo pelo mapa do cliente', async () => {
    const tipos = await consultar<{ tiposDeServico: { edges: Array<{ node: { id: string; name: string } }> } }>({
      tiposDeServico: { __args: { filter: { name: { eq: 'Marketing / Tráfego' } } }, edges: { node: { id: true, name: true } } },
    });
    const tipoId = tipos.tiposDeServico.edges[0].node.id;

    ids.cliente = (
      await mutar<{ createCompany: { id: string } }>({
        createCompany: {
          __args: {
            data: {
              name: 'Teste Integração Padaria',
              statusCliente: 'ATIVO',
              segmento: 'Alimentação',
              publicoAlvo: 'Moradores do bairro',
              whatsapp: { primaryPhoneNumber: '11999990000', primaryPhoneCountryCode: 'BR', primaryPhoneCallingCode: '+55' },
              redesSociais: { primaryLinkUrl: 'https://instagram.com/padaria' },
            },
          },
          id: true,
        },
      })
    ).createCompany.id;

    ids.servico = (
      await mutar<{ createServicoContratado: { id: string } }>({
        createServicoContratado: {
          __args: {
            data: {
              name: 'Gestão de tráfego',
              status: 'ATIVO',
              recorrencia: 'MENSAL',
              valor: { amountMicros: 2_500_000_000, currencyCode: 'BRL' },
              dataRenovacao: hojeMais(10),
              clienteId: ids.cliente,
              tipoDeServicoId: tipoId,
            },
          },
          id: true,
        },
      })
    ).createServicoContratado.id;

    const criadas = await mutar<{ createEntregas: Array<{ id: string }> }>({
      createEntregas: {
        __args: {
          data: [
            { name: 'Criativos', status: 'EM_PRODUCAO', prazo: hojeMais(3), clienteId: ids.cliente, servicoContratadoId: ids.servico },
            { name: 'Relatório atrasado', status: 'A_FAZER', prazo: hojeMais(-2), clienteId: ids.cliente, servicoContratadoId: ids.servico },
            { name: 'Ajuste avulso', status: 'ENTREGUE', dataEntregue: hojeMais(-1), clienteId: ids.cliente },
          ],
        },
        id: true,
      },
    });
    ids.entregas = criadas.createEntregas.map((entrega) => entrega.id);

    const conteudo: NoMapa = { id: 'r', texto: 'Plano', filhos: [{ id: 'f', texto: 'Ideia', filhos: [] }] };
    ids.mapa = (
      await mutar<{ createMapaMental: { id: string } }>({
        createMapaMental: { __args: { data: { name: 'Plano', clienteId: ids.cliente, conteudo } }, id: true },
      })
    ).createMapaMental.id;

    // O editor salva o conteúdo assim; o JSON precisa voltar idêntico.
    const atualizado = { ...conteudo, filhos: [...conteudo.filhos, { id: 'g', texto: 'Outra', filhos: [] }] };
    await mutar({ updateMapaMental: { __args: { id: ids.mapa, data: { conteudo: atualizado } }, id: true } });
    const lido = await consultar<{ mapasMentais: { edges: Array<{ node: { conteudo: unknown } }> } }>({
      mapasMentais: { __args: { filter: { id: { eq: ids.mapa } } }, edges: { node: { conteudo: true } } },
    });
    expect(lido.mapasMentais.edges[0].node.conteudo).toEqual(atualizado);

    const dados = await carregarCliente(ids.cliente);
    expect(dados?.servicos).toHaveLength(1);
    expect(dados?.servicos[0].tipo).toBe('Marketing / Tráfego');
    expect(dados?.servicos[0].entregas).toHaveLength(2);
    expect(dados?.entregasAvulsas.map((entrega) => entrega.name)).toEqual(['Ajuste avulso']);
    expect(dados?.mapas.map((mapa) => mapa.name)).toEqual(['Plano']);

    const mapa = montarMapaDoCliente(dados!);
    expect(mapa.texto).toBe('Teste Integração Padaria');
    expect(mapa.filhos.map((no) => no.id)).toContain('ramo-avulsas');
  });

  it('o painel encontra atrasadas, próximos prazos, renovação e receita', async () => {
    const painel = await carregarPainel();
    const nossas = painel.entregasAbertas.filter((entrega) => entrega.cliente?.id === ids.cliente);
    expect(nossas.map((entrega) => entrega.name).sort()).toEqual(['Criativos', 'Relatório atrasado']);
    expect(painel.clientesAtivos).toBeGreaterThanOrEqual(1);
    expect(painel.entreguesNoMes).toBeGreaterThanOrEqual(1);
    const servico = painel.servicosAtivos.find((item) => item.id === ids.servico);
    expect(servico?.valor?.amountMicros).toBe(2_500_000_000);
    expect(servico?.cliente?.id).toBe(ids.cliente);
  });
});
