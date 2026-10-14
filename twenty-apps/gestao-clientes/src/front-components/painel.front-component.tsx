import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';
import { useTheme } from 'twenty-ui/theme';

import { STATUS_ENTREGA } from 'src/constants/status-entrega';
import { STATUS_ENTREGA_ABERTOS } from 'src/constants/status-entrega-abertos';
import { PAINEL_FRONT_COMPONENT_UID } from 'src/constants/universal-identifiers';
import { Botao } from 'src/front-components/components/botao';
import { type DadosPainel, type EntregaPainel } from 'src/types/dados-painel';
import { carregarPainel } from 'src/utils/carregar-painel.util';
import { diasAte } from 'src/utils/dias-ate.util';
import { formatarData } from 'src/utils/formatar-data.util';
import { formatarMoeda } from 'src/utils/formatar-moeda.util';
import { valorMensal } from 'src/utils/valor-mensal.util';

const DIAS_PROXIMOS_PRAZOS = 7;
const DIAS_PROXIMAS_RENOVACOES = 30;

const abrir = (objeto: string, id: string) =>
  navigate(AppPath.RecordShowPage, { objectNameSingular: objeto, objectRecordId: id });

const Painel = () => {
  const theme = useTheme();
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    carregarPainel()
      .then(setDados)
      .catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : String(falha)))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(recarregar, [recarregar]);

  const cartao = (conteudo: ReactNode, titulo: string, extra?: ReactNode) => (
    <section
      style={{
        background: theme.background.primary,
        border: `1px solid ${theme.border.color.medium}`,
        borderRadius: theme.border.radius.md,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          alignItems: 'center',
          borderBottom: `1px solid ${theme.border.color.light}`,
          display: 'flex',
          fontWeight: 600,
          justifyContent: 'space-between',
          padding: '10px 14px',
        }}
      >
        {titulo}
        {extra}
      </header>
      <div style={{ minHeight: 0, overflow: 'auto' }}>{conteudo}</div>
    </section>
  );

  const etiqueta = (texto: string, cor: string) => (
    <span
      style={{
        background: (theme.tag.background as Record<string, string>)[cor],
        borderRadius: theme.border.radius.sm,
        color: (theme.tag.text as Record<string, string>)[cor],
        fontSize: theme.font.size.xs,
        fontWeight: 500,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </span>
  );

  const linha = (chave: string, onClick: () => void, colunas: ReactNode[]) => (
    <div
      key={chave}
      onClick={onClick}
      style={{
        alignItems: 'center',
        borderBottom: `1px solid ${theme.border.color.light}`,
        cursor: 'pointer',
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'minmax(0, 1fr) auto auto',
        padding: '8px 14px',
      }}
    >
      {colunas}
    </div>
  );

  const vazio = (texto: string) => (
    <div style={{ color: theme.font.color.tertiary, padding: '16px 14px' }}>{texto}</div>
  );

  const linhaEntrega = (entrega: EntregaPainel, destaque: 'atraso' | 'prazo') => {
    const status = STATUS_ENTREGA[entrega.status ?? ''];
    const dias = entrega.prazo ? diasAte(entrega.prazo) : 0;
    return linha(entrega.id, () => abrir('entrega', entrega.id), [
      <div key="nome" style={{ minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entrega.name || 'Entrega sem nome'}
        </div>
        <div style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm }}>
          {entrega.cliente?.name ?? 'Sem cliente'}
        </div>
      </div>,
      status ? <span key="status">{etiqueta(status.label, status.color)}</span> : <span key="status" />,
      <span
        key="prazo"
        style={{
          color: destaque === 'atraso' ? theme.font.color.danger : theme.font.color.secondary,
          fontSize: theme.font.size.sm,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {formatarData(entrega.prazo)}
        {destaque === 'atraso' ? ` · ${-dias}d atrasada` : dias === 0 ? ' · hoje' : ` · em ${dias}d`}
      </span>,
    ]);
  };

  if (carregando && !dados) {
    return <div style={{ color: theme.font.color.tertiary, padding: 32, textAlign: 'center' }}>Carregando painel…</div>;
  }
  if (erro || !dados) {
    return (
      <div style={{ color: theme.font.color.danger, padding: 32, textAlign: 'center' }}>
        Erro ao carregar o painel: {erro}
      </div>
    );
  }

  const comPrazo = dados.entregasAbertas.filter((entrega) => entrega.prazo);
  const atrasadas = comPrazo.filter((entrega) => diasAte(entrega.prazo as string) < 0);
  const proximas = comPrazo.filter((entrega) => {
    const dias = diasAte(entrega.prazo as string);
    return dias >= 0 && dias <= DIAS_PROXIMOS_PRAZOS;
  });
  const renovacoes = dados.servicosAtivos
    .filter((servico) => {
      if (!servico.dataRenovacao) {
        return false;
      }
      const dias = diasAte(servico.dataRenovacao);
      return dias >= 0 && dias <= DIAS_PROXIMAS_RENOVACOES;
    })
    .sort((a, b) => (a.dataRenovacao ?? '').localeCompare(b.dataRenovacao ?? ''));
  const receitaMensal = dados.servicosAtivos.reduce(
    (soma, servico) => soma + valorMensal(servico.valor, servico.recorrencia),
    0,
  );
  const moeda = dados.servicosAtivos.find((servico) => servico.valor?.currencyCode)?.valor?.currencyCode ?? 'BRL';
  const porStatus = STATUS_ENTREGA_ABERTOS.map((valor) => ({
    valor,
    ...STATUS_ENTREGA[valor],
    total: dados.entregasAbertas.filter((entrega) => entrega.status === valor).length,
  }));
  const totalAbertas = dados.entregasAbertas.length;

  const indicador = (rotulo: string, valor: string, cor?: string, ajuda?: string) => (
    <div
      style={{
        background: theme.background.primary,
        border: `1px solid ${theme.border.color.medium}`,
        borderRadius: theme.border.radius.md,
        padding: '12px 14px',
      }}
    >
      <div style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm }}>{rotulo}</div>
      <div style={{ color: cor ?? theme.font.color.primary, fontSize: theme.font.size.xl, fontWeight: 600, marginTop: 2 }}>
        {valor}
      </div>
      {ajuda ? <div style={{ color: theme.font.color.light, fontSize: theme.font.size.xs }}>{ajuda}</div> : null}
    </div>
  );

  return (
    <main
      style={{
        background: theme.background.secondary,
        boxSizing: 'border-box',
        color: theme.font.color.primary,
        display: 'grid',
        fontFamily: 'Inter, sans-serif',
        gap: 12,
        gridTemplateRows: 'auto auto auto minmax(0, 1fr)',
        height: '100%',
        overflow: 'hidden',
        padding: 16,
        width: '100%',
      }}
    >
      <header style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: theme.font.size.xl, margin: 0, marginRight: 'auto' }}>Painel de clientes e entregas</h1>
        <Botao onClick={() => navigate(AppPath.RecordIndexPage, { objectNamePlural: 'entregas' })}>Entregas</Botao>
        <Botao onClick={() => navigate(AppPath.RecordIndexPage, { objectNamePlural: 'companies' })}>Clientes</Botao>
        <Botao onClick={() => navigate(AppPath.RecordIndexPage, { objectNamePlural: 'mapasMentais' })}>Mapas mentais</Botao>
        <Botao variante="primario" onClick={recarregar} desabilitado={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </Botao>
      </header>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        {indicador('Clientes ativos', String(dados.clientesAtivos))}
        {indicador('Receita recorrente / mês', formatarMoeda(receitaMensal, moeda), undefined, 'Serviços ativos e em onboarding')}
        {indicador('Entregas em aberto', String(totalAbertas))}
        {indicador('Atrasadas', String(atrasadas.length), atrasadas.length > 0 ? theme.font.color.danger : undefined)}
        {indicador('Entregues (30 dias)', String(dados.entreguesNoMes), theme.tag.text.green)}
      </div>

      <div
        style={{
          background: theme.background.primary,
          border: `1px solid ${theme.border.color.medium}`,
          borderRadius: theme.border.radius.md,
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: theme.background.tertiary }}>
          {porStatus
            .filter((item) => item.total > 0)
            .map((item) => (
              <div
                key={item.valor}
                title={`${item.label}: ${item.total}`}
                style={{
                  background: (theme.tag.text as Record<string, string>)[item.color],
                  width: `${(item.total / Math.max(1, totalAbertas)) * 100}%`,
                }}
              />
            ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {porStatus.map((item) => (
            <span key={item.valor} style={{ alignItems: 'center', display: 'inline-flex', gap: 6, fontSize: theme.font.size.sm }}>
              {etiqueta(item.label, item.color)}
              <strong>{item.total}</strong>
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          minHeight: 0,
        }}
      >
        {cartao(
          atrasadas.length > 0 ? atrasadas.map((entrega) => linhaEntrega(entrega, 'atraso')) : vazio('Nenhuma entrega atrasada. 🎉'),
          `Atrasadas (${atrasadas.length})`,
        )}
        {cartao(
          proximas.length > 0 ? proximas.map((entrega) => linhaEntrega(entrega, 'prazo')) : vazio(`Nada vencendo nos próximos ${DIAS_PROXIMOS_PRAZOS} dias.`),
          `Próximos ${DIAS_PROXIMOS_PRAZOS} dias (${proximas.length})`,
        )}
        {cartao(
          renovacoes.length > 0
            ? renovacoes.map((servico) =>
                linha(servico.id, () => abrir('servicoContratado', servico.id), [
                  <div key="nome" style={{ minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {servico.name || 'Serviço'}
                    </div>
                    <div style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm }}>
                      {servico.cliente?.name ?? 'Sem cliente'}
                    </div>
                  </div>,
                  <span key="valor" style={{ fontSize: theme.font.size.sm }}>
                    {servico.valor?.amountMicros
                      ? formatarMoeda(servico.valor.amountMicros / 1_000_000, servico.valor.currencyCode ?? 'BRL')
                      : ''}
                  </span>,
                  <span key="data" style={{ color: theme.font.color.secondary, fontSize: theme.font.size.sm }}>
                    {formatarData(servico.dataRenovacao)}
                  </span>,
                ]),
              )
            : vazio(`Nenhuma renovação nos próximos ${DIAS_PROXIMAS_RENOVACOES} dias.`),
          `Renovações em ${DIAS_PROXIMAS_RENOVACOES} dias (${renovacoes.length})`,
        )}
      </div>
    </main>
  );
};

export default defineFrontComponent({
  universalIdentifier: PAINEL_FRONT_COMPONENT_UID,
  name: 'painel-gestao-clientes',
  description: 'Painel com indicadores de clientes, receita e entregas',
  component: Painel,
});
