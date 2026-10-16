import { Activity, ArrowLeft, CheckCircle2, Clock, Copy, Pause, Play, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Confirmar, Vazio } from '@/components/ui';
import { criacaoApi, type ObjetoOperacao, type Operacao, type OperacaoDetalhe, ROTULO_STATUS_OPERACAO } from '@/lib/anuncios';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

import { AvisoSoServidor } from './Diagnostico';

const EM_ANDAMENTO = ['na_fila', 'em_andamento', 'aguardando_limite'];

const STATUS_OBJETO: Record<ObjetoOperacao['status'], { texto: string; cor: string }> = {
  pendente: { texto: 'Pendente', cor: 'slate' },
  enviando: { texto: 'Enviando…', cor: 'sky' },
  criado: { texto: 'Criado', cor: 'green' },
  falhou: { texto: 'Falhou', cor: 'red' },
  bloqueado: { texto: 'Não criado', cor: 'red' },
  incerto: { texto: 'Conferindo na Meta', cor: 'amber' },
  aguardando_correcao: { texto: 'Precisa de você', cor: 'red' },
};

const TIPO_OBJETO = { midia: 'Mídia', campanha: 'Campanha', conjunto: 'Conjunto', criativo: 'Criativo', anuncio: 'Anúncio' };

const tempo = (de: string, ate = new Date().toISOString()) => {
  const s = Math.max(0, Math.round((Date.parse(ate) - Date.parse(de)) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}min ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
};

const Progresso = ({ op }: { op: Operacao }) => {
  const pct = op.progresso.total ? Math.round((op.progresso.feitos / op.progresso.total) * 100) : 0;
  return (
    <div className="progresso-op">
      <div className="progresso"><div style={{ width: `${pct}%`, background: op.progresso.falhas ? 'var(--tag-amber)' : 'var(--good)' }} /></div>
      <small className="muted">
        {op.progresso.feitos}/{op.progresso.total} etapas{op.progresso.falhas ? ` · ${op.progresso.falhas} com problema` : ''}
      </small>
    </div>
  );
};

const relatorio = (op: OperacaoDetalhe) =>
  [
    `Operação ${op.id}`,
    `Cliente: ${op.clienteNome} · Conta ${op.contaId}`,
    `Campanha: ${op.nomeCampanha}`,
    `Resultado: ${ROTULO_STATUS_OPERACAO[op.status].texto}`,
    '',
    ...op.objetos
      .filter((o) => o.tipo !== 'midia')
      .map((o) => `${TIPO_OBJETO[o.tipo]} “${o.nome}”: ${STATUS_OBJETO[o.status].texto}${o.metaId ? ` · ID ${o.metaId}` : ''}${o.estadoMeta?.texto ? ` · Meta: ${o.estadoMeta.texto}` : ''}${o.erro ? ` · ${o.erro.mensagem}` : ''}`),
  ].join('\n');

const Detalhe = ({ id }: { id: string }) => {
  const ir = useStore((estado) => estado.ir);
  const mostrar = useToast((estado) => estado.mostrar);
  const [op, setOp] = useState<OperacaoDetalhe | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [confirmarAtivar, setConfirmarAtivar] = useState(false);
  const [idInformado, setIdInformado] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    try {
      setOp((await criacaoApi.operacao(id)).operacao);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar.');
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atualiza sozinho enquanto a execução estiver rodando.
  useEffect(() => {
    if (!op || !EM_ANDAMENTO.includes(op.status)) return;
    const t = window.setInterval(carregar, 2500);
    return () => window.clearInterval(t);
  }, [op, carregar]);

  const acao = async (nome: 'retomar' | 'ativar' | 'pausar' | 'verificar', aviso: string) => {
    setOcupado(nome);
    try {
      await criacaoApi.acao(id, nome);
      mostrar(aviso);
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : 'Falhou', true);
    }
    setOcupado('');
    carregar();
  };

  if (erro) return <div className="faixa alerta"><p>{erro}</p></div>;
  if (!op) return <p className="muted">Carregando…</p>;
  const status = ROTULO_STATUS_OPERACAO[op.status];
  const grupos = [
    { titulo: 'Mídias', itens: op.objetos.filter((o) => o.tipo === 'midia') },
    { titulo: 'Campanha', itens: op.objetos.filter((o) => o.tipo === 'campanha') },
    ...op.plano.itens.map((i) => ({
      titulo: `Conjunto ${i.n} · ${i.publico.nome}`,
      itens: op.objetos.filter((o) => o.chave.endsWith(`:${i.n}`)),
    })),
  ];

  return (
    <>
      <button type="button" className="btn fantasma pequeno" style={{ alignSelf: 'flex-start' }} onClick={() => ir({ tela: 'anuncios-execucao' })}>
        <ArrowLeft size={15} /> Todas as execuções
      </button>
      <section className="cartao">
        <div className="topo-op">
          <div style={{ minWidth: 0 }}>
            <span className={`tag ${status.cor}`}>{status.texto}</span>
            <h2 style={{ margin: '8px 0 4px' }}>{op.nomeCampanha}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {op.clienteNome} · <code>{op.contaId}</code> · {op.modelo} · {op.conjuntos} conjunto(s) · {op.anuncios} anúncio(s)
            </p>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              <Clock size={12} /> {EM_ANDAMENTO.includes(op.status) ? `rodando há ${tempo(op.criadoEm)}` : `levou ${tempo(op.criadoEm, op.atualizadoEm)}`}
              {op.etapaAtual && EM_ANDAMENTO.includes(op.status) ? ` · agora: ${op.etapaAtual}` : ''}
            </p>
          </div>
          <div className="acoes">
            <button type="button" className="btn fantasma pequeno" onClick={() => acao('verificar', 'Estados atualizados com a Meta')} disabled={!!ocupado}>
              <RefreshCw size={13} className={ocupado === 'verificar' ? 'girando' : ''} /> Conferir na Meta
            </button>
            {['parcial', 'falha'].includes(op.status) ? (
              <button type="button" className="btn pequeno" onClick={() => acao('retomar', 'Retomando só o que faltou')} disabled={!!ocupado}>
                <RotateCcw size={13} /> Tentar de novo o que falhou
              </button>
            ) : null}
            {op.campanhaId ? (
              <button type="button" className="btn pequeno" onClick={() => acao('pausar', 'Pausado na Meta')} disabled={!!ocupado}>
                <Pause size={13} /> Pausar tudo
              </button>
            ) : null}
            {op.status === 'concluida' ? (
              <button type="button" className="btn primario pequeno" onClick={() => setConfirmarAtivar(true)} disabled={!!ocupado}>
                <Play size={13} /> Ativar
              </button>
            ) : null}
            <button
              type="button"
              className="btn fantasma pequeno"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(relatorio(op));
                  mostrar('Relatório copiado');
                } catch {
                  mostrar('Não deu para copiar', true);
                }
              }}
            >
              <Copy size={13} /> Copiar relatório
            </button>
          </div>
        </div>
        <Progresso op={op} />
        {op.erro ? <p className="aviso-texto" style={{ marginTop: 8 }}>{op.erro}</p> : null}
        {op.status === 'parcial' ? <p className="aviso-texto">Parte foi criada e está preservada. Corrija o motivo dos itens com falha e use “Tentar de novo”: o que já existe não é recriado.</p> : null}
        {op.status === 'concluida' ? <p className="ok-texto"><CheckCircle2 size={14} /> Tudo criado e conferido na Meta, pausado. Ative quando quiser. A aprovação depende da Meta.</p> : null}
      </section>

      {grupos.map((g) => (
        <section key={g.titulo} className="cartao grupo-objetos">
          <h3>{g.titulo}</h3>
          {g.itens.map((o) => (
            <div key={o.chave} className={`linha-objeto ${o.status}`}>
              <span className="tipo-objeto">{TIPO_OBJETO[o.tipo]}</span>
              <div style={{ minWidth: 0 }}>
                <b>{o.nome}</b>
                <div className="sub-etapa">
                  {o.metaId ? <code>ID {o.metaId}</code> : null}
                  {o.estadoMeta?.texto ? <span>Meta: {o.estadoMeta.texto}</span> : null}
                  {o.tentativas > 1 ? <span>{o.tentativas} tentativas</span> : null}
                </div>
                {o.erro ? <p className="erro-texto">{o.erro.mensagem}</p> : null}
                {o.status === 'aguardando_correcao' ? (
                  <div className="resolver">
                    <input placeholder="ID correto na Meta" value={idInformado[o.chave] ?? ''} onChange={(e) => setIdInformado({ ...idInformado, [o.chave]: e.target.value })} />
                    <button type="button" className="btn pequeno" disabled={!idInformado[o.chave]} onClick={async () => {
                      try {
                        await criacaoApi.resolver(op.id, o.chave, idInformado[o.chave]);
                        carregar();
                      } catch (falha) {
                        mostrar(falha instanceof Error ? falha.message : 'Falhou', true);
                      }
                    }}>
                      Usar este ID
                    </button>
                    <button type="button" className="btn fantasma pequeno" onClick={async () => {
                      await criacaoApi.resolver(op.id, o.chave, null).catch(() => undefined);
                      carregar();
                    }}>
                      Não existe: criar
                    </button>
                  </div>
                ) : null}
              </div>
              <span className={`tag ${STATUS_OBJETO[o.status].cor}`}>{STATUS_OBJETO[o.status].texto}</span>
            </div>
          ))}
        </section>
      ))}

      {confirmarAtivar ? (
        <Confirmar
          texto={`Ativar a campanha “${op.nomeCampanha}” com ${op.anuncios} anúncio(s)? Ela começa a gastar assim que a Meta aprovar.`}
          rotuloAcao="Ativar"
          aoCancelar={() => setConfirmarAtivar(false)}
          aoConfirmar={() => {
            setConfirmarAtivar(false);
            acao('ativar', 'Ativado. A Meta ainda vai analisar os anúncios.');
          }}
        />
      ) : null}
    </>
  );
};

