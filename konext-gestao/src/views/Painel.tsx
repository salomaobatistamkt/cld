import { AlertTriangle, ArrowRight, Briefcase, CalendarClock, CircleDollarSign, LayoutDashboard, PenTool, TrendingUp, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import { CardEntrega } from '@/components/Kanban';
import { Avatar, Kpi, Tag, Vazio } from '@/components/ui';
import { STATUS_ENTREGA } from '@/lib/constantes';
import { cobrancasDoMes, receitaRecorrente, saldo, valorMensal } from '@/lib/financeiro';
import { useStore } from '@/lib/store';
import { diasAte, formatarData, formatarMoeda, hojeISO, prazoRelativo } from '@/lib/util';

import { FaixaExemplos } from './FaixaExemplos';

const saudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

export const Painel = () => {
  const { dados, ir } = useStore();
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);

  const resumo = useMemo(() => {
    const ativos = dados.clientes.filter((c) => c.status === 'ativo' || c.status === 'onboarding');
    const abertas = dados.entregas.filter((e) => e.status !== 'entregue');
    const atrasadas = abertas.filter((e) => e.prazo && diasAte(e.prazo) < 0);
    const semana = abertas
      .filter((e) => e.prazo && diasAte(e.prazo) >= 0 && diasAte(e.prazo) <= 7)
      .sort((a, b) => a.prazo.localeCompare(b.prazo));
    const cobrancas = cobrancasDoMes(mes, dados.servicos, dados.lancamentos);
    const recebidas = cobrancas.filter((c) => c.lancamento?.pago);
    const aReceber = cobrancas.filter((c) => !c.lancamento?.pago);
    return {
      ativos,
      abertas,
      atrasadas,
      semana,
      cobrancas,
      recebido: recebidas.reduce((s, c) => s + (c.lancamento?.valor ?? c.servico.valor), 0),
      aReceber: aReceber.reduce((s, c) => s + c.servico.valor, 0),
      mrr: receitaRecorrente(dados.servicos),
      saldo: saldo(dados.lancamentos),
    };
  }, [dados, mes]);

  const nomeCliente = (id: string) => dados.clientes.find((c) => c.id === id);

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <LayoutDashboard size={26} /> {saudacao()}!
          </h1>
          <p>
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} · aqui está o resumo da{' '}
            {dados.config.empresa}.
          </p>
        </div>
        <div className="acoes">
          <button type="button" className="btn" onClick={() => ir({ tela: 'quadros' })}>
            <PenTool size={16} /> Nova estratégia
          </button>
          <button type="button" className="btn primario" onClick={() => ir({ tela: 'clientes' })}>
            <Briefcase size={16} /> Clientes
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi icone={<Briefcase size={15} />} rotulo="Clientes ativos" valor={String(resumo.ativos.length)} detalhe={`${dados.clientes.length} cadastrados`} />
        <Kpi icone={<TrendingUp size={15} />} rotulo="Receita recorrente / mês" valor={formatarMoeda(resumo.mrr, true)} detalhe="Serviços ativos com recorrência" />
        <Kpi icone={<CircleDollarSign size={15} />} rotulo="A receber este mês" valor={formatarMoeda(resumo.aReceber, true)} detalhe={`${formatarMoeda(resumo.recebido, true)} já recebidos`} />
        <Kpi icone={<Wallet size={15} />} rotulo="Saldo em caixa" valor={formatarMoeda(resumo.saldo, true)} tom={resumo.saldo < 0 ? 'alerta' : undefined} detalhe="Entradas pagas − saídas pagas" />
        <Kpi
          icone={<AlertTriangle size={15} />}
          rotulo="Entregas atrasadas"
          valor={String(resumo.atrasadas.length)}
          tom={resumo.atrasadas.length ? 'alerta' : 'bom'}
          detalhe={`${resumo.abertas.length} entregas em aberto`}
        />
      </div>

      <div className="grade-2">
        <section className="cartao">
          <div className="cartao-titulo">
            <h2>
              <CalendarClock size={17} /> Entregas dos próximos 7 dias
            </h2>
            <button type="button" className="btn fantasma pequeno" onClick={() => ir({ tela: 'entregas' })}>
              Ver quadro <ArrowRight size={14} />
            </button>
          </div>
          {resumo.atrasadas.length + resumo.semana.length === 0 ? (
            <Vazio texto="Nenhuma entrega com prazo nesta semana." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...resumo.atrasadas, ...resumo.semana].slice(0, 7).map((entrega) => (
                <CardEntrega key={entrega.id} entrega={entrega} mostrarCliente aoAbrir={() => ir({ tela: 'cliente', id: entrega.clienteId, aba: 'entregas' })} />
              ))}
            </div>
          )}
        </section>

        <section className="cartao">
          <div className="cartao-titulo">
            <h2>
              <CircleDollarSign size={17} /> Pagamentos de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}
            </h2>
            <button type="button" className="btn fantasma pequeno" onClick={() => ir({ tela: 'caixa' })}>
              Abrir caixa <ArrowRight size={14} />
            </button>
          </div>
          {resumo.cobrancas.length === 0 ? (
            <Vazio texto="Nenhum serviço recorrente ativo. Cadastre serviços nos clientes." />
          ) : (
            <div className="lista">
              {resumo.cobrancas.map(({ servico, data, lancamento }) => {
                const cliente = nomeCliente(servico.clienteId);
                const pago = Boolean(lancamento?.pago);
                const dias = diasAte(data, hoje);
                return (
                  <div key={servico.id} className="linha clicavel" onClick={() => ir({ tela: 'cliente', id: servico.clienteId, aba: 'financeiro' })}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      {cliente ? <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={32} /> : null}
                      <div style={{ minWidth: 0 }}>
                        <div className="titulo">{cliente?.nome ?? 'Cliente removido'}</div>
                        <div className="sub">
                          Dia {Number(data.slice(8))} · {servico.nome}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 800 }}>
                        {formatarMoeda(servico.valor)}
                      </div>
                      {pago ? (
                        <span className="tag green">Recebido</span>
                      ) : dias < 0 ? (
                        <span className="tag red">Atrasado</span>
                      ) : (
                        <span className="tag amber">{dias === 0 ? 'Vence hoje' : `Vence ${formatarData(data)}`}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="cartao">
        <div className="cartao-titulo">
          <h2>
            <Briefcase size={17} /> Clientes e andamento
          </h2>
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviços</th>
                <th>Entregas</th>
                <th>Próximo prazo</th>
                <th style={{ textAlign: 'right' }}>Valor mensal</th>
              </tr>
            </thead>
            <tbody>
              {dados.clientes
                .filter((c) => c.status !== 'encerrado')
                .map((cliente) => {
                  const servicos = dados.servicos.filter((s) => s.clienteId === cliente.id && s.status === 'ativo');
                  const entregas = dados.entregas.filter((e) => e.clienteId === cliente.id);
                  const feitas = entregas.filter((e) => e.status === 'entregue').length;
                  const proxima = entregas
                    .filter((e) => e.status !== 'entregue' && e.prazo)
                    .sort((a, b) => a.prazo.localeCompare(b.prazo))[0];
                  return (
                    <tr key={cliente.id} style={{ cursor: 'pointer' }} onClick={() => ir({ tela: 'cliente', id: cliente.id })}>
                      <td>
                        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={28} />
                          <b>{cliente.nome}</b>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {servicos.length ? servicos.map((s) => <span key={s.id} className="chip">{s.tipo}</span>) : <span className="muted">—</span>}
                        </span>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="progresso" title={`${feitas} de ${entregas.length} entregues`}>
                          <div style={{ width: `${entregas.length ? (feitas / entregas.length) * 100 : 0}%`, background: 'var(--good)' }} />
                        </div>
                        <small className="muted num">
                          {feitas}/{entregas.length} entregues
                        </small>
                      </td>
                      <td>
                        {proxima ? (
                          <span>
                            <Tag rotulo={STATUS_ENTREGA[proxima.status]} /> <small className="muted">{prazoRelativo(proxima.prazo)}</small>
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatarMoeda(servicos.reduce((soma, s) => soma + valorMensal(s), 0))}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
