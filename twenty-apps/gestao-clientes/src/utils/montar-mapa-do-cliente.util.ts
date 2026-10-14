import { STATUS_ENTREGA } from 'src/constants/status-entrega';
import { STATUS_SERVICO } from 'src/constants/status-servico';
import { type DadosCliente } from 'src/types/dados-cliente';
import { type NoMapa } from 'src/types/no-mapa';

const MAX_REUNIOES = 5;

const no = (
  id: string,
  texto: string,
  filhos: NoMapa[] = [],
  extra: Partial<NoMapa> = {},
): NoMapa => ({ id, texto, filhos, ...extra });

const vazio = (id: string, texto: string) =>
  no(id, texto, [], { cor: 'gray' });

const noEntrega = (entrega: DadosCliente['entregasAvulsas'][number]) => {
  const status = STATUS_ENTREGA[entrega.status ?? ''];
  return no(
    `entrega-${entrega.id}`,
    `${entrega.name || 'Entrega sem nome'}${status ? ` · ${status.label}` : ''}`,
    [],
    {
      ...(status ? { cor: status.color } : {}),
      registro: { objeto: 'entrega', id: entrega.id },
    },
  );
};

// Mapa (somente leitura) gerado a partir dos dados do cliente: serviços com
// suas entregas, briefing, acessos, reuniões recentes e mapas de planejamento.
export const montarMapaDoCliente = (dados: DadosCliente): NoMapa => {
  const briefing = [
    ['Segmento', dados.segmento],
    ['Público-alvo', dados.publicoAlvo],
    ['Tom de voz', dados.tomDeVoz],
    ['Objetivos', dados.objetivos],
    ['Concorrentes', dados.concorrentes],
    ['Marca', dados.coresDaMarca],
  ]
    .filter((par): par is [string, string] => Boolean(par[1]?.trim()))
    .map(([rotulo, valor]) => no(`briefing-${rotulo}`, `${rotulo}: ${valor.trim()}`));

  const servicos = dados.servicos.map((servico) => {
    const status = STATUS_SERVICO[servico.status ?? ''];
    const rotulo = [servico.name || 'Serviço sem nome', servico.tipo, status?.label]
      .filter(Boolean)
      .join(' · ');
    return no(
      `servico-${servico.id}`,
      rotulo,
      servico.entregas.length > 0
        ? servico.entregas.map(noEntrega)
        : [vazio(`servico-${servico.id}-vazio`, 'Sem entregas ainda')],
      { registro: { objeto: 'servicoContratado', id: servico.id } },
    );
  });

  const ramos: NoMapa[] = [
    no(
      'ramo-servicos',
      `Serviços (${dados.servicos.length})`,
      servicos.length > 0 ? servicos : [vazio('servicos-vazio', 'Nenhum serviço contratado')],
    ),
  ];

  if (dados.entregasAvulsas.length > 0) {
    ramos.push(
      no(
        'ramo-avulsas',
        `Entregas sem serviço (${dados.entregasAvulsas.length})`,
        dados.entregasAvulsas.map(noEntrega),
      ),
    );
  }

  ramos.push(
    no(
      'ramo-briefing',
      'Briefing',
      briefing.length > 0 ? briefing : [vazio('briefing-vazio', 'Preencha o briefing na ficha')],
    ),
    no(
      'ramo-acessos',
      `Acessos (${dados.acessos.length})`,
      dados.acessos.length > 0
        ? dados.acessos.map((acesso) =>
            no(`acesso-${acesso.id}`, acesso.name || 'Acesso', [], {
              registro: { objeto: 'acesso', id: acesso.id },
            }),
          )
        : [vazio('acessos-vazio', 'Nenhum acesso cadastrado')],
    ),
    no(
      'ramo-reunioes',
      `Reuniões (${dados.reunioes.length})`,
      dados.reunioes.length > 0
        ? dados.reunioes.slice(0, MAX_REUNIOES).map((reuniao) =>
            no(
              `reuniao-${reuniao.id}`,
              `${reuniao.data ? `${reuniao.data.slice(8, 10)}/${reuniao.data.slice(5, 7)} · ` : ''}${reuniao.name || 'Reunião'}`,
              [],
              { registro: { objeto: 'reuniao', id: reuniao.id } },
            ),
          )
        : [vazio('reunioes-vazio', 'Nenhuma reunião registrada')],
    ),
  );

  if (dados.mapas.length > 0) {
    ramos.push(
      no(
        'ramo-mapas',
        `Mapas de planejamento (${dados.mapas.length})`,
        dados.mapas.map((mapa) =>
          no(`mapa-${mapa.id}`, mapa.name || 'Mapa mental', [], {
            registro: { objeto: 'mapaMental', id: mapa.id },
          }),
        ),
      ),
    );
  }

  return no(`cliente-${dados.id}`, dados.name || 'Cliente', ramos);
};
