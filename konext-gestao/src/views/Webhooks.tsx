import { Check, CircleAlert, Copy, Pencil, Plus, RefreshCw, Send, Trash2, Webhook as IconeWebhook } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Campo, Confirmar, Modal } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { novoId } from '@/lib/util';
import { type AtividadeWebhook, EVENTOS_WEBHOOK, type Webhook, webhooksApi } from '@/lib/webhooks';

const GRUPOS: Array<{ titulo: string; prefixo: string }> = [
  { titulo: 'Financeiro', prefixo: 'cobranca.' },
  { titulo: 'Clientes', prefixo: 'cliente.' },
  { titulo: 'Entregas', prefixo: 'entrega.' },
];

const EXEMPLO = `{
  "event": "cobranca.vencida",
  "occurred_at": "2026-10-16T11:00:00.000Z",
  "data": {
    "cobranca": { "id": "…", "descricao": "Padaria · Tráfego pago",
                  "valor": 1500, "vencimento": "2026-10-15", "pago": false },
    "cliente": { "nome": "Padaria Pão Dourado",
                 "contato": { "nome": "Marina", "whatsapp": "(11) 98888-1020" } },
    "servico": { "nome": "Tráfego pago", "dia_pagamento": 15 },
    "dias_para_vencer": -1
  }
}`;

const copiar = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};

