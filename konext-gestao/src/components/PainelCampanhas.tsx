import { AlertTriangle, Megaphone, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { type CampanhaMeta, lerCampanhas, PERIODOS, type Periodo, totaisCampanhas } from '@/lib/meta';
import { useStore } from '@/lib/store';
import { formatarMoeda } from '@/lib/util';

import { Kpi, Vazio } from './ui';

const numero = new Intl.NumberFormat('pt-BR');
const pct = (valor: number | null) => (valor === null ? '—' : `${valor.toFixed(2).replace('.', ',')}%`);
const moeda = (valor: number | null) => (valor === null ? '—' : formatarMoeda(valor));

const ROTULO_STATUS: Record<CampanhaMeta['status'], string> = { ATIVA: 'green', PAUSADA: 'slate', ENCERRADA: 'red' };

type Props = { contaId: string; compacto?: boolean; aoConfigurar?: () => void };

// Métricas das campanhas de uma conta de anúncios. Os números vêm da Meta na
// hora (nada fica guardado); no protótipo são de demonstração.
export const PainelCampanhas = ({ contaId, compacto = false, aoConfigurar }: Props) => {
  const modo = useStore((estado) => estado.backend?.modo ?? 'local');
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campanhas, setCampanhas] = useState<CampanhaMeta[]>([]);
  const [demonstracao, setDemonstracao] = useState(false);

  const atualizar = useCallback(async () => {
    if (!contaId) return;
    setCarregando(true);
    setErro(null);
    const leitura = await lerCampanhas(modo, contaId, periodo);
    if (leitura.ok) {
      setCampanhas(leitura.campanhas);
      setDemonstracao(leitura.demonstracao);
    } else {
      setErro(leitura.erro);
    }
    setCarregando(false);
  }, [contaId, modo, periodo]);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  if (!contaId) {
    return (
      <Vazio
        icone={<Megaphone size={26} />}
        texto="Nenhuma conta de anúncios ligada a este cliente. Informe o ID da conta (act_…) na ficha do cliente."
        acao={aoConfigurar ? <button type="button" className="btn" onClick={aoConfigurar}>Informar conta</button> : undefined}
      />
    );
  }

  const t = totaisCampanhas(campanhas);
  const tipos = [...new Set(campanhas.filter((c) => c.custoPorResultado !== null).map((c) => c.tipoResultado))];
  const ordenadas = [...campanhas].sort((a, b) => b.investimento - a.investimento);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!compacto ? (
        <div className="acoes">
          <select id={`periodo-${contaId}`} className="input" style={{ width: 'auto' }} value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Período">
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={atualizar} disabled={carregando}>
            <RefreshCw size={15} className={carregando ? 'girando' : ''} /> {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Conta {contaId}
            {demonstracao ? ' · números de demonstração (conecte o Meta Ads quando o sistema estiver no servidor)' : ' · números lidos agora da Meta'}
          </span>
        </div>
      ) : null}

      {erro ? (
        <div className="faixa alerta">
          <AlertTriangle size={18} />
          <p>{erro}</p>
          <button type="button" className="btn pequeno" onClick={atualizar}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      <div className="kpis">
        <Kpi icone={<Megaphone size={15} />} rotulo="Investimento" valor={formatarMoeda(t.investimento)} detalhe={PERIODOS.find((p) => p.id === periodo)?.rotulo} />
        <Kpi icone={<Megaphone size={15} />} rotulo={tipos.length === 1 ? tipos[0] : 'Resultados'} valor={numero.format(t.resultados)} detalhe={`Custo por resultado: ${moeda(t.custoPorResultado)}`} />
        <Kpi icone={<Megaphone size={15} />} rotulo="Alcance" valor={numero.format(t.alcance)} detalhe={`${numero.format(t.impressoes)} impressões`} />
        <Kpi icone={<Megaphone size={15} />} rotulo="Cliques" valor={numero.format(t.cliques)} detalhe={`CTR ${pct(t.ctr)} · CPC ${moeda(t.cpc)}`} />
      </div>

      {campanhas.length === 0 && !carregando ? (
        <Vazio texto="Nenhuma campanha com dados neste período." />
      ) : (
        <div className="tabela-wrap">
          <table className="tabela tabela-campanhas">
            <thead>
              <tr>
                <th>Campanha</th>
                <th style={{ textAlign: 'right' }}>Investido</th>
                <th style={{ textAlign: 'right' }}>Resultados</th>
                <th style={{ textAlign: 'right' }}>Custo/result.</th>
                {!compacto ? (
                  <>
                    <th style={{ textAlign: 'right' }}>Alcance</th>
                    <th style={{ textAlign: 'right' }}>Impressões</th>
                    <th style={{ textAlign: 'right' }}>CPM</th>
                    <th style={{ textAlign: 'right' }}>CTR</th>
                    <th style={{ textAlign: 'right' }}>CPC</th>
                    <th style={{ textAlign: 'right' }}>Freq.</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.nome}</b>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span className={`tag ${ROTULO_STATUS[c.status]}`}>{c.status === 'ATIVA' ? 'Ativa' : c.status === 'PAUSADA' ? 'Pausada' : 'Encerrada'}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{c.tipoResultado}</span>
                    </div>
                  </td>
                  <td className="num" data-rotulo="Investido" style={{ textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(c.investimento)}</td>
                  <td className="num" data-rotulo="Resultados" style={{ textAlign: 'right' }}>{c.resultados === null ? '—' : numero.format(c.resultados)}</td>
                  <td className="num" data-rotulo="Custo/result." style={{ textAlign: 'right' }}>{moeda(c.custoPorResultado)}</td>
                  {!compacto ? (
                    <>
                      <td className="num" data-rotulo="Alcance" style={{ textAlign: 'right' }}>{numero.format(c.alcance)}</td>
                      <td className="num" data-rotulo="Impressões" style={{ textAlign: 'right' }}>{numero.format(c.impressoes)}</td>
                      <td className="num" data-rotulo="CPM" style={{ textAlign: 'right' }}>{moeda(c.cpm)}</td>
                      <td className="num" data-rotulo="CTR" style={{ textAlign: 'right' }}>{pct(c.ctr)}</td>
                      <td className="num" data-rotulo="CPC" style={{ textAlign: 'right' }}>{moeda(c.cpc)}</td>
                      <td className="num" data-rotulo="Freq." style={{ textAlign: 'right' }}>{c.frequencia === null ? '—' : c.frequencia.toFixed(2).replace('.', ',')}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
