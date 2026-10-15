import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize, X } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { Avatar, Tag } from '@/components/ui';
import { RECORRENCIA, STATUS_ENTREGA } from '@/lib/constantes';
import { useStore } from '@/lib/store';
import { diasAte, formatarData, formatarMoeda, hojeISO } from '@/lib/util';

const EditorQuadro = lazy(() => import('@/board/EditorQuadro'));

// Modo reunião: telas limpas para mostrar ao cliente o trabalho dele.
export const Apresentacao = ({ clienteId }: { clienteId: string }) => {
  const { dados, ir } = useStore();
  const [indice, setIndice] = useState(0);
  const [mostrarValores, setMostrarValores] = useState(false);
  const cliente = dados.clientes.find((c) => c.id === clienteId);

  const sair = useCallback(() => ir({ tela: 'cliente', id: clienteId }), [ir, clienteId]);

  const slides = useMemo(() => {
    if (!cliente) return [];
    const servicos = dados.servicos.filter((s) => s.clienteId === clienteId && s.status !== 'encerrado' && s.status !== 'proposta');
    const entregas = dados.entregas.filter((e) => e.clienteId === clienteId);
    const quadros = dados.quadros.filter((q) => q.clienteId === clienteId);
    const feitas = entregas.filter((e) => e.status === 'entregue').sort((a, b) => (b.entregueEm || b.prazo).localeCompare(a.entregueEm || a.prazo));
    const andamento = entregas.filter((e) => e.status !== 'entregue' && e.status !== 'backlog').sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    const progresso = entregas.length ? Math.round((feitas.length / entregas.length) * 100) : 0;

    const lista: Array<{ id: string; rotulo: string; conteudo: ReactNode; cheio?: boolean }> = [
      {
        id: 'capa',
        rotulo: 'Capa',
        conteudo: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'flex-start', justifyContent: 'center', minHeight: '55vh' }}>
            <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={84} />
            <span className="eyebrow">Plano de trabalho · {formatarData(hojeISO(), true)}</span>
            <h2 style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}>{cliente.nome}</h2>
            {cliente.briefing.objetivos ? (
              <p style={{ fontSize: 20, color: 'var(--text-2)', maxWidth: 760, margin: 0 }}>
                <b style={{ color: 'var(--text)' }}>Objetivo:</b> {cliente.briefing.objetivos}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'servicos',
        rotulo: 'Serviços',
        conteudo: (
          <>
            <span className="eyebrow">O que fazemos juntos</span>
            <h2>Serviços contratados</h2>
            <div className="grade-2">
              {servicos.map((s) => (
                <div key={s.id} className="cartao" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="chip" style={{ alignSelf: 'flex-start' }}>{s.tipo}</span>
                  <h3 style={{ fontSize: 22 }}>{s.nome}</h3>
                  {s.escopo ? <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 16 }}>{s.escopo}</p> : null}
                  {mostrarValores ? (
                    <b className="num" style={{ fontSize: 18 }}>
                      {formatarMoeda(s.valor)} · {RECORRENCIA[s.recorrencia].label.toLowerCase()} · vence dia {s.diaPagamento}
                    </b>
                  ) : null}
                </div>
              ))}
              {servicos.length === 0 ? <p className="muted">Nenhum serviço ativo.</p> : null}
            </div>
          </>
        ),
      },
      {
        id: 'andamento',
        rotulo: 'Andamento',
        conteudo: (
          <>
            <span className="eyebrow">Onde estamos</span>
            <h2>Andamento das entregas</h2>
            <div className="cartao" style={{ padding: 22, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 54, fontWeight: 700 }} className="num">{progresso}%</div>
              <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="progresso" style={{ height: 14 }}>
                  <div style={{ width: `${progresso}%`, background: 'var(--good)' }} />
                </div>
                <span className="muted">
                  {feitas.length} de {entregas.length} entregas concluídas · {andamento.length} em andamento
                </span>
              </div>
            </div>
            <div className="grade-2">
              <div className="cartao" style={{ padding: 22 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Em andamento</h3>
                <div className="linha-tempo">
                  {andamento.slice(0, 6).map((e) => (
                    <div key={e.id} className="marco">
                      <span className="num muted">{e.prazo ? formatarData(e.prazo) : 'sem data'}</span>
                      <span className="bolinha" style={{ color: `var(--tag-${STATUS_ENTREGA[e.status].cor})` }} />
                      <span>
                        <b style={{ fontSize: 16 }}>{e.titulo}</b>
                        <br />
                        <Tag rotulo={STATUS_ENTREGA[e.status]} />
                      </span>
                    </div>
                  ))}
                  {andamento.length === 0 ? <p className="muted">Nada em andamento agora.</p> : null}
                </div>
              </div>
              <div className="cartao" style={{ padding: 22 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Já entregue</h3>
                <div className="linha-tempo">
                  {feitas.slice(0, 6).map((e) => (
                    <div key={e.id} className="marco">
                      <span className="num muted">{formatarData(e.entregueEm || e.prazo)}</span>
                      <span className="bolinha" style={{ color: 'var(--good)' }} />
                      <b style={{ fontSize: 16 }}>{e.titulo}</b>
                    </div>
                  ))}
                  {feitas.length === 0 ? <p className="muted">As primeiras entregas aparecem aqui.</p> : null}
                </div>
              </div>
            </div>
          </>
        ),
      },
      ...quadros.map((q) => ({
        id: `quadro-${q.id}`,
        rotulo: q.titulo,
        cheio: true,
        conteudo: (
          <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 14, height: '100%' }}>
            <div>
              <span className="eyebrow">Estratégia</span>
              <h2>{q.titulo}</h2>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 420, position: 'relative' }}>
              <Suspense fallback={<div style={{ padding: 24 }} className="muted">Carregando quadro…</div>}>
                <EditorQuadro quadro={q} somenteLeitura />
              </Suspense>
            </div>
          </div>
        ),
      })),
      {
        id: 'proximos',
        rotulo: 'Próximos passos',
        conteudo: (
          <>
            <span className="eyebrow">Próximos passos</span>
            <h2>O que vem por aí</h2>
            <div className="lista cartao" style={{ padding: 10 }}>
              {andamento
                .filter((e) => !e.prazo || diasAte(e.prazo) <= 21)
                .slice(0, 8)
                .map((e) => (
                  <div key={e.id} className="linha" style={{ padding: '14px 12px' }}>
                    <div>
                      <b style={{ fontSize: 17 }}>{e.titulo}</b>
                      <div className="muted">{e.responsavel ? `Responsável: ${e.responsavel}` : ''}</div>
                    </div>
                    <span className="num" style={{ fontWeight: 700 }}>{e.prazo ? formatarData(e.prazo) : '—'}</span>
                  </div>
                ))}
              {andamento.length === 0 ? <p className="muted" style={{ padding: 12 }}>Vamos definir juntos as próximas entregas.</p> : null}
            </div>
          </>
        ),
      },
    ];
    return lista;
  }, [cliente, dados, clienteId, mostrarValores]);

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest('.excalidraw')) return;
      if (evento.key === 'ArrowRight' || evento.key === 'PageDown') setIndice((i) => Math.min(slides.length - 1, i + 1));
      if (evento.key === 'ArrowLeft' || evento.key === 'PageUp') setIndice((i) => Math.max(0, i - 1));
      if (evento.key === 'Escape' && !document.fullscreenElement) sair();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [slides.length, sair]);

  if (!cliente) return null;
  const atual = slides[Math.min(indice, slides.length - 1)];

  return (
    <div className="apresentacao">
      <div className="apresentacao-topo">
        <span className="logo" style={{ fontSize: 18 }}>
          K<span>o<b>next</b></span>
          <small style={{ marginLeft: 6 }}>{cliente.nome}</small>
        </span>
        <div className="acoes">
          <button type="button" className="btn fantasma pequeno" onClick={() => setMostrarValores(!mostrarValores)}>
            {mostrarValores ? <EyeOff size={15} /> : <Eye size={15} />} {mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
          </button>
          <button
            type="button"
            className="btn fantasma pequeno"
            onClick={() => {
              const raiz = document.documentElement;
              (document.fullscreenElement ? document.exitFullscreen() : raiz.requestFullscreen?.())?.catch?.(() => undefined);
            }}
          >
            <Maximize size={15} /> Tela cheia
          </button>
          <button type="button" className="btn pequeno" onClick={sair}>
            <X size={15} /> Sair
          </button>
        </div>
      </div>
      <div className="slide">
        <div className="slide-interno" style={atual?.cheio ? { height: '100%' } : undefined} key={atual?.id}>
          {atual?.conteudo}
        </div>
      </div>
      <div className="apresentacao-rodape">
        <button type="button" className="btn" onClick={() => setIndice(Math.max(0, indice - 1))} disabled={indice === 0}>
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="pontos" role="tablist" aria-label="Telas">
          {slides.map((s, i) => (
            <button key={s.id} type="button" className={i === indice ? 'ativo' : ''} onClick={() => setIndice(i)} aria-label={s.rotulo} title={s.rotulo} />
          ))}
        </div>
        <button type="button" className="btn primario" onClick={() => setIndice(Math.min(slides.length - 1, indice + 1))} disabled={indice >= slides.length - 1}>
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