const FormWebhook = ({ inicial, aoFechar, aoSalvar }: { inicial: Webhook; aoFechar: () => void; aoSalvar: () => void }) => {
  const mostrar = useToast((estado) => estado.mostrar);
  const [hook, setHook] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const alternar = (evento: string) =>
    setHook({ ...hook, eventos: hook.eventos.includes(evento) ? hook.eventos.filter((e) => e !== evento) : [...hook.eventos, evento] });

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await webhooksApi.salvar(hook);
      mostrar(inicial.criadoEm ? 'Webhook atualizado' : 'Webhook criado. Use "Enviar teste" para conferir.');
      aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar');
    }
    setSalvando(false);
  };

  return (
    <Modal
      titulo={inicial.criadoEm ? 'Editar webhook' : 'Novo webhook'}
      aoFechar={aoFechar}
      rodape={
        <div className="acoes">
          <button type="button" className="btn fantasma" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="btn primario" onClick={salvar} disabled={salvando || !hook.url.trim() || hook.eventos.length === 0}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <div className="grade-form">
        <Campo rotulo="Nome" dica="Só para você reconhecer. Ex.: n8n — lembrete de cobrança" largo>
          <input id="wh-nome" value={hook.nome} onChange={(e) => setHook({ ...hook, nome: e.target.value })} placeholder="n8n — cobranças" />
        </Campo>
        <Campo rotulo="URL que vai receber os avisos" dica="No n8n: nó Webhook → método POST → copie a Production URL." largo>
          <input id="wh-url" inputMode="url" value={hook.url} onChange={(e) => setHook({ ...hook, url: e.target.value })} placeholder="https://n8n.kntbr.com/webhook/…" />
        </Campo>
        <div className="largo eventos-webhook">
          <span className="rotulo-eventos">Quando avisar</span>
          {GRUPOS.map((grupo) => (
            <fieldset key={grupo.prefixo}>
              <legend>{grupo.titulo}</legend>
              {Object.entries(EVENTOS_WEBHOOK)
                .filter(([id]) => id.startsWith(grupo.prefixo))
                .map(([id, rotulo]) => (
                  <label key={id} className="opcao-evento">
                    <input type="checkbox" checked={hook.eventos.includes(id)} onChange={() => alternar(id)} />
                    <span>
                      {rotulo}
                      <code>{id}</code>
                    </span>
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
        <label className="largo opcao-evento">
          <input type="checkbox" checked={hook.ativo} onChange={(e) => setHook({ ...hook, ativo: e.target.checked })} />
          <span>Ativo (desmarque para pausar sem apagar)</span>
        </label>
        {erro ? <div className="largo faixa alerta"><p>{erro}</p></div> : null}
      </div>
    </Modal>
  );
};

export const SecaoWebhooks = () => {
  const modo = useStore((estado) => estado.backend?.modo ?? 'local');
  const mostrar = useToast((estado) => estado.mostrar);
  const [lista, setLista] = useState<Webhook[] | null>(null);
  const [atividade, setAtividade] = useState<AtividadeWebhook[]>([]);
  const [editando, setEditando] = useState<Webhook | null>(null);
  const [excluir, setExcluir] = useState<Webhook | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (modo !== 'servidor') return;
    try {
      const [{ webhooks }, { atividade: registros }] = await Promise.all([webhooksApi.listar(), webhooksApi.atividade()]);
      setLista(webhooks);
      setAtividade(registros);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar');
    }
  }, [modo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const testar = async (hook: Webhook) => {
    setTestando(hook.id);
    try {
      const r = await webhooksApi.testar(hook.id);
      mostrar(r.ok ? `Teste entregue (resposta ${r.resposta})` : `Falhou: ${r.erro}`, !r.ok);
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : 'Falhou', true);
    }
    setTestando(null);
    carregar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="passos">
        <div><b>1</b><span>No n8n (ou Make, Zapier), crie um fluxo começando por um nó <b>Webhook</b> com método POST e copie a URL de produção.</span></div>
        <div><b>2</b><span>Aqui, clique em <b>Novo webhook</b>, cole a URL e marque quando o Konext deve avisar, por exemplo: <i>cobrança vence em 3 dias</i> e <i>cobrança venceu</i>.</span></div>
        <div><b>3</b><span>Clique em <b>Enviar teste</b>. No n8n, use os dados recebidos (nome, WhatsApp, valor, vencimento) para mandar a mensagem pela Evolution API.</span></div>
      </div>

      {modo !== 'servidor' ? (
        <div className="faixa">
          <IconeWebhook size={18} />
          <p>
            <b>Disponível quando o Konext estiver instalado no servidor.</b> Os avisos saem do servidor, então funcionam mesmo com o sistema fechado.
          </p>
        </div>
      ) : (
        <>
          <div className="acoes">
            <button
              type="button"
              className="btn primario"
              onClick={() => setEditando({ id: novoId(), nome: '', url: '', eventos: ['cobranca.vencendo', 'cobranca.vencida'], ativo: true, segredo: '', criadoEm: '' })}
            >
              <Plus size={15} /> Novo webhook
            </button>
            <button type="button" className="btn fantasma" onClick={carregar}>
              <RefreshCw size={15} /> Atualizar
            </button>
          </div>
          {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}

          {lista === null ? (
            <p className="muted">Carregando…</p>
          ) : lista.length === 0 ? (
            <p className="muted">Nenhum webhook ainda.</p>
          ) : (
            <div className="lista-webhooks">
              {lista.map((hook) => (
                <div key={hook.id} className="cartao-webhook">
                  <div className="topo-webhook">
                    <div style={{ minWidth: 0 }}>
                      <b>{hook.nome}</b>
                      <div className="url-webhook">{hook.url}</div>
                    </div>
                    <span className={`tag ${hook.ativo ? 'green' : 'slate'}`}>{hook.ativo ? 'Ativo' : 'Pausado'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {hook.eventos.map((e) => (
                      <span key={e} className="chip" title={e}>
                        {EVENTOS_WEBHOOK[e] ?? e}
                      </span>
                    ))}
                  </div>
                  <div className="segredo-webhook">
                    <span className="muted">Segredo da assinatura</span>
                    <code>{hook.segredo}</code>
                    <button
                      type="button"
                      className="btn fantasma pequeno"
                      onClick={async () => mostrar((await copiar(hook.segredo)) ? 'Segredo copiado' : 'Não deu para copiar. Selecione e copie.')}
                    >
                      <Copy size={13} /> Copiar
                    </button>
                  </div>
                  <div className="acoes">
                    <button type="button" className="btn pequeno" onClick={() => testar(hook)} disabled={testando === hook.id}>
                      <Send size={13} /> {testando === hook.id ? 'Enviando…' : 'Enviar teste'}
                    </button>
                    <button type="button" className="btn fantasma pequeno" onClick={() => setEditando(hook)}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button type="button" className="btn fantasma pequeno perigo" onClick={() => setExcluir(hook)}>
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>Últimos envios</h3>
            {atividade.length === 0 ? (
              <p className="muted">Os avisos enviados aparecem aqui, com o resultado de cada um.</p>
            ) : (
              <div className="lista-atividade">
                {atividade.slice(0, 30).map((a) => (
                  <div key={a.id} className="linha-atividade">
                    {a.status === 'ok' ? <Check size={15} color="var(--good)" /> : <CircleAlert size={15} color="var(--bad)" />}
                    <div style={{ minWidth: 0 }}>
                      <b>{EVENTOS_WEBHOOK[a.evento] ?? (a.evento === 'teste' ? 'Teste' : a.evento)}</b>
                      <div className="muted">
                        {a.webhook} · {new Date(a.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        {a.status === 'ok' ? ` · resposta ${a.resposta}` : ` · ${a.erro} (${a.tentativas} tentativa${a.tentativas > 1 ? 's' : ''})`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <details className="detalhes-tecnicos">
        <summary>Formato do aviso (para quem monta o fluxo)</summary>
        <p className="muted">
          O Konext envia um <code>POST</code> em JSON. O cabeçalho <code>X-Konext-Event</code> traz o evento, e <code>X-Konext-Signature</code> traz o HMAC-SHA256
          (hex) do corpo, feito com o segredo acima. Se o destino não responder 2xx, o Konext tenta de novo 2 vezes (após 1s e 5s). Os avisos de vencimento saem
          uma vez por cobrança, entre 8h e 20h (horário de Brasília).
        </p>
        <pre className="exemplo-json">{EXEMPLO}</pre>
      </details>

      {editando ? <FormWebhook inicial={editando} aoFechar={() => setEditando(null)} aoSalvar={carregar} /> : null}
      {excluir ? (
        <Confirmar
          texto={`Excluir o webhook "${excluir.nome}"? Ele para de receber avisos na hora.`}
          aoCancelar={() => setExcluir(null)}
          aoConfirmar={async () => {
            await webhooksApi.remover(excluir.id).catch(() => undefined);
            setExcluir(null);
            mostrar('Webhook excluído');
            carregar();
          }}
        />
      ) : null}
    </div>
  );
};
