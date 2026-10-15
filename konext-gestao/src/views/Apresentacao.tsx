import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Hand,
  Link2,
  Maximize,
  Package,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { classePrazo } from '@/components/Kanban';
import { Logo } from '@/components/Logo';
import { PainelCampanhas } from '@/components/PainelCampanhas';
import { Avatar, Kpi, Tag } from '@/components/ui';
import { PRIORIDADE, RECORRENCIA, STATUS_CLIENTE, STATUS_ENTREGA } from '@/lib/constantes';
import { useStore } from '@/lib/store';
import { type Cliente, type Entrega } from '@/lib/types';
import { diasAte, formatarData, formatarMoeda, hojeISO, prazoRelativo } from '@/lib/util';

const EditorQuadro = lazy(() => import('@/board/EditorQuadro'));

// Cartão de entrega com tudo que o cliente precisa saber: o que é, quem faz, quando e onde ver.
const CartaoEntrega = ({ entrega }: { entrega: Entrega }) => (
  <div className="cartao-entrega-apres">
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Tag rotulo={STATUS_ENTREGA[entrega.status]} />
      {entrega.prioridade === 'alta' || entrega.prioridade === 'urgente' ? <Tag rotulo={PRIORIDADE[entrega.prioridade]} /> : null}
    </div>
    <b style={{ fontSize: 17, lineHeight: 1.3 }}>{entrega.titulo}</b>
    {entrega.descricao ? <p className="detalhes">{entrega.descricao}</p> : null}
    <div className="meta-entrega">
      <span className={classePrazo(entrega)}>
        <CalendarClock size={14} />
        {entrega.status === 'entregue'
          ? `Entregue em ${formatarData(entrega.entregueEm || entrega.prazo)}`
          : entrega.prazo
            ? `${formatarData(entrega.prazo)} · ${prazoRelativo(entrega.prazo)}`
            : 'Sem prazo definido'}
      </span>
      {entrega.responsavel ? (
        <span>
          <User size={14} />
          {entrega.responsavel}
        </span>
      ) : null}
      {entrega.link ? (
        <a href={entrega.link} target="_blank" rel="noreferrer">
          <Link2 size={14} />
          Ver material
        </a>
      ) : null}
    </div>
  </div>
);

// Anotações da reunião: salvas na ficha do cliente enquanto você digita.
const NotasReuniao = ({ cliente }: { cliente: Cliente }) => {
  const salvar = useStore((estado) => estado.salvar);
  const [texto, setTexto] = useState(cliente.notasReuniao);
  const [salvo, setSalvo] = useState(true);
  const ultimo = useRef(cliente);
  ultimo.current = cliente;

  useEffect(() => {
    if (texto === ultimo.current.notasReuniao) return;
    setSalvo(false);
    const id = window.setTimeout(() => {
      salvar('clientes', { ...ultimo.current, notasReuniao: texto });
      setSalvo(true);
    }, 700);
    return () => window.clearTimeout(id);
  }, [texto, salvar]);

  return (
    <>
      <textarea
        id="notas-reuniao"
        className="notas-reuniao"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Anote aqui o que foi combinado: decisões, pedidos do cliente, próximos passos…"
      />
      <span className="muted" style={{ fontSize: 13 }}>
        {salvo ? 'Salvo na ficha do cliente.' : 'Salvando…'}
      </span>
    </>
  );
};

