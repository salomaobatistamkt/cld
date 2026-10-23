import React, { useMemo } from 'react';
import { ArrowRight, CalendarCheck2, Coins, Package2, PiggyBank, Plus, Timer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { useCalculo } from '@/lib/hooks';
import { calcularResultadoPedidos, resumoCaixa, totalPedido } from '@/lib/calculations';
import { Cartao, Kpi, Tag, Vazio, brl, dataCurta, mesAtual, pct } from './ui';

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const hojeISO = () => new Date().toISOString().slice(0, 10);

export const Painel = ({ ir }) => {
  const pedidos = useStore((s) => s.pedidos);
  const tarefas = useStore((s) => s.tarefas);
  const caixa = useStore((s) => s.caixa);
  const receitas = useStore((s) => s.receitas);
  const { estado, preco } = useCalculo();
  const mes = mesAtual();
  const noMes = (d) => d?.startsWith(mes);

  const resultado = useMemo(() => calcularResultadoPedidos(pedidos, estado, noMes), [pedidos, estado, mes]);
  const cx = useMemo(() => resumoCaixa(caixa, noMes), [caixa, mes]);
  const proximos = useMemo(() => pedidos.filter((p) => p.status === 'pendente').sort((a, b) => a.data.localeCompare(b.data)), [pedidos]);
  const abertas = useMemo(
    () => tarefas.filter((t) => t.coluna !== 'feito').sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999')),
    [tarefas],
  );
  const ranking = useMemo(
    () => receitas.map((r) => ({ r, p: preco(r.id) })).filter((x) => x.p && x.p.lucroPorHora !== null).sort((a, b) => b.p.lucroPorHora - a.p.lucroPorHora).slice(0, 5),
    [receitas, preco],
  );
  const maiorHora = ranking[0]?.p.lucroPorHora || 1;
  const grafico = Object.entries(resultado.porReceita).map(([nome, d]) => ({ nome, Faturado: Number(d.receita.toFixed(2)), Custo: Number(d.custo.toFixed(2)) }));
  const nomeReceita = (id) => receitas.find((r) => r.id === id)?.nome || 'Receita removida';

  return (
    <div className="pagina">
      <section className="hero-painel">
        <div>
          <h1>{saudacao()}! Como está a cozinha hoje?</h1>
          <p>
            {proximos.length ? `${proximos.length} ${proximos.length === 1 ? 'pedido espera' : 'pedidos esperam'} entrega` : 'Nenhum pedido esperando entrega'}
            {abertas.length ? ` e ${abertas.length} ${abertas.length === 1 ? 'tarefa está' : 'tarefas estão'} em aberto.` : ' e nenhuma tarefa em aberto.'}
          </p>
          <div className="acoes">
            <button type="button" className="btn primario" onClick={() => ir('receitas', { nova: true })}><Plus size={16} />Adicionar receita</button>
            <button type="button" className="btn secundario" onClick={() => ir('pedidos')}>Ver pedidos</button>
          </div>
        </div>
        <div className="hero-marca" role="img" aria-label="Dueto CaCau" />
      </section>

      <div className="kpis">
        <Kpi icone={Coins} rotulo="Faturado no mês" valor={brl(resultado.receita)} rodape={`${resultado.unidades} ${resultado.unidades === 1 ? 'unidade entregue' : 'unidades entregues'}`} />
        <Kpi icone={PiggyBank} tom="vinho" rotulo="Lucro estimado do mês" valor={brl(resultado.lucro)} rodape={resultado.receita ? `${pct(resultado.margem, 1)} do faturado, já descontados todos os custos` : 'Aparece quando um pedido for entregue'} />
        <Kpi icone={Package2} rotulo="Pedidos a entregar" valor={String(proximos.length)} rodape={proximos[0] ? `Próximo: ${proximos[0].cliente}, ${dataCurta(proximos[0].data)}` : 'Tudo em dia'} />
        <Kpi destaque icone={CalendarCheck2} rotulo="Saldo do caixa no mês" valor={brl(cx.saldo)} rodape={`${brl(cx.entradas)} entrou · ${brl(cx.saidas)} saiu`} />
      </div>

      <div className="duas-colunas">
        <Cartao titulo="Próximas entregas" acoes={<button type="button" className="btn fantasma pequeno" onClick={() => ir('pedidos')}>Ver todas<ArrowRight size={14} /></button>}>
          {proximos.length === 0 ? <Vazio titulo="Sem entregas marcadas" texto="Quando um pedido for registrado, ele aparece aqui por ordem de data." /> : (
            <div className="lista-simples">
              {proximos.slice(0, 5).map((p) => (
                <div key={p.id}>
                  <div>
                    <strong>{p.cliente}</strong>
                    <div className="fraco" style={{ fontSize: 12.5 }}>{p.itens.map((i) => `${i.qtd}× ${nomeReceita(i.receitaId)}`).join(' · ')}</div>
                  </div>
                  <div className="direita">
                    <div className="num" style={{ fontWeight: 700 }}>{brl(totalPedido(p))}</div>
                    <Tag cor={p.data < hojeISO() ? 'vinho' : 'ouro'}>{p.data < hojeISO() ? 'Atrasado · ' : p.data === hojeISO() ? 'Hoje · ' : ''}{dataCurta(p.data)}</Tag>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <Cartao titulo="Tarefas em aberto" acoes={<button type="button" className="btn fantasma pequeno" onClick={() => ir('tarefas')}>Abrir quadro<ArrowRight size={14} /></button>}>
          {abertas.length === 0 ? <Vazio titulo="Nada pendente" texto="Crie uma tarefa para lembrar compras, produção ou entregas." /> : (
            <div className="lista-simples">
              {abertas.slice(0, 5).map((t) => (
                <div key={t.id}>
                  <div>
                    <strong>{t.titulo}</strong>
                    <div className="fraco" style={{ fontSize: 12.5 }}>{t.coluna === 'fazendo' ? 'Em andamento' : 'A fazer'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {t.prioridade === 'alta' ? <Tag cor="vinho">Urgente</Tag> : null}
                    {t.prazo ? <Tag cor={t.prazo < hojeISO() ? 'vinho' : 'cinza'}>{dataCurta(t.prazo)}</Tag> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </div>

      <div className="duas-colunas">
        <Cartao titulo="Quais receitas pagam melhor o seu tempo" descricao="Lucro por hora de trabalho, com os custos fixos já rateados." acoes={<button type="button" className="btn fantasma pequeno" onClick={() => ir('precificacao')}>Precificação<ArrowRight size={14} /></button>}>
          {ranking.length === 0 ? <Vazio icone={Timer} titulo="Sem dados ainda" texto="Informe o tempo de trabalho nas receitas para ver este ranking." /> : (
            <div className="lista-simples">
              {ranking.map(({ r, p }) => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</strong>
                      <span className="num" style={{ fontWeight: 700, color: p.lucroPorHora < 0 ? 'var(--ruim)' : 'var(--verde)' }}>{brl(p.lucroPorHora)}/h</span>
                    </div>
                    <div className="barra-meta" style={{ marginTop: 6 }}><i style={{ width: `${Math.max(Math.min((p.lucroPorHora / maiorHora) * 100, 100), 2)}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <Cartao titulo="Faturado e custo por receita" descricao="Pedidos entregues neste mês.">
          {grafico.length === 0 ? <Vazio titulo="Sem pedidos entregues no mês" texto="Marque um pedido como entregue para ver o gráfico." /> : (
            <div className="grafico">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e7dcc2" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#55584b' }} tickLine={false} axisLine={{ stroke: '#d6c79f' }} interval={0} tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)} />
                  <YAxis tick={{ fontSize: 12, fill: '#55584b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 10, border: '1px solid #d6c79f', background: '#fffcf4' }} cursor={{ fill: 'rgba(181,141,58,0.1)' }} />
                  <Bar dataKey="Faturado" fill="#1e3a29" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Custo" fill="#d6959b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
};