// Anúncios → Central de execução.
export const CentralExecucao = ({ id }: { id?: string }) => {
  const { ir } = useStore();
  const modoServidor = useStore((estado) => estado.backend?.modo === 'servidor');
  const [ops, setOps] = useState<Operacao[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setOps((await criacaoApi.operacoes()).operacoes);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar.');
    }
  }, []);

  useEffect(() => {
    if (!modoServidor || id) return;
    carregar();
    const t = window.setInterval(carregar, 4000);
    return () => window.clearInterval(t);
  }, [modoServidor, id, carregar]);

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Activity size={26} /> Central de execução
          </h1>
          <p>Cada publicação, etapa por etapa, com os IDs da Meta. Atualiza sozinha.</p>
        </div>
        <button type="button" className="btn primario" onClick={() => ir({ tela: 'anuncios-criar' })}>
          Nova campanha
        </button>
      </div>
      {!modoServidor ? <AvisoSoServidor /> : id ? (
        <Detalhe id={id} />
      ) : (
        <>
          {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}
          {ops === null ? <p className="muted">Carregando…</p> : ops.length === 0 ? (
            <Vazio icone={<Activity size={24} />} texto="Nenhuma publicação ainda." />
          ) : (
            <div className="lista-ops">
              {ops.map((op) => {
                const st = ROTULO_STATUS_OPERACAO[op.status];
                return (
                  <button key={op.id} type="button" className="cartao-op" onClick={() => ir({ tela: 'anuncios-execucao', id: op.id })}>
                    <div className="topo-op">
                      <div style={{ minWidth: 0, textAlign: 'left' }}>
                        <b>{op.nomeCampanha}</b>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {op.clienteNome} · {op.conjuntos} conjunto(s) · {new Date(op.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                      <span className={`tag ${st.cor}`}>
                        {op.status === 'concluida' ? <CheckCircle2 size={12} /> : op.status === 'falha' ? <XCircle size={12} /> : null} {st.texto}
                      </span>
                    </div>
                    <Progresso op={op} />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
