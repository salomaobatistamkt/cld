import {
  ArrowLeft,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileText,
  KeyRound,
  Megaphone,
  Package,
  Pencil,
  PenTool,
  Plus,
  Presentation,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { FormCliente, FormLancamento, FormServico, novoLancamento, novoServico } from '@/components/formularios';
import { Kanban } from '@/components/Kanban';
import { PainelCampanhas } from '@/components/PainelCampanhas';
import { Avatar, Campo, Confirmar, Modal, Tag, useItemAtivoVisivel, Vazio } from '@/components/ui';
import { RECORRENCIA, STATUS_CLIENTE, STATUS_SERVICO } from '@/lib/constantes';
import { valorMensal } from '@/lib/financeiro';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Acesso, type Lancamento, type Servico } from '@/lib/types';
import { formatarData, formatarMoeda, novoId } from '@/lib/util';

import { GradeQuadros, NovoQuadro } from './Quadros';

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral', icone: <FileText size={15} /> },
  { id: 'servicos', rotulo: 'Serviços', icone: <ClipboardList size={15} /> },
  { id: 'entregas', rotulo: 'Entregas', icone: <Package size={15} /> },
  { id: 'estrategia', rotulo: 'Estratégias', icone: <PenTool size={15} /> },
  { id: 'campanhas', rotulo: 'Campanhas', icone: <Megaphone size={15} /> },
  { id: 'financeiro', rotulo: 'Financeiro', icone: <CircleDollarSign size={15} /> },
  { id: 'acessos', rotulo: 'Acessos', icone: <KeyRound size={15} /> },
];

const Item = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <>
    <dt>{rotulo}</dt>
    <dd>{valor?.trim() ? valor : <span className="muted">—</span>}</dd>
  </>
);

