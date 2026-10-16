// Relatório de resultados em visual claro: é o que o cliente vê no link exclusivo e o que
// vira PDF. Tudo vem do servidor já filtrado para o cliente.
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { SeletorPeriodo, periodoDe } from '@/components/SeletorPeriodo';
import { dataBR, type EscolhaPeriodo, lerPortal, quando, type Relatorio, type Secao } from '@/lib/metricas';
import { parametrosCom } from '@/lib/performance';

import { BlocoRelatorio, blocosDe } from './Secoes';

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const imprimir = () => {
  // Abre a janela de impressão do navegador: “Salvar como PDF” gera o arquivo com este mesmo visual.
  window.print();
};

export const RelatorioView = ({
  rel,
  periodo,
  aoMudarPeriodo,
  carregando,
  secoes,
  metricas,
  clienteId,
  titulo,
  mensagem,
  extra,
}: {
  rel: Relatorio;
  periodo: EscolhaPeriodo;
  aoMudarPeriodo: (p: EscolhaPeriodo) => void;
  carregando?: boolean;
  secoes: Secao[];
  metricas?: string[];
  clienteId?: string;
  titulo?: string;
  mensagem?: string;
  extra?: ReactNode;
}) => {
  const params = parametrosCom(rel.parametros);
  const blocos = blocosDe(secoes);
  return (
    <div className="rel-claro">
      <header className="rel-topo">
        <div className="rel-titulo">
          <span className="rel-avatar" style={{ background: rel.cliente.cor || '#2563eb' }} aria-hidden="true">
            {iniciais(rel.cliente.nome)}
          </span>
          <div>
            <h1>{titulo || `Resultados de ${rel.cliente.nome}`}</h1>
            <p>
              Período: {dataBR(rel.periodo.de)} a {dataBR(rel.periodo.ate)}
              {rel.anterior ? <span className="so-tela"> · comparado com {dataBR(rel.anterior.de)} a {dataBR(rel.anterior.ate)}</span> : null}
            </p>
          </div>
        </div>
        <div className="rel-acoes nao-imprimir">
          <SeletorPeriodo valor={periodo} aoMudar={aoMudarPeriodo} real={rel.periodo} desabilitado={carregando} />
          <button type="button" className="btn-claro" onClick={imprimir}>
            <Download size={16} /> Baixar PDF
          </button>
          {extra}
        </div>
      </header>
      {mensagem ? <p className="rel-mensagem">{mensagem}</p> : null}
      {rel.avisos.map((a) => (
        <p key={a} className="rel-aviso">
          <AlertTriangle size={15} /> {a}
        </p>
      ))}
      <main className={carregando ? 'carregando-suave' : ''}>
        {rel.resumo.gasto === 0 && !rel.campanhas.length ? (
          <p className="vazio-rel">Nenhum anúncio veiculado neste período.</p>
        ) : (
          blocos.map((b) => <BlocoRelatorio key={b} bloco={b} secoes={secoes} rel={rel} params={params} metricas={metricas} clienteId={clienteId} />)
        )}
      </main>
      <footer className="rel-rodape">
        <span>
          <RefreshCw size={12} /> Dados do Meta Ads atualizados em {quando(rel.sincronizacao.em || rel.consultadoEm)}
        </span>
        <span>{rel.agencia?.nome ? `Relatório preparado por ${rel.agencia.nome}` : ''}</span>
      </footer>
    </div>
  );
};

// Página pública do link exclusivo (/resultados/<token>).
export const Portal = ({ token }: { token: string }) => {
  const [periodo, setPeriodo] = useState<EscolhaPeriodo>(() => periodoDe('30'));
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await lerPortal(token, periodo);
      setRel(r);
      document.title = r.titulo || `Resultados · ${r.cliente.nome}`;
    } catch (f) {
      setErro(f instanceof Error ? f.message : 'Não foi possível carregar os resultados.');
    } finally {
      setCarregando(false);
    }
  }, [token, periodo]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="pagina-clara">
      {!rel ? (
        <div className="rel-espera">{erro ? <><AlertTriangle size={26} /><h1>Resultados indisponíveis</h1><p>{erro}</p></> : <><RefreshCw size={22} className="girando" /><p>Carregando resultados…</p></>}</div>
      ) : (
        <>
          {erro ? <p className="rel-aviso"><AlertTriangle size={15} /> {erro}</p> : null}
          <RelatorioView rel={rel} periodo={periodo} aoMudarPeriodo={setPeriodo} carregando={carregando} secoes={rel.secoes} metricas={rel.metricas} titulo={rel.titulo} mensagem={rel.mensagem} />
        </>
      )}
    </div>
  );
};