const Bloco = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="cartao" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
    <span className="eyebrow" style={{ fontSize: 11 }}>{titulo}</span>
    <div style={{ fontSize: 16, color: 'var(--text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</div>
  </div>
);

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
    const andamento = entregas
      .filter((e) => e.status !== 'entregue' && e.status !== 'backlog')
      .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    const atrasadas = andamento.filter((e) => e.prazo && diasAte(e.prazo) < 0);
    const doCliente = andamento.filter((e) => e.status === 'aguardando_cliente');
    const ideias = entregas.filter((e) => e.status === 'backlog');
    const progresso = entregas.length ? Math.round((feitas.length / entregas.length) * 100) : 0;
    const mensal = servicos.reduce((soma, s) => soma + s.valor / RECORRENCIA[s.recorrencia].meses, 0);
    const b = cliente.briefing;

    const lista: Array<{ id: string; rotulo: string; conteudo: ReactNode; cheio?: boolean }> = [
      {
        id: 'capa',
        rotulo: 'Capa',
        conteudo: (
          <div className="capa-apres">
            <Logo grande />
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={72} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span className="eyebrow">Plano de trabalho · {formatarData(hojeISO(), true)}</span>
                <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', overflowWrap: 'anywhere' }}>{cliente.nome}</h2>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag rotulo={STATUS_CLIENTE[cliente.status]} />
              {cliente.segmento ? <span className="chip">{cliente.segmento}</span> : null}
              {cliente.clienteDesde ? <span className="chip">Juntos desde {formatarData(cliente.clienteDesde, true)}</span> : null}
            </div>
            {b.objetivos ? (
              <p style={{ fontSize: 'clamp(17px, 2vw, 21px)', maxWidth: 780, margin: 0 }}>
                <b style={{ color: 'var(--text)' }}>Objetivo:</b> {b.objetivos}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'status',
        rotulo: 'Status do projeto',
        conteudo: (
          <>
            <span className="eyebrow">Visão geral</span>
            <h2>Como está o projeto</h2>
            <div className="status-cliente">
              <Kpi icone={<Sparkles size={15} />} rotulo="Status" valor={STATUS_CLIENTE[cliente.status].label} detalhe={cliente.clienteDesde ? `Cliente desde ${formatarData(cliente.clienteDesde, true)}` : undefined} />
              <Kpi icone={<CheckCircle2 size={15} />} rotulo="Concluído" valor={`${progresso}%`} detalhe={`${feitas.length} de ${entregas.length} entregas`} tom="bom" />
              <Kpi icone={<Package size={15} />} rotulo="Em andamento" valor={String(andamento.length)} detalhe={ideias.length ? `+ ${ideias.length} ideias no radar` : 'entregas sendo feitas'} />
              <Kpi
                icone={<Hand size={15} />}
                rotulo="Aguardando vocês"
                valor={String(doCliente.length)}
                detalhe={doCliente.length ? 'itens que dependem do cliente' : 'nada pendente do seu lado'}
                tom={doCliente.length ? 'alerta' : undefined}
              />
              {atrasadas.length ? <Kpi icone={<AlertTriangle size={15} />} rotulo="Fora do prazo" valor={String(atrasadas.length)} detalhe="estamos priorizando" tom="alerta" /> : null}
              {mostrarValores && servicos.length ? <Kpi icone={<Clock size={15} />} rotulo="Investimento mensal" valor={formatarMoeda(mensal)} detalhe={`${servicos.length} serviço(s) ativo(s)`} /> : null}
            </div>
            <div className="grade-2">
              {b.objetivos ? <Bloco titulo="Objetivos">{b.objetivos}</Bloco> : null}
              {b.publico ? <Bloco titulo="Público">{b.publico}</Bloco> : null}
              {b.tomDeVoz ? <Bloco titulo="Tom de voz">{b.tomDeVoz}</Bloco> : null}
              {b.observacoes ? <Bloco titulo="Observações">{b.observacoes}</Bloco> : null}
            </div>
          </>
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
              {servicos.map((s) => {
                const daqui = entregas.filter((e) => e.servicoId === s.id);
                const prontas = daqui.filter((e) => e.status === 'entregue').length;
                return (
                  <div key={s.id} className="cartao" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    <span className="chip" style={{ alignSelf: 'flex-start' }}>{s.tipo}</span>
                    <h3 style={{ fontSize: 22 }}>{s.nome}</h3>
                    {s.escopo ? <p style={{ margin: 0, fontSize: 16, whiteSpace: 'pre-wrap' }}>{s.escopo}</p> : null}
                    <span className="muted" style={{ fontSize: 14 }}>
                      {s.inicio ? `Desde ${formatarData(s.inicio, true)} · ` : ''}
                      {daqui.length ? `${prontas} de ${daqui.length} entregas concluídas` : 'Sem entregas ligadas ainda'}
                    </span>
                    {mostrarValores ? (
                      <b className="num" style={{ fontSize: 18 }}>
                        {formatarMoeda(s.valor)} · {RECORRENCIA[s.recorrencia].label.toLowerCase()} · vence dia {s.diaPagamento}
                      </b>
                    ) : null}
                  </div>
                );
              })}
              {servicos.length === 0 ? <p className="muted">Nenhum serviço ativo.</p> : null}
            </div>
          </>
        ),
      },
      {
        id: 'andamento',
        rotulo: 'Em andamento',
        conteudo: (
          <>
            <span className="eyebrow">Onde estamos</span>
            <h2>Entregas em andamento</h2>
            <div className="cartao" style={{ padding: 22, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 54px)', fontWeight: 700 }} className="num">
                {progresso}%
              </div>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="progresso" style={{ height: 14 }}>
                  <div style={{ width: `${progresso}%`, background: 'var(--good)' }} />
                </div>
                <span className="muted">
                  {feitas.length} de {entregas.length} entregas concluídas · {andamento.length} em andamento
                </span>
              </div>
            </div>
            <div className="grade-entregas-apres">
              {andamento.map((e) => (
                <CartaoEntrega key={e.id} entrega={e} />
              ))}
            </div>
            {andamento.length === 0 ? <p className="muted">Nada em andamento agora.</p> : null}
          </>
        ),
      },
    ];

    if (doCliente.length) {
      lista.push({
        id: 'precisamos',
        rotulo: 'O que precisamos de vocês',
        conteudo: (
          <>
            <span className="eyebrow">Para seguir no prazo</span>
            <h2>O que precisamos de vocês</h2>
            <p style={{ margin: 0, fontSize: 17 }}>Estes itens estão parados esperando uma resposta, aprovação ou material do seu lado.</p>
            <div className="grade-entregas-apres">
              {doCliente.map((e) => (
                <CartaoEntrega key={e.id} entrega={e} />
              ))}
            </div>
          </>
        ),
      });
    }

    lista.push({
      id: 'entregue',
      rotulo: 'Já entregue',
      conteudo: (
        <>
          <span className="eyebrow">O que já foi feito</span>
          <h2>Já entregue</h2>
          <div className="cartao" style={{ padding: 22 }}>
            <div className="linha-tempo">
              {feitas.slice(0, 10).map((e) => (
                <div key={e.id} className="marco">
                  <span className="num muted">{formatarData(e.entregueEm || e.prazo)}</span>
                  <span className="bolinha" style={{ color: 'var(--good)' }} />
                  <span style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 16 }}>{e.titulo}</b>
                    {e.descricao ? <div className="muted" style={{ fontSize: 14 }}>{e.descricao}</div> : null}
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noreferrer" style={{ fontSize: 14, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Link2 size={13} /> Ver material
                      </a>
                    ) : null}
                  </span>
                </div>
              ))}
              {feitas.length === 0 ? <p className="muted">As primeiras entregas aparecem aqui.</p> : null}
            </div>
          </div>
        </>
      ),
    });

    if (cliente.metaContaId) {
      lista.push({
        id: 'campanhas',
        rotulo: 'Campanhas',
        conteudo: (
          <>
            <span className="eyebrow">Tráfego pago · Meta Ads</span>
            <h2>Resultados das campanhas</h2>
            <PainelCampanhas contaId={cliente.metaContaId} compacto />
          </>
        ),
      });
    }

    lista.push(
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
            <div className="quadro-apres">
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
              {[...andamento.filter((e) => e.status !== 'aguardando_cliente'), ...ideias]
                .filter((e) => !e.prazo || diasAte(e.prazo) <= 30)
                .slice(0, 8)
                .map((e) => (
                  <div key={e.id} className="linha" style={{ padding: '14px 12px', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 17 }}>{e.titulo}</b>
                      <div className="muted">
                        {STATUS_ENTREGA[e.status].label}
                        {e.responsavel ? ` · ${e.responsavel}` : ''}
                      </div>
                    </div>
                    <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{e.prazo ? formatarData(e.prazo) : '—'}</span>
                  </div>
                ))}
              {andamento.length + ideias.length === 0 ? <p className="muted" style={{ padding: 12 }}>Vamos definir juntos as próximas entregas.</p> : null}
            </div>
          </>
        ),
      },
      {
        id: 'notas',
        rotulo: 'Anotações da reunião',
        conteudo: (
          <>
            <span className="eyebrow">Combinados</span>
            <h2>Anotações da reunião</h2>
            <NotasReuniao cliente={cliente} />
          </>
        ),
      },
    );
    return lista;
  }, [cliente, dados, clienteId, mostrarValores]);

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest('.excalidraw, textarea, input, select')) return;
      if (evento.key === 'ArrowRight' || evento.key === 'PageDown') setIndice((i) => Math.min(slides.length - 1, i + 1));
      if (evento.key === 'ArrowLeft' || evento.key === 'PageUp') setIndice((i) => Math.max(0, i - 1));
      if (evento.key === 'Escape' && !document.fullscreenElement) sair();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [slides.length, sair]);

  if (!cliente) return null;
  const posicao = Math.min(indice, slides.length - 1);
  const atual = slides[posicao];

  return (
    <div className="apresentacao">
      <div className="apresentacao-topo">
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Logo compacto />
          <b className="titulo-apres">{cliente.nome}</b>
        </span>
        <div className="acoes" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="btn fantasma pequeno" onClick={() => setMostrarValores(!mostrarValores)} title={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}>
            {mostrarValores ? <EyeOff size={15} /> : <Eye size={15} />} <span className="texto-botao">{mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}</span>
          </button>
          <button
            type="button"
            className="btn fantasma pequeno botao-tela-cheia"
            title="Tela cheia"
            onClick={() => {
              const raiz = document.documentElement;
              (document.fullscreenElement ? document.exitFullscreen() : raiz.requestFullscreen?.())?.catch?.(() => undefined);
            }}
          >
            <Maximize size={15} /> <span className="texto-botao">Tela cheia</span>
          </button>
          <button type="button" className="btn pequeno" onClick={sair} title="Sair da apresentação">
            <X size={15} /> <span className="texto-botao">Sair</span>
          </button>
        </div>
      </div>
      <div className="slide">
        <div className="slide-interno" style={atual?.cheio ? { height: '100%' } : undefined} key={atual?.id}>
          {atual?.conteudo}
        </div>
      </div>
      <div className="apresentacao-rodape">
        <button type="button" className="btn" onClick={() => setIndice(Math.max(0, posicao - 1))} disabled={posicao === 0} aria-label="Anterior">
          <ChevronLeft size={16} /> <span className="texto-botao">Anterior</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="rotulo-slide">
            {posicao + 1}/{slides.length} · {atual?.rotulo}
          </span>
          <div className="pontos" role="tablist" aria-label="Telas">
            {slides.map((s, i) => (
              <button key={s.id} type="button" className={i === posicao ? 'ativo' : ''} onClick={() => setIndice(i)} aria-label={s.rotulo} title={s.rotulo} />
            ))}
          </div>
        </div>
        <button type="button" className="btn primario" onClick={() => setIndice(Math.min(slides.length - 1, posicao + 1))} disabled={posicao >= slides.length - 1} aria-label="Próxima">
          <span className="texto-botao">Próxima</span> <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