export const ClienteFicha = ({ id, aba = 'visao' }: { id: string; aba?: string }) => {
  const { dados, ir, remover, salvar } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const cliente = dados.clientes.find((c) => c.id === id);
  const [editando, setEditando] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [servico, setServico] = useState<Servico | null>(null);
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [novoQuadro, setNovoQuadro] = useState(false);
  const abasRef = useItemAtivoVisivel<HTMLDivElement>('[aria-selected="true"]', aba);

  if (!cliente) {
    return (
      <div className="pagina">
        <Vazio texto="Cliente não encontrado." acao={<button type="button" className="btn" onClick={() => ir({ tela: 'clientes' })}>Voltar para clientes</button>} />
      </div>
    );
  }

  const servicos = dados.servicos.filter((s) => s.clienteId === id);
  const entregas = dados.entregas.filter((e) => e.clienteId === id);
  const quadros = dados.quadros.filter((q) => q.clienteId === id);
  const lancamentos = dados.lancamentos.filter((l) => l.clienteId === id).sort((a, b) => b.data.localeCompare(a.data));
  const mensal = servicos.reduce((soma, s) => soma + valorMensal(s), 0);
  const recebido = lancamentos.filter((l) => l.tipo === 'entrada' && l.pago).reduce((soma, l) => soma + l.valor, 0);
  const pendente = lancamentos.filter((l) => l.tipo === 'entrada' && !l.pago).reduce((soma, l) => soma + l.valor, 0);
  const trocarAba = (nova: string) => ir({ tela: 'cliente', id, aba: nova });

  return (
    <div className="pagina">
      <button type="button" className="btn fantasma pequeno" style={{ alignSelf: 'flex-start' }} onClick={() => ir({ tela: 'clientes' })}>
        <ArrowLeft size={15} /> Clientes
      </button>

      <div className="ficha-topo">
        <Avatar nome={cliente.nome} cor={cliente.cor} tamanho={64} />
        <div className="info">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <h1>{cliente.nome}</h1>
            <Tag rotulo={STATUS_CLIENTE[cliente.status]} />
          </div>
          <span className="muted">
            {[cliente.segmento, cliente.contato.nome && `Contato: ${cliente.contato.nome}`, cliente.clienteDesde && `Cliente desde ${formatarData(cliente.clienteDesde, true)}`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <div className="acoes">
          <button type="button" className="btn" onClick={() => setEditando(true)}>
            <Pencil size={15} /> Editar
          </button>
          <button type="button" className="btn primario" onClick={() => ir({ tela: 'apresentacao', clienteId: id })}>
            <Presentation size={16} /> Apresentar ao cliente
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="rotulo">Valor mensal</div>
          <div className="valor">{formatarMoeda(mensal, true)}</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Serviços ativos</div>
          <div className="valor">{servicos.filter((s) => s.status === 'ativo').length}</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Entregas</div>
          <div className="valor">
            {entregas.filter((e) => e.status === 'entregue').length}
            <span className="muted" style={{ fontSize: 16 }}>/{entregas.length}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="rotulo">Recebido (total)</div>
          <div className="valor">{formatarMoeda(recebido, true)}</div>
          {pendente ? <div className="detalhe">{formatarMoeda(pendente)} a receber</div> : null}
        </div>
      </div>

      <div className="abas" role="tablist" ref={abasRef}>
        {ABAS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={aba === item.id} className={aba === item.id ? 'ativo' : ''} onClick={() => trocarAba(item.id)}>
            {item.icone}
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === 'visao' ? (
        <div className="grade-2">
          <section className="cartao">
            <div className="cartao-titulo">
              <h3>Dados e contato</h3>
            </div>
            <dl className="dl">
              <Item rotulo="Empresa" valor={cliente.empresa} />
              <Item rotulo="CNPJ / CPF" valor={cliente.documento} />
              <Item rotulo="Contato" valor={cliente.contato.nome} />
              <Item rotulo="WhatsApp" valor={cliente.contato.whatsapp} />
              <Item rotulo="E-mail" valor={cliente.contato.email} />
              <Item rotulo="Instagram" valor={cliente.contato.instagram} />
              <Item rotulo="Site" valor={cliente.contato.site} />
            </dl>
          </section>
          <section className="cartao">
            <div className="cartao-titulo">
              <h3>Briefing</h3>
              <button type="button" className="btn fantasma pequeno" onClick={() => setEditando(true)}>
                <Pencil size={14} /> Editar
              </button>
            </div>
            <dl className="dl">
              <Item rotulo="Público-alvo" valor={cliente.briefing.publico} />
              <Item rotulo="Objetivos" valor={cliente.briefing.objetivos} />
              <Item rotulo="Tom de voz" valor={cliente.briefing.tomDeVoz} />
              <Item rotulo="Identidade visual" valor={cliente.briefing.identidade} />
              <Item rotulo="Concorrentes" valor={cliente.briefing.concorrentes} />
              <Item rotulo="Observações" valor={cliente.briefing.observacoes} />
            </dl>
          </section>
        </div>
      ) : null}

      {aba === 'servicos' ? (
        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Serviços contratados</h3>
            <button type="button" className="btn primario pequeno" onClick={() => setServico(novoServico(id, dados.config.tiposServico[0] ?? 'Serviço'))}>
              <Plus size={14} /> Novo serviço
            </button>
          </div>
          {servicos.length === 0 ? (
            <Vazio texto="Nenhum serviço ainda. Adicione o que este cliente contratou, com valor e dia de pagamento." />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Recorrência</th>
                    <th>Pagamento</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {servicos.map((s) => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setServico(s)}>
                      <td>
                        <b>{s.nome}</b>
                        {s.escopo ? <div className="muted" style={{ fontSize: 12.5, maxWidth: 420 }}>{s.escopo}</div> : null}
                      </td>
                      <td><span className="chip">{s.tipo}</span></td>
                      <td><Tag rotulo={STATUS_SERVICO[s.status]} /></td>
                      <td>{RECORRENCIA[s.recorrencia].label}</td>
                      <td>Todo dia {s.diaPagamento}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 800 }}>{formatarMoeda(s.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {aba === 'entregas' ? <Kanban entregas={entregas} clienteFixo={id} /> : null}

      {aba === 'estrategia' ? (
        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Quadros de estratégia</h3>
            <button type="button" className="btn primario pequeno" onClick={() => setNovoQuadro(true)}>
              <Plus size={14} /> Novo quadro
            </button>
          </div>
          {quadros.length === 0 ? <Vazio texto="Crie um funil, mapa mental ou plano de campanha para este cliente." /> : <GradeQuadros quadros={quadros} />}
        </section>
      ) : null}

      {aba === 'campanhas' ? (
        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Campanhas no Meta</h3>
          </div>
          <PainelCampanhas contaId={cliente.metaContaId} aoConfigurar={() => setEditando(true)} />
        </section>
      ) : null}

      {aba === 'financeiro' ? (
        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Lançamentos deste cliente</h3>
            <button type="button" className="btn primario pequeno" onClick={() => setLancamento({ ...novoLancamento('entrada', dados.config.categoriasEntrada[0] ?? 'Outros'), clienteId: id })}>
              <Plus size={14} /> Registrar recebimento
            </button>
          </div>
          {lancamentos.length === 0 ? (
            <Vazio texto="Nenhum lançamento. As cobranças mensais aparecem aqui depois de geradas no Caixa." />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Situação</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l) => (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setLancamento(l)}>
                      <td className="num">{formatarData(l.data, true)}</td>
                      <td>{l.descricao}</td>
                      <td>
                        {l.pago ? <span className="tag green">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</span> : (
                          <button
                            type="button"
                            className="btn pequeno"
                            onClick={(evento) => {
                              evento.stopPropagation();
                              salvar('lancamentos', { ...l, pago: true });
                              mostrar('Marcado como recebido');
                            }}
                          >
                            Marcar recebido
                          </button>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 800, color: l.tipo === 'saida' ? 'var(--tag-red)' : undefined }}>
                        {l.tipo === 'saida' ? '−' : ''}
                        {formatarMoeda(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {aba === 'acessos' ? (
        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Contas e acessos</h3>
            <button type="button" className="btn primario pequeno" onClick={() => setAcesso({ id: novoId(), plataforma: '', login: '', link: '', ondeSenha: '' })}>
              <Plus size={14} /> Novo acesso
            </button>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Por segurança, não guarde senhas aqui: anote em qual cofre de senhas (ex.: Bitwarden) elas estão.
          </p>
          {cliente.acessos.length === 0 ? (
            <Vazio texto="Nenhum acesso registrado." />
          ) : (
            <div className="lista">
              {cliente.acessos.map((a) => (
                <div key={a.id} className="linha clicavel" onClick={() => setAcesso(a)}>
                  <div style={{ minWidth: 0 }}>
                    <div className="titulo">{a.plataforma}</div>
                    <div className="sub">
                      {[a.login, a.ondeSenha && `Senha: ${a.ondeSenha}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noreferrer" className="btn fantasma pequeno" onClick={(e) => e.stopPropagation()}>
                      Abrir <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div>
        <button type="button" className="btn fantasma perigo pequeno" onClick={() => setExcluir(true)}>
          <Trash2 size={14} /> Excluir cliente
        </button>
      </div>

      {editando ? <FormCliente inicial={cliente} aoFechar={() => setEditando(false)} /> : null}
      {servico ? <FormServico inicial={servico} aoFechar={() => setServico(null)} /> : null}
      {lancamento ? <FormLancamento inicial={lancamento} aoFechar={() => setLancamento(null)} /> : null}
      {novoQuadro ? <NovoQuadro clienteId={id} aoFechar={() => setNovoQuadro(false)} /> : null}
      {acesso ? (
        <FormAcesso
          inicial={acesso}
          aoFechar={() => setAcesso(null)}
          aoSalvar={(final) => {
            const existe = cliente.acessos.some((a) => a.id === final.id);
            salvar('clientes', { ...cliente, acessos: existe ? cliente.acessos.map((a) => (a.id === final.id ? final : a)) : [...cliente.acessos, final] });
            setAcesso(null);
          }}
          aoExcluir={() => {
            salvar('clientes', { ...cliente, acessos: cliente.acessos.filter((a) => a.id !== acesso.id) });
            setAcesso(null);
          }}
        />
      ) : null}
      {excluir ? (
        <Confirmar
          texto={`Excluir ${cliente.nome} com todos os serviços, entregas, quadros e lançamentos dele? Não dá para desfazer.`}
          aoCancelar={() => setExcluir(false)}
          aoConfirmar={() => {
            servicos.forEach((s) => remover('servicos', s.id));
            entregas.forEach((e) => remover('entregas', e.id));
            quadros.forEach((q) => remover('quadros', q.id));
            lancamentos.forEach((l) => remover('lancamentos', l.id));
            remover('clientes', id);
            mostrar('Cliente excluído');
            ir({ tela: 'clientes' });
          }}
        />
      ) : null}
    </div>
  );
};

const FormAcesso = ({
  inicial,
  aoFechar,
  aoSalvar,
  aoExcluir,
}: {
  inicial: Acesso;
  aoFechar: () => void;
  aoSalvar: (acesso: Acesso) => void;
  aoExcluir: () => void;
}) => {
  const [a, setA] = useState(inicial);
  return (
    <Modal
      titulo={inicial.plataforma ? `Acesso: ${inicial.plataforma}` : 'Novo acesso'}
      aoFechar={aoFechar}
      pequeno
      rodape={
        <>
          <button type="button" className="btn fantasma perigo" onClick={aoExcluir}>
            <Trash2 size={15} /> Excluir
          </button>
          <button type="button" className="btn primario" disabled={!a.plataforma.trim()} onClick={() => aoSalvar(a)}>
            Salvar
          </button>
        </>
      }
    >
      <div className="grade-form">
        <Campo rotulo="Plataforma *" largo>
          <input id="ac-plat" value={a.plataforma} onChange={(e) => setA({ ...a, plataforma: e.target.value })} placeholder="Instagram, Meta Ads, Google, hospedagem…" autoFocus />
        </Campo>
        <Campo rotulo="Login / usuário" largo>
          <input id="ac-login" value={a.login} onChange={(e) => setA({ ...a, login: e.target.value })} />
        </Campo>
        <Campo rotulo="Link" largo>
          <input id="ac-link" value={a.link} onChange={(e) => setA({ ...a, link: e.target.value })} placeholder="https://" />
        </Campo>
        <Campo rotulo="Onde está a senha" dica="Ex.: Bitwarden › pasta do cliente" largo>
          <input id="ac-senha" value={a.ondeSenha} onChange={(e) => setA({ ...a, ondeSenha: e.target.value })} />
        </Campo>
      </div>
    </Modal>
  );
};
