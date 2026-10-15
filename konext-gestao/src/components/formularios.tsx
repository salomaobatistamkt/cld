import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { CORES_AVATAR, ORDEM_STATUS_ENTREGA, PRIORIDADE, RECORRENCIA, STATUS_CLIENTE, STATUS_ENTREGA, STATUS_SERVICO } from '@/lib/constantes';
import { entregasDoProcesso, etapasPendentes, processoDoTipo } from '@/lib/processoServico';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import {
  type Cliente,
  type Entrega,
  type Lancamento,
  type Prioridade,
  type Recorrencia,
  type Servico,
  type StatusCliente,
  type StatusEntrega,
  type StatusServico,
} from '@/lib/types';
import { hojeISO, novoId } from '@/lib/util';

import { Campo, Confirmar, Modal } from './ui';

export const novoCliente = (): Cliente => ({
  id: novoId(),
  nome: '',
  empresa: '',
  segmento: '',
  status: 'onboarding',
  cor: CORES_AVATAR[Math.floor(Math.random() * CORES_AVATAR.length)],
  clienteDesde: hojeISO(),
  contato: { nome: '', whatsapp: '', email: '', instagram: '', site: '' },
  documento: '',
  briefing: { publico: '', tomDeVoz: '', objetivos: '', concorrentes: '', identidade: '', observacoes: '' },
  acessos: [],
  metaContaId: '',
  notasReuniao: '',
  criadoEm: hojeISO(),
});

const RodapeSalvar = ({
  aoCancelar,
  aoExcluir,
  rotulo = 'Salvar',
  desabilitado = false,
}: {
  aoCancelar: () => void;
  aoExcluir?: () => void;
  rotulo?: string;
  desabilitado?: boolean;
}) => (
  <>
    <div>
      {aoExcluir ? (
        <button type="button" className="btn fantasma perigo" onClick={aoExcluir}>
          <Trash2 size={16} /> Excluir
        </button>
      ) : null}
    </div>
    <div className="acoes">
      <button type="button" className="btn fantasma" onClick={aoCancelar}>
        Cancelar
      </button>
      <button type="submit" form="form-modal" className="btn primario" disabled={desabilitado}>
        {rotulo}
      </button>
    </div>
  </>
);

