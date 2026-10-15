import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Receipt, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormLancamento, novoLancamento } from '@/components/formularios';
import { Kpi, Vazio } from '@/components/ui';
import { mesesAnteriores, saldo, totaisDoMes } from '@/lib/financeiro';
import { useStore } from '@/lib/store';
import { type Lancamento } from '@/lib/types';
import { diasAte, formatarData, formatarMoeda, hojeISO, nomeMes } from '@/lib/util';

import { Cobrancas } from './Cobrancas';
import { FaixaExemplos } from './FaixaExemplos';

const deslocarMes = (mesISO: string, delta: number) => {
  const [a, m] = mesISO.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
};

export const Caixa = () => {
  const { dados } = useStore();
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida' | 'pendentes'>('todos');
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const totais = totaisDoMes(dados.lancamentos, mes);
  const meses = mesesAnteriores(6, `${mes}-01`);
  const historico = meses.map((m) => ({ mes: m, ...totaisDoMes(dados.lancamentos, m) }));
  const maximo = Math.max(1, ...historico.flatMap((h) => [h.entradas + h.aReceber, h.saidas + h.aPagar]));

  const lancamentos = useMemo(
    () =>
      dados.lancamentos
        .filter((l) => l.data.slice(0, 7) === mes)
        .filter((l) => (filtro === 'todos' ? true : filtro === 'pendentes' ? !l.pago : l.tipo === filtro))
        .sort((a, b) => a.data.localeCompare(b.data)),
    [dados.lancamentos, mes, filtro],
  );

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <Wallet size={26} /> Caixa
          </h1>
          <p>Entradas, saídas e cobranças dos clientes.</p>
        </div>
        <div className="acoes">
          <button type="button" className="btn" onClick={() => setEditando(novoLancamento('saida', dados.config.categoriasSaida[0] ?? 'Outros'))}>
            <ArrowDownCircle size={16} color="var(--tag-red)" /> Nova saída
          </button>
          <button type="button" className="btn primario" onClick={() => setEditando(novoLancamento('entrada', dados.config.categoriasEntrada[0] ?? 'Outros'))}>
            <ArrowUpCircle size={16} /> Nova entrada
          </button>
        </div>
      </div>

      <div className="acoes">
        <div className="segmentado">
          <button type="button" onClick={() => setMes(deslocarMes(mes, -1))} aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="ativo" style={{ minWidth: 110, justifyContent: 'center' }} onClick={() => setMes(hojeISO().slice(0, 7))}>
            {(() => {
              const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mes}-01T12:00:00Z`));
              return texto.charAt(0).toUpperCase() + texto.slice(1);
            })()}
          </button>
          <button type="button" onClick={() => setMes(deslocarMes(mes, 1))} aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi icone={<Wallet size={15} />} rotulo="Saldo em caixa hoje" valor={formatarMoeda(saldo(dados.lancamentos), true)} tom={saldo(dados.lancamentos) < 0 ? 'alerta' : undefined} />
        <Kpi icone={<ArrowUpCircle size={15} />} rotulo="Recebido no mês" valor={formatarMoeda(totais.entradas, true)} tom="bom" detalhe={`${formatarMoeda(totais.aReceber)} a receber`} />
        <Kpi icone={<ArrowDownCircle size={15} />} rotulo="Pago no mês" valor={formatarMoeda(totais.saidas, true)} detalhe={`${formatarMoeda(totais.aPagar)} a pagar`} />
        <Kpi
          icone={<Receipt size={15} />}
          rotulo="Resultado do mês"
          valor={formatarMoeda(totais.entradas - totais.saidas, true)}
          tom={totais.entradas - totais.saidas < 0 ? 'alerta' : 'bom'}
          detalhe="Recebido − pago"
        />
      </div>

      <Cobrancas mes={mes} />

      <section className="cartao">
        <div className="cartao-titulo">
          <h3>Entradas × saídas</h3>
          <div className="legenda">
            <span><i style={{ background: 'var(--good)' }} />Entradas</span>
            <span><i style={{ background: 'var(--bad)' }} />Saídas</span>
          </div>
        </div>
        <div className="barras">
          {historico.map((h) => (
            <div key={h.mes} className="barra-mes">
              <div className="barra-par">
                <div title={`Entradas: ${formatarMoeda(h.entradas + h.aReceber)}`} style={{ height: `${((h.entradas + h.aReceber) / maximo) * 100}%`, background: h.aReceber ? 'linear-gradient(var(--tag-green-bg), var(--good))' : 'var(--good)' }} />
                <div title={`Saídas: ${formatarMoeda(h.saidas + h.aPagar)}`} style={{ height: `${((h.saidas + h.aPagar) / maximo) * 100}%`, background: 'var(--bad)' }} />
              </div>
              <small className="muted" style={{ fontWeight: h.mes === mes ? 800 : 500, color: h.mes === mes ? 'var(--text)' : undefined }}>
                {nomeMes(h.mes)}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="cartao">
        <div className="cartao-titulo">
          <h3>Lançamentos de {nomeMes(mes)}</h3>
          <div className="segmentado">
            {(['todos', 'entrada', 'saida', 'pendentes'] as const).map((f) => (
              <button key={f} type="button" className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
                {{ todos: 'Todos', entrada: 'Entradas', saida: 'Saídas', pendentes: 'Pendentes' }[f]}
              </button>
            ))}
          </div>
        </div>
        {lancamentos.length === 0 ? (
          <Vazio texto="Nenhum lançamento neste mês." />
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Situação</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setEditando(l)}>
                    <td className="num">{formatarData(l.data)}</td>
                    <td>{l.descricao}</td>
                    <td><span className="chip">{l.categoria}</span></td>
                    <td>
                      {l.pago ? (
                        <span className="tag green">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</span>
                      ) : (
                        <span className={`tag ${diasAte(l.data) < 0 ? 'red' : 'amber'}`}>{diasAte(l.data) < 0 ? 'Atrasado' : 'Pendente'}</span>
                      )}
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 800, color: l.tipo === 'saida' ? 'var(--tag-red)' : 'var(--tag-green)' }}>
                      {l.tipo === 'saida' ? '− ' : '+ '}
                      {formatarMoeda(l.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editando ? <FormLancamento inicial={editando} aoFechar={() => setEditando(null)} /> : null}
    </div>
  );
};
