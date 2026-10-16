// Portal de resultados do cliente (link exclusivo, sem login, só leitura).
// Tudo o que aparece aqui vem do servidor já filtrado para o cliente dono do link.
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { intervaloDoPeriodo, PERIODOS, type Periodo } from '@/lib/meta';
import { dataBR, lerPortal, quando, type Relatorio, SECOES } from '@/lib/metricas';
import { parametrosCom } from '@/lib/performance';

import { rotuloSecao, SecaoRelatorio } from './Secoes';

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const Portal = ({ token }: { token: string }) => {
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const { de, ate } = intervaloDoPeriodo(periodo);
      const r = await lerPortal(token, de, ate);
      setRel(r);
      document.title = `${r.titulo || `Resultados · ${r.cliente.nome}`}`;
    } catch (f) {
      setErro(f instanceof Error ? f.message : 'Não foi possível carregar os resultados.');
    } finally {
      setCarregando(false);
    }
  }, [token, periodo]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!rel && erro) {
    return (
      <div className="portal">
        <div className="portal-erro">
          <AlertTriangle size={30} />
          <h1>Resultados indisponíveis</h1>
          <p>{erro}</p>
        </div>
      </div>
    );
  }
  if (!rel) {
    return (
      <div className="portal">
        <div className="portal-erro">
          <RefreshCw size={26} className="girando" />
          <p>Carregando resultados…</p>
        </div>
      </div>
    );
  }

  const params = parametrosCom(rel.parametros);
  const secoes = SECOES.map((s) => s.id).filter((s) => rel.secoes.includes(s));

  return (
    <div className="portal">
      <header className="portal-topo" style={{ ['--cor-cliente' as string]: rel.cliente.cor || '#eae6e4' }}>
        <div className="portal-marca">
          {rel.agencia?.logo ? <img src={rel.agencia.logo} alt={rel.agencia.nome} /> : <span className="logo-texto">{(rel.agencia?.nome || 'konext').toLowerCase()}</span>}
        </div>
        <div className="portal-cliente">
          <span className="portal-avatar" style={{ background: rel.cliente.cor || '#3a302b' }} aria-hidden="true">
            {iniciais(rel.cliente.nome)}
          </span>
          <div>
            <h1>{rel.titulo || `Resultados de ${rel.cliente.nome}`}</h1>
            <p>
              Campanhas no Meta Ads (Facebook e Instagram){rel.cliente.instagram ? ` · @${rel.cliente.instagram}` : ''}
            </p>
          </div>
        </div>
        {rel.mensagem ? <p className="portal-mensagem">{rel.mensagem}</p> : null}
        <div className="portal-controles">
          <select className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Período" disabled={carregando}>
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
          <span>
            {dataBR(rel.periodo.de)} a {dataBR(rel.periodo.ate)}
            {rel.anterior ? ` · comparado com ${dataBR(rel.anterior.de)} a ${dataBR(rel.anterior.ate)}` : ''}
          </span>
          <span className="portal-atualizado">
            <RefreshCw size={13} className={carregando ? 'girando' : ''} /> Dados atualizados em {quando(rel.sincronizacao.em || rel.consultadoEm)}
          </span>
        </div>
        {secoes.length > 3 ? (
          <nav className="portal-indice" aria-label="Seções">
            {secoes.map((s) => (
              <a key={s} href={`#secao-${s}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(`secao-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                {rotuloSecao(s)}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <main className={`portal-corpo${carregando ? ' carregando-suave' : ''}`}>
        {erro ? (
          <div className="faixa alerta">
            <AlertTriangle size={18} />
            <p>{erro}</p>
          </div>
        ) : null}
        {rel.avisos.map((a) => (
          <div key={a} className="faixa">
            <AlertTriangle size={18} />
            <p>{a}</p>
          </div>
        ))}
        {rel.resumo.gasto === 0 && !rel.campanhas.length ? (
          <div className="portal-erro">
            <BarChart3 size={28} />
            <p>Nenhum anúncio veiculado neste período.</p>
          </div>
        ) : (
          secoes.map((s) => <SecaoRelatorio key={s} secao={s} rel={rel} params={params} metricas={rel.metricas} />)
        )}
      </main>
      <footer className="portal-rodape">
        <span>Dados oficiais do Meta Ads · página somente para consulta</span>
        <span>Taxas e custos são calculados a partir dos dados da Meta; métricas que a Meta não informa aparecem como indisponíveis.</span>
      </footer>
    </div>
  );
};
