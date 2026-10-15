import { CheckCircle2, MessageCircle, Plus, RotateCcw } from 'lucide-react';

import { Avatar, Vazio } from '@/components/ui';
import { type CobrancaPrevista, cobrancasDoMes } from '@/lib/financeiro';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Cliente, type Lancamento } from '@/lib/types';
import { diasAte, formatarData, formatarMoeda, hojeISO, nomeMes, novoId } from '@/lib/util';

type Situacao = { chave: 'atrasada' | 'hoje' | 'avencer' | 'agerar' | 'recebida'; rotulo: string; cor: string; ordem: number };

const situacao = ({ data, lancamento }: CobrancaPrevista): Situacao => {
  if (lancamento?.pago) return { chave: 'recebida', rotulo: 'Recebida', cor: 'green', ordem: 4 };
  const dias = diasAte(data);
  if (!lancamento) return { chave: 'agerar', rotulo: 'Ainda não gerada', cor: 'slate', ordem: 3 };
  if (dias < 0) return { chave: 'atrasada', rotulo: `Atrasada há ${-dias} dia${dias === -1 ? '' : 's'}`, cor: 'red', ordem: 0 };
  if (dias === 0) return { chave: 'hoje', rotulo: 'Vence hoje', cor: 'amber', ordem: 1 };
  return { chave: 'avencer', rotulo: `Vence em ${dias} dia${dias === 1 ? '' : 's'}`, cor: 'sky', ordem: 2 };
};

// Link do WhatsApp com a mensagem de cobrança pronta (o envio é feito por quem clica).
const linkWhatsApp = (cliente: Cliente | undefined, c: CobrancaPrevista, atrasada: boolean) => {
  const numero = (cliente?.contato.whatsapp || '').replace(/\D/g, '');
  if (numero.length < 10) return null;
  const completo = numero.length <= 11 ? `55${numero}` : numero;
  const palavras = (cliente?.contato.nome || '').split(/\s+/).filter((p) => p && !/^(dr|dra|sr|sra|prof|profa)\.?$/i.test(p));
  const nome = palavras[0] || cliente?.nome || '';
  const texto = atrasada
    ? `Olá, ${nome}! Tudo bem? Notamos que a mensalidade de ${c.servico.nome} (${formatarMoeda(c.servico.valor)}), com vencimento em ${formatarData(c.data)}, ainda está em aberto. Consegue verificar para nós? Qualquer dúvida, estamos à disposição.`
    : `Olá, ${nome}! Tudo bem? Passando para lembrar da mensalidade de ${c.servico.nome} (${formatarMoeda(c.servico.valor)}), com vencimento em ${formatarData(c.data)}. Qualquer dúvida, estamos à disposição!`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
};