// ---------------- Cliente ----------------
export const FormCliente = ({ inicial, aoFechar }: { inicial: Cliente; aoFechar: (salvo?: Cliente) => void }) => {
  const salvar = useStore((estado) => estado.salvar);
  const mostrar = useToast((estado) => estado.mostrar);
  const [c, setC] = useState(inicial);
  const novo = !useStore.getState().dados.clientes.some((item) => item.id === inicial.id);
  const contato = (campo: keyof Cliente['contato'], valor: string) => setC({ ...c, contato: { ...c.contato, [campo]: valor } });
  const briefing = (campo: keyof Cliente['briefing'], valor: string) => setC({ ...c, briefing: { ...c.briefing, [campo]: valor } });

  return (
    <Modal
      titulo={novo ? 'Novo cliente' : `Editar ${inicial.nome}`}
      aoFechar={() => aoFechar()}
      rodape={<RodapeSalvar aoCancelar={() => aoFechar()} desabilitado={!c.nome.trim()} rotulo={novo ? 'Cadastrar cliente' : 'Salvar'} />}
    >
      <form
        id="form-modal"
        className="grade-form"
        onSubmit={(evento) => {
          evento.preventDefault();
          const final = { ...c, nome: c.nome.trim() };
          salvar('clientes', final);
          mostrar(novo ? 'Cliente cadastrado' : 'Cliente atualizado');
          aoFechar(final);
        }}
      >
        <Campo rotulo="Nome do cliente / marca *">
          <input id="cli-nome" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} autoFocus placeholder="Ex.: Padaria Pão Dourado" />
        </Campo>
        <Campo rotulo="Status">
          <select id="cli-status" value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as StatusCliente })}>
            {Object.entries(STATUS_CLIENTE).map(([valor, r]) => (
              <option key={valor} value={valor}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Razão social / empresa">
          <input id="cli-empresa" value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
        </Campo>
        <Campo rotulo="CNPJ / CPF">
          <input id="cli-doc" value={c.documento} onChange={(e) => setC({ ...c, documento: e.target.value })} />
        </Campo>
        <Campo rotulo="Segmento">
          <input id="cli-seg" value={c.segmento} onChange={(e) => setC({ ...c, segmento: e.target.value })} placeholder="Ex.: Saúde, varejo, moda" />
        </Campo>
        <Campo rotulo="Cliente desde">
          <input id="cli-desde" type="date" value={c.clienteDesde} onChange={(e) => setC({ ...c, clienteDesde: e.target.value })} />
        </Campo>
        <Campo rotulo="Contato principal">
          <input id="cli-contato" value={c.contato.nome} onChange={(e) => contato('nome', e.target.value)} />
        </Campo>
        <Campo rotulo="WhatsApp">
          <input id="cli-whats" value={c.contato.whatsapp} onChange={(e) => contato('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
        </Campo>
        <Campo rotulo="E-mail">
          <input id="cli-email" type="email" value={c.contato.email} onChange={(e) => contato('email', e.target.value)} />
        </Campo>
        <Campo rotulo="Instagram">
          <input id="cli-insta" value={c.contato.instagram} onChange={(e) => contato('instagram', e.target.value)} placeholder="@perfil" />
        </Campo>
        <Campo rotulo="Site">
          <input id="cli-site" value={c.contato.site} onChange={(e) => contato('site', e.target.value)} />
        </Campo>
        <Campo rotulo="Cor do cliente">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CORES_AVATAR.map((cor) => (
              <button
                key={cor}
                type="button"
                aria-label={`Cor ${cor}`}
                onClick={() => setC({ ...c, cor })}
                style={{ width: 26, height: 26, borderRadius: 8, background: cor, border: c.cor === cor ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }}
              />
            ))}
          </div>
        </Campo>
        <Campo rotulo="Conta de anúncios do Meta" dica="Para ver as campanhas deste cliente. Ex.: act_123456789">
          <input id="cli-meta" value={c.metaContaId} onChange={(e) => setC({ ...c, metaContaId: e.target.value.trim() })} placeholder="act_…" />
        </Campo>
        <h3 className="largo" style={{ fontSize: 15, marginTop: 6 }}>
          Briefing
        </h3>
        <Campo rotulo="Público-alvo" largo>
          <textarea id="cli-publico" value={c.briefing.publico} onChange={(e) => briefing('publico', e.target.value)} />
        </Campo>
        <Campo rotulo="Objetivos e metas">
          <textarea id="cli-obj" value={c.briefing.objetivos} onChange={(e) => briefing('objetivos', e.target.value)} />
        </Campo>
        <Campo rotulo="Tom de voz">
          <textarea id="cli-tom" value={c.briefing.tomDeVoz} onChange={(e) => briefing('tomDeVoz', e.target.value)} />
        </Campo>
        <Campo rotulo="Identidade visual (cores, fontes)">
          <textarea id="cli-id" value={c.briefing.identidade} onChange={(e) => briefing('identidade', e.target.value)} />
        </Campo>
        <Campo rotulo="Concorrentes">
          <textarea id="cli-conc" value={c.briefing.concorrentes} onChange={(e) => briefing('concorrentes', e.target.value)} />
        </Campo>
        <Campo rotulo="Observações" largo>
          <textarea id="cli-obs" value={c.briefing.observacoes} onChange={(e) => briefing('observacoes', e.target.value)} />
        </Campo>
      </form>
    </Modal>
  );
};

// ---------------- Serviço ----------------
export const novoServico = (clienteId: string, tipo: string): Servico => ({
  id: novoId(),
  clienteId,
  tipo,
  nome: '',
  valor: 0,
  recorrencia: 'mensal',
  diaPagamento: 10,
  inicio: hojeISO(),
  status: 'ativo',
  escopo: '',
});

export const FormServico = ({ inicial, aoFechar }: { inicial: Servico; aoFechar: () => void }) => {
  const { salvar, remover } = useStore();
  const { clientes, config } = useStore((estado) => estado.dados);
  const mostrar = useToast((estado) => estado.mostrar);
  const [s, setS] = useState(inicial);
  const [confirmar, setConfirmar] = useState(false);
  const [novoTipo, setNovoTipo] = useState('');
  const existe = useStore.getState().dados.servicos.some((item) => item.id === inicial.id);
  const salvarConfig = useStore((estado) => estado.salvarConfig);
  const entregas = useStore((estado) => estado.dados.entregas);
  const [aplicarProcesso, setAplicarProcesso] = useState(true);
  const processo = processoDoTipo(config, s.tipo);
  const pendentes = existe ? [] : etapasPendentes(s, config, entregas);

  if (confirmar) {
    return (
      <Confirmar
        texto={`Excluir o serviço "${s.nome}"? As entregas continuam no cliente, sem serviço vinculado.`}
        aoCancelar={() => setConfirmar(false)}
        aoConfirmar={() => {
          remover('servicos', s.id);
          mostrar('Serviço excluído');
          aoFechar();
        }}
      />
    );
  }

  return (
    <Modal
      titulo={existe ? 'Editar serviço' : 'Novo serviço'}
      aoFechar={aoFechar}
      rodape={<RodapeSalvar aoCancelar={aoFechar} aoExcluir={existe ? () => setConfirmar(true) : undefined} desabilitado={!s.nome.trim() || !s.clienteId} />}
    >
      <form
        id="form-modal"
        className="grade-form"
        onSubmit={(evento) => {
          evento.preventDefault();
          const servico = { ...s, nome: s.nome.trim() };
          salvar('servicos', servico);
          const novas = !existe && aplicarProcesso ? entregasDoProcesso(servico, config, entregas) : [];
          novas.forEach((entrega) => salvar('entregas', entrega));
          mostrar(existe ? 'Serviço atualizado' : novas.length ? `Serviço adicionado com ${novas.length} etapas nas entregas` : 'Serviço adicionado');
          aoFechar();
        }}
      >
        <Campo rotulo="Cliente *">
          <select id="srv-cliente" value={s.clienteId} onChange={(e) => setS({ ...s, clienteId: e.target.value })}>
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Tipo de serviço" dica="Crie novos tipos aqui mesmo ou em Configurações.">
          <div style={{ display: 'flex', gap: 6 }}>
            <select id="srv-tipo" value={s.tipo} onChange={(e) => setS({ ...s, tipo: e.target.value })}>
              {config.tiposServico.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="srv-novo-tipo" placeholder="Novo tipo…" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} />
            <button
              type="button"
              className="btn pequeno"
              disabled={!novoTipo.trim()}
              onClick={() => {
                const tipo = novoTipo.trim();
                if (!config.tiposServico.includes(tipo)) salvarConfig({ ...config, tiposServico: [...config.tiposServico, tipo] });
                setS({ ...s, tipo });
                setNovoTipo('');
              }}
            >
              <Plus size={14} /> Criar
            </button>
          </div>
        </Campo>
        {!existe && processo ? (
          <label className="largo aviso-processo">
            <input type="checkbox" checked={aplicarProcesso} onChange={(e) => setAplicarProcesso(e.target.checked)} />
            <span>
              <b>Criar as {pendentes.length} etapas do processo de {s.tipo}</b>
              <small>
                Viram entregas com prazo a partir da data de início
                {processo.rotina.length ? ` · ${processo.rotina.length} tarefa(s) entram na Rotina enquanto o serviço estiver ativo` : ''}.
              </small>
            </span>
          </label>
        ) : null}
        <Campo rotulo="Nome do serviço *" largo>
          <input id="srv-nome" value={s.nome} onChange={(e) => setS({ ...s, nome: e.target.value })} placeholder="Ex.: Gestão de tráfego — plano Pro" autoFocus />
        </Campo>
        <Campo rotulo="Valor (R$)">
          <input
            id="srv-valor"
            type="number"
            min={0}
            step="0.01"
            value={s.valor || ''}
            onChange={(e) => setS({ ...s, valor: Number(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Recorrência">
          <select id="srv-rec" value={s.recorrencia} onChange={(e) => setS({ ...s, recorrencia: e.target.value as Recorrencia })}>
            {Object.entries(RECORRENCIA).map(([valor, r]) => (
              <option key={valor} value={valor}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Dia do pagamento">
          <input
            id="srv-dia"
            type="number"
            min={1}
            max={31}
            value={s.diaPagamento}
            onChange={(e) => setS({ ...s, diaPagamento: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </Campo>
        <Campo rotulo="Início">
          <input id="srv-inicio" type="date" value={s.inicio} onChange={(e) => setS({ ...s, inicio: e.target.value })} />
        </Campo>
        <Campo rotulo="Status">
          <select id="srv-status" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value as StatusServico })}>
            {Object.entries(STATUS_SERVICO).map(([valor, r]) => (
              <option key={valor} value={valor}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Escopo (o que está incluído)" largo>
          <textarea id="srv-escopo" value={s.escopo} onChange={(e) => setS({ ...s, escopo: e.target.value })} />
        </Campo>
      </form>
    </Modal>
  );
};

// ---------------- Entrega ----------------
export const novaEntrega = (clienteId: string, status: StatusEntrega = 'a_fazer'): Entrega => ({
  id: novoId(),
  clienteId,
  servicoId: null,
  titulo: '',
  descricao: '',
  status,
  prioridade: 'media',
  prazo: '',
  responsavel: '',
  link: '',
  entregueEm: '',
  ordem: Date.now(),
});

export const FormEntrega = ({ inicial, aoFechar }: { inicial: Entrega; aoFechar: () => void }) => {
  const { salvar, remover } = useStore();
  const { clientes, servicos } = useStore((estado) => estado.dados);
  const mostrar = useToast((estado) => estado.mostrar);
  const [e, setE] = useState(inicial);
  const [confirmar, setConfirmar] = useState(false);
  const existe = useStore.getState().dados.entregas.some((item) => item.id === inicial.id);
  const servicosDoCliente = servicos.filter((s) => s.clienteId === e.clienteId);

  if (confirmar) {
    return (
      <Confirmar
        texto={`Excluir a entrega "${e.titulo}"?`}
        aoCancelar={() => setConfirmar(false)}
        aoConfirmar={() => {
          remover('entregas', e.id);
          mostrar('Entrega excluída');
          aoFechar();
        }}
      />
    );
  }

  return (
    <Modal
      titulo={existe ? 'Editar entrega' : 'Nova entrega'}
      aoFechar={aoFechar}
      rodape={<RodapeSalvar aoCancelar={aoFechar} aoExcluir={existe ? () => setConfirmar(true) : undefined} desabilitado={!e.titulo.trim() || !e.clienteId} />}
    >
      <form
        id="form-modal"
        className="grade-form"
        onSubmit={(evento) => {
          evento.preventDefault();
          const entregueEm = e.status === 'entregue' ? e.entregueEm || hojeISO() : '';
          salvar('entregas', { ...e, titulo: e.titulo.trim(), entregueEm });
          mostrar(existe ? 'Entrega atualizada' : 'Entrega criada');
          aoFechar();
        }}
      >
        <Campo rotulo="O que será entregue? *" largo>
          <input id="ent-titulo" value={e.titulo} onChange={(ev) => setE({ ...e, titulo: ev.target.value })} autoFocus placeholder="Ex.: 3 reels da campanha de Natal" />
        </Campo>
        <Campo rotulo="Cliente *">
          <select id="ent-cliente" value={e.clienteId} onChange={(ev) => setE({ ...e, clienteId: ev.target.value, servicoId: null })}>
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Serviço">
          <select id="ent-servico" value={e.servicoId ?? ''} onChange={(ev) => setE({ ...e, servicoId: ev.target.value || null })}>
            <option value="">Sem serviço específico</option>
            {servicosDoCliente.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Status">
          <select id="ent-status" value={e.status} onChange={(ev) => setE({ ...e, status: ev.target.value as StatusEntrega })}>
            {ORDEM_STATUS_ENTREGA.map((valor) => (
              <option key={valor} value={valor}>
                {STATUS_ENTREGA[valor].label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Prioridade">
          <select id="ent-prio" value={e.prioridade} onChange={(ev) => setE({ ...e, prioridade: ev.target.value as Prioridade })}>
            {Object.entries(PRIORIDADE).map(([valor, r]) => (
              <option key={valor} value={valor}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Prazo">
          <input id="ent-prazo" type="date" value={e.prazo} onChange={(ev) => setE({ ...e, prazo: ev.target.value })} />
        </Campo>
        <Campo rotulo="Responsável">
          <input id="ent-resp" value={e.responsavel} onChange={(ev) => setE({ ...e, responsavel: ev.target.value })} />
        </Campo>
        <Campo rotulo="Link (arquivo, pasta, publicação)" largo>
          <input id="ent-link" value={e.link} onChange={(ev) => setE({ ...e, link: ev.target.value })} placeholder="https://" />
        </Campo>
        <Campo rotulo="Detalhes / checklist" largo>
          <textarea id="ent-desc" value={e.descricao} onChange={(ev) => setE({ ...e, descricao: ev.target.value })} />
        </Campo>
        <label className="largo opcao-evento">
          <input type="checkbox" checked={Boolean(e.interna)} onChange={(ev) => setE({ ...e, interna: ev.target.checked })} />
          <span>
            Interna <code>só a equipe vê; não aparece na apresentação ao cliente</code>
          </span>
        </label>
      </form>
    </Modal>
  );
};

// ---------------- Lançamento ----------------
export const novoLancamento = (tipo: 'entrada' | 'saida', categoria: string): Lancamento => ({
  id: novoId(),
  tipo,
  descricao: '',
  categoria,
  valor: 0,
  data: hojeISO(),
  pago: true,
  clienteId: null,
  servicoId: null,
});

export const FormLancamento = ({ inicial, aoFechar }: { inicial: Lancamento; aoFechar: () => void }) => {
  const { salvar, remover } = useStore();
  const { clientes, config } = useStore((estado) => estado.dados);
  const mostrar = useToast((estado) => estado.mostrar);
  const [l, setL] = useState(inicial);
  const [confirmar, setConfirmar] = useState(false);
  const existe = useStore.getState().dados.lancamentos.some((item) => item.id === inicial.id);
  const categorias = l.tipo === 'entrada' ? config.categoriasEntrada : config.categoriasSaida;

  if (confirmar) {
    return (
      <Confirmar
        texto={`Excluir o lançamento "${l.descricao}"?`}
        aoCancelar={() => setConfirmar(false)}
        aoConfirmar={() => {
          remover('lancamentos', l.id);
          mostrar('Lançamento excluído');
          aoFechar();
        }}
      />
    );
  }

  return (
    <Modal
      titulo={existe ? 'Editar lançamento' : l.tipo === 'entrada' ? 'Nova entrada' : 'Nova saída'}
      aoFechar={aoFechar}
      pequeno
      rodape={<RodapeSalvar aoCancelar={aoFechar} aoExcluir={existe ? () => setConfirmar(true) : undefined} desabilitado={!l.descricao.trim() || !l.valor} />}
    >
      <form
        id="form-modal"
        className="grade-form"
        onSubmit={(evento) => {
          evento.preventDefault();
          salvar('lancamentos', { ...l, descricao: l.descricao.trim() });
          mostrar(existe ? 'Lançamento atualizado' : 'Lançamento registrado');
          aoFechar();
        }}
      >
        <div className="largo segmentado" role="group" aria-label="Tipo">
          <button type="button" className={l.tipo === 'entrada' ? 'ativo' : ''} onClick={() => setL({ ...l, tipo: 'entrada', categoria: config.categoriasEntrada[0] })}>
            Entrada
          </button>
          <button type="button" className={l.tipo === 'saida' ? 'ativo' : ''} onClick={() => setL({ ...l, tipo: 'saida', categoria: config.categoriasSaida[0] })}>
            Saída
          </button>
        </div>
        <Campo rotulo="Descrição *" largo>
          <input id="lan-desc" value={l.descricao} onChange={(e) => setL({ ...l, descricao: e.target.value })} autoFocus />
        </Campo>
        <Campo rotulo="Valor (R$) *">
          <input id="lan-valor" type="number" min={0} step="0.01" value={l.valor || ''} onChange={(e) => setL({ ...l, valor: Number(e.target.value) })} />
        </Campo>
        <Campo rotulo="Data">
          <input id="lan-data" type="date" value={l.data} onChange={(e) => setL({ ...l, data: e.target.value })} />
        </Campo>
        <Campo rotulo="Categoria">
          <select id="lan-cat" value={l.categoria} onChange={(e) => setL({ ...l, categoria: e.target.value })}>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Cliente (opcional)">
          <select id="lan-cliente" value={l.clienteId ?? ''} onChange={(e) => setL({ ...l, clienteId: e.target.value || null })}>
            <option value="">Nenhum</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <label className="largo" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
          <input id="lan-pago" type="checkbox" checked={l.pago} onChange={(e) => setL({ ...l, pago: e.target.checked })} />
          {l.tipo === 'entrada' ? 'Já recebido' : 'Já pago'}
        </label>
      </form>
    </Modal>
  );
};
