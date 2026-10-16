import { AlertTriangle, CheckCircle2, Info, RefreshCw, Stethoscope, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { anunciosApi, type Diagnostico as TipoDiagnostico, ErroApi, type StatusCheck } from '@/lib/anuncios';
import { useStore } from '@/lib/store';

const ICONE: Record<StatusCheck, JSX.Element> = {
  ok: <CheckCircle2 size={18} color="var(--good)" />,
  aviso: <AlertTriangle size={18} color="var(--tag-amber)" />,
  erro: <XCircle size={18} color="var(--bad)" />,
  info: <Info size={18} color="var(--text-3)" />,
};

export const AvisoSoServidor = () => (
  <div className="faixa">
    <Info size={18} />
    <p>
      <b>Disponível só com o Konext instalado no servidor.</b> Aqui tudo fala com a Meta de verdade, então não existe versão de demonstração.
    </p>
  </div>
);

// Confere, direto na Meta, se o token e as contas dos clientes estão prontos para criar campanhas.
export const DiagnosticoMeta = () => {
  const modo = useStore((estado) => estado.backend?.modo ?? 'local');
  const ir = useStore((estado) => estado.ir);
  const [dados, setDados] = useState<TipoDiagnostico | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const rodar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await anunciosApi.diagnostico());
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível rodar o diagnóstico.');
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (modo === 'servidor') rodar();
  }, [modo, rodar]);

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Stethoscope size={26} /> Diagnóstico Meta
          </h1>
          <p>Confere na Meta, agora, se o token, as permissões e as contas dos clientes estão prontos.</p>
        </div>
        {modo === 'servidor' ? (
          <button type="button" className="btn primario" onClick={rodar} disabled={carregando}>
            <RefreshCw size={15} className={carregando ? 'girando' : ''} /> {carregando ? 'Conferindo…' : 'Conferir de novo'}
          </button>
        ) : null}
      </div>

      {modo !== 'servidor' ? <AvisoSoServidor /> : null}
      {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}

      {dados ? (
        <>
          <section className="cartao">
            <div className="lista-checks">
              {dados.checks.map((c) => (
                <div key={c.id} className={`check ${c.status}`}>
                  {ICONE[c.status]}
                  <div style={{ minWidth: 0 }}>
                    <b>{c.titulo}</b>
                    <p>{c.detalhe}</p>
                    {c.itens?.length ? (
                      <div className="itens-check">
                        {c.itens.map((i) => (
                          <div key={i.clienteId} className="item-check">
                            {ICONE[i.status]}
                            <span>
                              <b>{i.cliente}</b> {i.conta ? <code>{i.conta}</code> : null} — {i.texto}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {dados.checks.some((c) => c.id === 'clientes') ? (
              <div className="acoes" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => ir({ tela: 'anuncios-contas' })}>
                  Validar contas dos clientes
                </button>
              </div>
            ) : null}
          </section>

          {dados.permissoes.length ? (
            <section className="cartao">
              <h3 style={{ marginBottom: 10 }}>Permissões</h3>
              <div className="tabela-wrap">
                <table className="tabela">
                  <tbody>
                    {dados.permissoes.map((p) => (
                      <tr key={p.nome}>
                        <td>{p.concedida ? ICONE.ok : p.obrigatoria ? ICONE.erro : ICONE.aviso}</td>
                        <td><code>{p.nome}</code></td>
                        <td className="muted">{p.para}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {dados.contas.length ? (
            <section className="cartao">
              <h3 style={{ marginBottom: 10 }}>Contas que o token enxerga ({dados.contas.length})</h3>
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th>ID</th>
                      <th>Situação</th>
                      <th>Moeda / fuso</th>
                      <th>Negócio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.contas.map((c) => (
                      <tr key={c.id}>
                        <td><b>{c.nome}</b></td>
                        <td><code>{c.id}</code></td>
                        <td><span className={`tag ${c.status === 1 ? 'green' : 'amber'}`}>{c.statusTexto}</span></td>
                        <td className="muted">{c.moeda} · {c.fuso}</td>
                        <td className="muted">{c.negocio || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {dados.uso.em ? (
            <details className="detalhes-tecnicos">
              <summary>Uso dos limites da API (informado pela Meta)</summary>
              <pre className="exemplo-json">{JSON.stringify({ app: dados.uso.app, contas: dados.uso.contas, negocio: dados.uso.negocio }, null, 2)}</pre>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