// Cobranças dos serviços recorrentes no mês: o que gerar, o que cobrar e o que já entrou.
export const Cobrancas = ({ mes }: { mes: string }) => {
  const { dados, salvar, ir } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const cobrancas = cobrancasDoMes(mes, dados.servicos, dados.lancamentos)
    .map((c) => ({ ...c, s: situacao(c) }))
    .sort((a, b) => a.s.ordem - b.s.ordem || a.data.localeCompare(b.data));
  const naoGeradas = cobrancas.filter((c) => !c.lancamento);
  const abertas = cobrancas.filter((c) => c.lancamento && !c.lancamento.pago);
  const atrasadas = cobrancas.filter((c) => c.s.chave === 'atrasada');
  const recebidas = cobrancas.filter((c) => c.s.chave === 'recebida');
  const total = (lista: typeof cobrancas) => lista.reduce((soma, c) => soma + (c.lancamento?.valor ?? c.servico.valor), 0);
  const categoria = dados.config.categoriasEntrada.includes('Mensalidade') ? 'Mensalidade' : (dados.config.categoriasEntrada[0] ?? 'Mensalidade');

  const gerar = (lista: CobrancaPrevista[]) => {
    lista.forEach(({ servico, data }) => {
      const cliente = dados.clientes.find((c) => c.id === servico.clienteId);
      const lancamento: Lancamento = {
        id: novoId(),
        tipo: 'entrada',
        descricao: `${cliente?.nome ?? 'Cliente'} · ${servico.nome}`,
        categoria,
        valor: servico.valor,
        data,
        pago: false,
        clienteId: servico.clienteId,
        servicoId: servico.id,
      };
      salvar('lancamentos', lancamento);
    });
    mostrar(lista.length === 1 ? 'Cobrança gerada' : `${lista.length} cobranças geradas para ${nomeMes(mes)}`);
  };

  const marcar = (lancamento: Lancamento, pago: boolean) => {
    salvar('lancamentos', { ...lancamento, pago });
    mostrar(pago ? 'Recebimento confirmado. Entrou no caixa.' : 'Voltou para "a receber"');
  };

  return (
    <section className="cartao">
      <div className="cartao-titulo">
        <div>
          <h3>Cobranças dos serviços</h3>
          {cobrancas.length ? (
            <p className="resumo-cobrancas">
              {recebidas.length} de {cobrancas.length} recebidas · {formatarMoeda(total(abertas))} a receber
              {atrasadas.length ? <b> · {atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''}</b> : null}
            </p>
          ) : null}
        </div>
        {naoGeradas.length ? (
          <button type="button" className="btn primario pequeno" onClick={() => gerar(naoGeradas)}>
            <Plus size={14} /> Gerar {naoGeradas.length} cobrança{naoGeradas.length === 1 ? '' : 's'}
          </button>
        ) : cobrancas.length ? (
          <span className="tag green">
            <CheckCircle2 size={13} /> Todas geradas
          </span>
        ) : null}
      </div>

      {naoGeradas.length && mes <= hojeISO().slice(0, 7) ? (
        <p className="dica-cobrancas">
          “Gerar” cria uma entrada <b>a receber</b> no caixa para cada serviço. Depois, é só marcar <b>Recebido</b> quando o dinheiro cair.
        </p>
      ) : null}

      {cobrancas.length === 0 ? (
        <Vazio
          texto="Nenhuma cobrança neste mês. Elas aparecem aqui quando um cliente tem um serviço com status Ativo e recorrência mensal, trimestral, semestral ou anual."
          acao={
            <button type="button" className="btn pequeno" onClick={() => ir({ tela: 'clientes' })}>
              Ver clientes
            </button>
          }
        />
      ) : (
        <div className="lista">
          {cobrancas.map((c) => {
            const cliente = dados.clientes.find((cl) => cl.id === c.servico.clienteId);
            const whats = c.lancamento && !c.lancamento.pago ? linkWhatsApp(cliente, c, c.s.chave === 'atrasada') : null;
            return (
              <div key={c.servico.id} className={`linha-cobranca ${c.s.chave}`}>
                <div className="quem">
                  {cliente ? <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={32} /> : null}
                  <div style={{ minWidth: 0 }}>
                    <div className="titulo">{cliente?.nome ?? 'Cliente removido'}</div>
                    <div className="sub">
                      {c.servico.nome} · vence {formatarData(c.data)} · <b>{formatarMoeda(c.lancamento?.valor ?? c.servico.valor)}</b>
                    </div>
                  </div>
                </div>
                <span className={`tag ${c.s.cor}`}>{c.s.rotulo}</span>
                <div className="acoes-cobranca">
                  {!c.lancamento ? (
                    <button type="button" className="btn pequeno" onClick={() => gerar([c])}>
                      <Plus size={13} /> Gerar
                    </button>
                  ) : c.lancamento.pago ? (
                    <button type="button" className="btn fantasma pequeno" onClick={() => marcar(c.lancamento!, false)} title="Desfazer recebimento">
                      <RotateCcw size={13} /> Desfazer
                    </button>
                  ) : (
                    <>
                      {whats ? (
                        <a className="btn fantasma pequeno" href={whats} target="_blank" rel="noreferrer" title="Abrir o WhatsApp com a mensagem pronta">
                          <MessageCircle size={13} /> Cobrar
                        </a>
                      ) : null}
                      <button type="button" className="btn primario pequeno" onClick={() => marcar(c.lancamento!, true)}>
                        <CheckCircle2 size={13} /> Recebido
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
