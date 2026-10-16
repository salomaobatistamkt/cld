import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FolderOpen, Image as IconeImagem, Megaphone, MessageCircle, RefreshCw, Rocket, Trash2, Upload, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Modal, Vazio } from '@/components/ui';
import {
  type ConfigAprendida,
  criacaoApi,
  type EntradaPlano,
  enviarArquivo,
  ErroApi,
  type Midia,
  type ModoOrcamento,
  NOMES_CONJUNTO_PADRAO,
  nomeConjuntoSugerido,
  numeroAnuncio,
  type PlanoRevisado,
  type Publico,
  type Referencia,
  situacaoConta,
  urlMidia,
} from '@/lib/anuncios';
import { useStore } from '@/lib/store';
import { formatarMoeda } from '@/lib/util';

import { AvisoSoServidor } from './Diagnostico';

type Item = { chave: string; midia: Midia; publicoId: string; nomeConjunto: string; nomeConjuntoManual: boolean; nomeAnuncio: string; valor: string };
type Envio = { chave: string; nome: string; fracao: number; erro?: string };

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mensagem = (falha: unknown) => (falha instanceof Error ? falha.message : 'Algo deu errado.');

const Miniatura = ({ midia }: { midia: Midia }) =>
  midia.tipo === 'imagem' ? (
    <img className="miniatura-criativo" src={urlMidia(midia.id)} alt="" loading="lazy" />
  ) : (
    <video className="miniatura-criativo" src={`${urlMidia(midia.id)}#t=0.5`} preload="metadata" muted playsInline />
  );

export const BibliotecaModal = ({ clienteId, jaUsadas, aoEscolher, aoFechar }: { clienteId: string; jaUsadas: string[]; aoEscolher: (m: Midia[]) => void; aoFechar: () => void }) => {
  const [midias, setMidias] = useState<Midia[] | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  useEffect(() => {
    criacaoApi
      .midias(clienteId)
      .then((r) => setMidias(r.midias))
      .catch((f) => setErro(mensagem(f)));
  }, [clienteId]);
  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  return (
    <Modal
      titulo="Escolher da biblioteca"
      aoFechar={aoFechar}
      rodape={
        <div className="acoes">
          <button type="button" className="btn fantasma" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="btn primario" disabled={!marcadas.length} onClick={() => aoEscolher((midias ?? []).filter((m) => marcadas.includes(m.id)))}>
            Adicionar {marcadas.length || ''}
          </button>
        </div>
      }
    >
      {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}
      {midias === null ? <p className="muted">Carregando…</p> : null}
      {midias?.length === 0 ? <p className="muted">A biblioteca deste cliente está vazia. Arraste arquivos na tela de criação.</p> : null}
      <div className="grade-biblioteca">
        {midias?.map((m) => (
          <button key={m.id} type="button" className={`cartao-midia${marcadas.includes(m.id) ? ' marcada' : ''}`} onClick={() => alternar(m.id)}>
            <Miniatura midia={m} />
            <span className="nome-midia">{m.nome}</span>
            {jaUsadas.includes(m.id) ? <small className="muted">já nesta campanha</small> : null}
          </button>
        ))}
      </div>
    </Modal>
  );
};

// Anúncios → Criar campanha: configuração, criativos e públicos, revisão e publicação (sempre pausada).
export const CriarCampanha = () => {
  const { dados, ir } = useStore();
  const modoServidor = useStore((estado) => estado.backend?.modo === 'servidor');
  const nomesConjunto = dados.config.nomesConjunto?.length ? dados.config.nomesConjunto : NOMES_CONJUNTO_PADRAO;
  const clientesValidos = dados.clientes.filter((c) => c.status !== 'encerrado' && situacaoConta(c).status === 'validada');
  const clientesSemValidar = dados.clientes.filter((c) => c.status !== 'encerrado' && c.metaContaId && situacaoConta(c).status !== 'validada');

  const [etapa, setEtapa] = useState(1);
  const [clienteId, setClienteId] = useState('');
  const cliente = dados.clientes.find((c) => c.id === clienteId);
  const [modelo, setModelo] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [referencias, setReferencias] = useState<Referencia[] | null>(null);
  const [referenciaId, setReferenciaId] = useState('');
  const [config, setConfig] = useState<ConfigAprendida | null>(null);
  const [erroReferencia, setErroReferencia] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [nomeManual, setNomeManual] = useState(false);
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [modo, setModo] = useState<ModoOrcamento>('conjunto');
  const [valorCampanha, setValorCampanha] = useState('');
  const [valorPadrao, setValorPadrao] = useState('20');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const [publicos, setPublicos] = useState<Publico[] | null>(null);
  const [erroPublicos, setErroPublicos] = useState('');
  const [carregandoPublicos, setCarregandoPublicos] = useState(false);
  const [itens, setItens] = useState<Item[]>([]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [biblioteca, setBiblioteca] = useState(false);
  const [valorLote, setValorLote] = useState('');
  const entradaArquivo = useRef<HTMLInputElement>(null);

  const [revisao, setRevisao] = useState<{ plano: PlanoRevisado; avisos: string[] } | null>(null);
  const [erroRevisao, setErroRevisao] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Nome automático: Procedimento | Mensagens | Mês
  useEffect(() => {
    if (nomeManual) return;
    const tipo = modelo === 'whatsapp' ? 'Mensagens' : 'Visitas ao perfil';
    setNomeCampanha([procedimento.trim(), tipo, MESES[new Date().getMonth()]].filter(Boolean).join(' | '));
  }, [procedimento, modelo, nomeManual]);

  // Campanhas de referência da conta (copia a configuração de uma que já funciona).
  useEffect(() => {
    setReferencias(null);
    setReferenciaId('');
    setConfig(null);
    setErroReferencia('');
    if (!clienteId || !modoServidor) return;
    criacaoApi
      .referencias(clienteId, modelo)
      .then((r) => {
        setReferencias(r.referencias);
        setReferenciaId(r.referencias[0]?.id ?? '');
      })
      .catch((f) => setErroReferencia(mensagem(f)));
  }, [clienteId, modelo, modoServidor]);

  useEffect(() => {
    setConfig(null);
    setErroReferencia('');
    if (!clienteId || !referenciaId) return;
    criacaoApi
      .referencia(clienteId, referenciaId, modelo)
      .then((r) => setConfig(r.config))
      .catch((f) => setErroReferencia(mensagem(f)));
  }, [clienteId, referenciaId, modelo]);

  const carregarPublicos = useCallback(
    async (atualizar = false) => {
      if (!clienteId) return;
      setCarregandoPublicos(true);
      setErroPublicos('');
      try {
        const r = await criacaoApi.publicos(clienteId, atualizar);
        setPublicos(r.publicos);
        const erros = Object.values(r.erros);
        if (erros.length) setErroPublicos(erros.join(' · '));
      } catch (falha) {
        setErroPublicos(mensagem(falha));
      }
      setCarregandoPublicos(false);
    },
    [clienteId],
  );

  useEffect(() => {
    setPublicos(null);
    setItens([]);
    setMarcados([]);
    setRevisao(null);
    if (clienteId && modoServidor) carregarPublicos();
  }, [clienteId, modoServidor, carregarPublicos]);

  const publicosPorCategoria = useMemo(() => {
    const grupos = new Map<string, Publico[]>();
    for (const p of publicos ?? []) grupos.set(p.categoria, [...(grupos.get(p.categoria) ?? []), p]);
    const ordem = ['Aberto', 'Aberto Mulheres', 'Aberto Homens', 'Compradores', 'Compradores Mulheres', 'Compradores Homens', 'Remarketing', 'Outros públicos'];
    return [...grupos.entries()].sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]));
  }, [publicos]);

  // Mantém a numeração 01, 02, 03… sempre na ordem da lista.
  const renumerar = (lista: Item[]) => lista.map((it, i) => ({ ...it, nomeAnuncio: numeroAnuncio(i + 1, lista.length) }));

  const adicionarMidias = (novas: Midia[]) =>
    setItens((atual) =>
      renumerar([
        ...atual,
        ...novas.map((m, i) => ({
          chave: `${m.id}-${Date.now()}-${i}`,
          midia: m,
          publicoId: '',
          nomeConjunto: nomesConjunto[0] ?? '✅CJ',
          nomeConjuntoManual: false,
          nomeAnuncio: '',
          valor: valorPadrao,
        })),
      ]),
    );

  const enviarArquivos = async (arquivos: File[]) => {
    for (const arquivo of arquivos) {
      const chave = `${arquivo.name}-${arquivo.size}-${Date.now()}`;
      setEnvios((e) => [...e, { chave, nome: arquivo.name, fracao: 0 }]);
      try {
        const midia = await enviarArquivo(arquivo, clienteId, (fracao) => setEnvios((e) => e.map((x) => (x.chave === chave ? { ...x, fracao } : x))));
        setEnvios((e) => e.filter((x) => x.chave !== chave));
        adicionarMidias([midia]);
      } catch (falha) {
        setEnvios((e) => e.map((x) => (x.chave === chave ? { ...x, erro: mensagem(falha) } : x)));
      }
    }
  };

  const atualizarItem = (chave: string, mudanca: Partial<Item>) => setItens((lista) => lista.map((it) => (it.chave === chave ? { ...it, ...mudanca } : it)));
  const escolherPublico = (chaves: string[], publicoId: string) => {
    const p = publicos?.find((x) => x.id === publicoId);
    setItens((lista) =>
      lista.map((it) => {
        if (!chaves.includes(it.chave)) return it;
        const sugerido = p ? nomeConjuntoSugerido(p.categoria, nomesConjunto) : undefined;
        return { ...it, publicoId, nomeConjunto: !it.nomeConjuntoManual && sugerido ? sugerido : it.nomeConjunto };
      }),
    );
  };

  const entrada = (): EntradaPlano => ({
    clienteId,
    modelo,
    referenciaId,
    nomeCampanha,
    texto,
    titulo,
    orcamento: { modo, valor: modo === 'conjunto' ? undefined : Number(valorCampanha.replace(',', '.')), inicio: inicio || undefined, fim: fim || undefined },
    itens: itens.map((it) => ({
      midiaId: it.midia.id,
      publicoId: it.publicoId,
      nomeConjunto: it.nomeConjunto,
      nomeAnuncio: it.nomeAnuncio,
      valor: modo === 'conjunto' ? Number(it.valor.replace(',', '.')) : undefined,
    })),
  });

  const revisar = async () => {
    setOcupado(true);
    setErroRevisao('');
    setRevisao(null);
    try {
      setRevisao(await criacaoApi.revisar(entrada()));
      setEtapa(3);
    } catch (falha) {
      setErroRevisao(falha instanceof ErroApi ? falha.message : mensagem(falha));
    }
    setOcupado(false);
  };

  const publicar = async () => {
    setOcupado(true);
    setErroRevisao('');
    try {
      const { id } = await criacaoApi.publicar(entrada());
      ir({ tela: 'anuncios-execucao', id });
    } catch (falha) {
      setErroRevisao(mensagem(falha));
    }
    setOcupado(false);
  };

  // O que falta para seguir (mostrado antes de deixar avançar).
  const faltaEtapa1 = [
    !clienteId && 'Escolha o cliente.',
    clienteId && !cliente?.metaPaginaId && 'Este cliente não tem página do Facebook validada.',
    modelo === 'instagram' && clienteId && !cliente?.metaInstagramId && 'Visitas ao perfil precisa do Instagram validado do cliente.',
    !nomeCampanha.trim() && 'Dê um nome à campanha.',
    modo !== 'conjunto' && !(Number(valorCampanha.replace(',', '.')) > 0) && 'Informe o orçamento da campanha.',
    modo === 'campanha_total' && (!inicio || !fim) && 'Orçamento total precisa de início e término.',
    erroReferencia && !config && referenciaId && 'Não foi possível ler a campanha de referência.',
  ].filter(Boolean) as string[];
  const faltaEtapa2 = [
    !itens.length && 'Adicione pelo menos um criativo.',
    itens.some((it) => !it.publicoId) && 'Escolha o público de cada conjunto.',
    modo === 'conjunto' && itens.some((it) => !(Number(it.valor.replace(',', '.')) > 0)) && 'Informe o orçamento diário de cada conjunto.',
    envios.some((e) => !e.erro) && 'Espere os envios terminarem.',
  ].filter(Boolean) as string[];

  if (!modoServidor) {
    return (
      <div className="pagina">
        <div className="cabecalho">
          <div>
            <h1>
              <Rocket size={26} /> Criar campanha
            </h1>
          </div>
        </div>
        <AvisoSoServidor />
      </div>
    );
  }

  const totalDiario = modo === 'conjunto' ? itens.reduce((s, it) => s + (Number(it.valor.replace(',', '.')) || 0), 0) : Number(valorCampanha.replace(',', '.')) || 0;

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Rocket size={26} /> Criar campanha
          </h1>
          <p>Cada criativo vira um conjunto com um anúncio. Tudo é criado pausado na Meta; você ativa depois de conferir.</p>
        </div>
      </div>

      <div className="etapas-criacao" role="tablist">
        {['Configuração', 'Criativos e públicos', 'Revisar e publicar'].map((rotulo, i) => (
          <button
            key={rotulo}
            type="button"
            role="tab"
            aria-selected={etapa === i + 1}
            className={etapa === i + 1 ? 'ativo' : etapa > i + 1 ? 'feito' : ''}
            disabled={i + 1 > etapa}
            onClick={() => setEtapa(i + 1)}
          >
            <span>{etapa > i + 1 ? <CheckCircle2 size={15} /> : i + 1}</span> {rotulo}
          </button>
        ))}
      </div>

      {etapa === 1 ? (
        <section className="cartao bloco-criacao">
          <div className="grade-form">
            <label className="campo">
              <span>Cliente</span>
              <select id="cc-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Escolha…</option>
                {clientesValidos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.metaValidacao?.contaNome}
                  </option>
                ))}
              </select>
              {clientesSemValidar.length ? (
                <small>
                  {clientesSemValidar.length} cliente(s) com conta ainda não validada.{' '}
                  <button type="button" className="link-botao" onClick={() => ir({ tela: 'anuncios-contas' })}>
                    Validar contas
                  </button>
                </small>
              ) : null}
            </label>
            {cliente ? (
              <div className="campo">
                <span>Conta e ativos (validados)</span>
                <div className="info-conta">
                  <code>{cliente.metaValidacao?.contaId}</code> {cliente.metaValidacao?.contaNome}
                  <br />
                  Página: {cliente.metaPaginaNome || '—'} · Instagram: {cliente.metaInstagramUsuario ? `@${cliente.metaInstagramUsuario}` : '—'}
                </div>
              </div>
            ) : null}

            <div className="largo campo">
              <span>Modelo de campanha</span>
              <div className="modelos-campanha">
                <button type="button" className={modelo === 'whatsapp' ? 'ativo' : ''} onClick={() => setModelo('whatsapp')}>
                  <MessageCircle size={20} />
                  <b>Mensagens no WhatsApp</b>
                  <small>Engajamento → WhatsApp → conversas</small>
                </button>
                <button type="button" className={modelo === 'instagram' ? 'ativo' : ''} onClick={() => setModelo('instagram')}>
                  <IconeImagem size={20} />
                  <b>Visitas ao perfil do Instagram</b>
                  <small>Tráfego → perfil do Instagram → visitas</small>
                </button>
              </div>
            </div>

            {clienteId ? (
              <div className="largo campo">
                <span>Copiar a configuração de uma campanha que já funciona nesta conta</span>
                <select id="cc-referencia" value={referenciaId} onChange={(e) => setReferenciaId(e.target.value)}>
                  {referencias === null ? <option value="">Carregando campanhas da conta…</option> : null}
                  {referencias?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.status})
                    </option>
                  ))}
                  <option value="">Não copiar: usar o padrão do sistema</option>
                </select>
                {config ? (
                  <small className="ok-texto">
                    <CheckCircle2 size={13} /> Vai usar: destino {config.destination_type}, otimização {config.optimization_goal}, botão {config.cta.type}
                    {config.ctaCopiado ? '' : ' (botão padrão: a referência não tinha)'}.
                    {config.regulacao ? ' Anunciante verificado (Brasil): copiado.' : ' Anunciante verificado (Brasil): será buscado em outro conjunto da conta.'}
                  </small>
                ) : null}
                {!referenciaId && referencias !== null ? (
                  <small className="aviso-texto">
                    <AlertTriangle size={13} /> O padrão do sistema segue a documentação da Meta, mas ainda não foi testado nesta conta. Copiar de uma campanha que já funciona é mais seguro.
                  </small>
                ) : null}
                {erroReferencia ? <small className="erro-texto">{erroReferencia}</small> : null}
              </div>
            ) : null}

            <label className="campo">
              <span>Procedimento / produto</span>
              <input id="cc-procedimento" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} placeholder="Ex.: Botox" />
            </label>
            <label className="campo">
              <span>Nome da campanha</span>
              <input
                id="cc-nome"
                value={nomeCampanha}
                onChange={(e) => {
                  setNomeManual(true);
                  setNomeCampanha(e.target.value);
                }}
              />
              {nomeManual ? (
                <small>
                  <button type="button" className="link-botao" onClick={() => setNomeManual(false)}>
                    Voltar ao nome automático
                  </button>
                </small>
              ) : null}
            </label>
            <label className="campo largo">
              <span>Texto principal do anúncio</span>
              <textarea id="cc-texto" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Vale para todos os anúncios desta campanha." />
            </label>
            <label className="campo largo">
              <span>Título (opcional)</span>
              <input id="cc-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </label>

            <div className="largo campo">
              <span>Orçamento</span>
              <div className="segmentado quebra">
                {(
                  [
                    ['conjunto', 'Diário por conjunto'],
                    ['campanha_diario', 'Diário da campanha'],
                    ['campanha_total', 'Total da campanha'],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <button key={valor} type="button" className={modo === valor ? 'ativo' : ''} onClick={() => setModo(valor)}>
                    {rotulo}
                  </button>
                ))}
              </div>
              <small>
                {modo === 'conjunto'
                  ? 'Cada conjunto recebe o seu próprio valor diário (você define na próxima etapa).'
                  : modo === 'campanha_diario'
                    ? 'Um valor diário para a campanha inteira; a Meta distribui entre os conjuntos. Não é repetido em cada conjunto.'
                    : 'Um valor para todo o período (precisa de início e término).'}
              </small>
            </div>
            {modo === 'conjunto' ? (
              <label className="campo">
                <span>Valor diário padrão por conjunto (R$)</span>
                <input id="cc-valor-padrao" inputMode="decimal" value={valorPadrao} onChange={(e) => setValorPadrao(e.target.value)} />
                <small>Usado nos criativos que você adicionar; dá para mudar em cada um.</small>
              </label>
            ) : (
              <label className="campo">
                <span>{modo === 'campanha_diario' ? 'Valor diário da campanha (R$)' : 'Valor total (R$)'}</span>
                <input id="cc-valor" inputMode="decimal" value={valorCampanha} onChange={(e) => setValorCampanha(e.target.value)} />
              </label>
            )}
            <label className="campo">
              <span>Início {modo === 'campanha_total' ? '' : '(opcional)'}</span>
              <input id="cc-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label className="campo">
              <span>Término {modo === 'campanha_total' ? '' : '(opcional)'}</span>
              <input id="cc-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </label>
          </div>
          {faltaEtapa1.length ? <ul className="lista-falta">{faltaEtapa1.map((f) => <li key={f}>{f}</li>)}</ul> : null}
          <div className="acoes fim-etapa">
            <button type="button" className="btn primario" disabled={faltaEtapa1.length > 0} onClick={() => setEtapa(2)}>
              Próximo: criativos <ChevronRight size={16} />
            </button>
          </div>
        </section>
      ) : null}

      {etapa === 2 ? (
        <section className="cartao bloco-criacao">
          <div
            className={`area-soltar${arrastando ? ' ativa' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              enviarArquivos([...e.dataTransfer.files]);
            }}
          >
            <Upload size={26} />
            <b>Arraste imagens e vídeos aqui</b>
            <span className="muted">JPG, PNG (até 30 MB) · MP4, MOV (até 1 GB). Cada arquivo vira um conjunto com um anúncio.</span>
            <div className="acoes" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={() => entradaArquivo.current?.click()}>
                <Upload size={15} /> Escolher arquivos
              </button>
              <button type="button" className="btn" onClick={() => setBiblioteca(true)}>
                <FolderOpen size={15} /> Da biblioteca
              </button>
            </div>
            <input
              ref={entradaArquivo}
              type="file"
              multiple
              hidden
              accept=".jpg,.jpeg,.png,.mp4,.mov"
              onChange={(e) => {
                enviarArquivos([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </div>

          {envios.map((e) => (
            <div key={e.chave} className={`linha-envio${e.erro ? ' erro' : ''}`}>
              <span>{e.nome}</span>
              {e.erro ? <span className="erro-texto">{e.erro}</span> : <div className="progresso"><div style={{ width: `${Math.round(e.fracao * 100)}%` }} /></div>}
              {e.erro ? (
                <button type="button" className="btn fantasma pequeno" onClick={() => setEnvios((l) => l.filter((x) => x.chave !== e.chave))}>
                  Fechar
                </button>
              ) : (
                <span className="muted">{Math.round(e.fracao * 100)}%</span>
              )}
            </div>
          ))}

          <div className="barra-publicos">
            <span className="muted">
              {publicos === null ? 'Carregando públicos da conta…' : `${publicos.length} público(s) na conta de ${cliente?.nome}`}
            </span>
            <button type="button" className="btn fantasma pequeno" onClick={() => carregarPublicos(true)} disabled={carregandoPublicos}>
              <RefreshCw size={13} className={carregandoPublicos ? 'girando' : ''} /> Atualizar públicos
            </button>
          </div>
          {erroPublicos ? <div className="faixa alerta"><p>{erroPublicos}</p></div> : null}

          {marcados.length ? (
            <div className="barra-lote">
              <b>{marcados.length} selecionado(s):</b>
              <select aria-label="Aplicar público" value="" onChange={(e) => e.target.value && escolherPublico(marcados, e.target.value)}>
                <option value="">Aplicar público…</option>
                {publicosPorCategoria.map(([categoria, lista]) => (
                  <optgroup key={categoria} label={categoria}>
                    {lista.filter((p) => p.disponivel).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                aria-label="Aplicar nome de conjunto"
                value=""
                onChange={(e) => e.target.value && setItens((l) => l.map((it) => (marcados.includes(it.chave) ? { ...it, nomeConjunto: e.target.value, nomeConjuntoManual: true } : it)))}
              >
                <option value="">Aplicar nome de conjunto…</option>
                {nomesConjunto.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {modo === 'conjunto' ? (
                <span className="aplicar-valor">
                  <input aria-label="Orçamento diário para os selecionados" inputMode="decimal" placeholder="R$/dia" value={valorLote} onChange={(e) => setValorLote(e.target.value)} />
                  <button
                    type="button"
                    className="btn pequeno"
                    disabled={!(Number(valorLote.replace(',', '.')) > 0)}
                    onClick={() => setItens((l) => l.map((it) => (marcados.includes(it.chave) ? { ...it, valor: valorLote } : it)))}
                  >
                    Aplicar orçamento
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn fantasma pequeno perigo"
                onClick={() => {
                  setItens((l) => renumerar(l.filter((it) => !marcados.includes(it.chave))));
                  setMarcados([]);
                }}
              >
                <Trash2 size={13} /> Remover
              </button>
            </div>
          ) : null}

          {itens.length === 0 ? (
            <Vazio icone={<Megaphone size={24} />} texto="Nenhum criativo ainda. Arraste arquivos acima ou escolha da biblioteca." />
          ) : (
            <div className="lista-itens-campanha">
              <label className="marcar-todos">
                <input type="checkbox" checked={marcados.length === itens.length} onChange={(e) => setMarcados(e.target.checked ? itens.map((i) => i.chave) : [])} /> Selecionar todos
              </label>
              {itens.map((it, indice) => {
                const publico = publicos?.find((p) => p.id === it.publicoId);
                return (
                  <div key={it.chave} className={`item-campanha${marcados.includes(it.chave) ? ' marcado' : ''}`}>
                    <input
                      type="checkbox"
                      aria-label="Selecionar"
                      checked={marcados.includes(it.chave)}
                      onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, it.chave] : m.filter((x) => x !== it.chave)))}
                    />
                    <div className="previa-item">
                      <Miniatura midia={it.midia} />
                      <small>
                        {it.midia.tipo === 'video' ? <Video size={12} /> : <IconeImagem size={12} />} {it.midia.nome}
                      </small>
                    </div>
                    <div className="campos-item">
                      <div className="vinculo">
                        Conjunto {indice + 1} → anúncio <b>{it.nomeAnuncio}</b>
                      </div>
                      <label className="campo">
                        <span>Público</span>
                        <select value={it.publicoId} onChange={(e) => escolherPublico([it.chave], e.target.value)}>
                          <option value="">Escolha o público…</option>
                          {publicosPorCategoria.map(([categoria, lista]) => (
                            <optgroup key={categoria} label={categoria}>
                              {lista.map((p) => (
                                <option key={p.id} value={p.id} disabled={!p.disponivel}>
                                  {p.nome}
                                  {p.disponivel ? '' : ' (indisponível)'}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {publico ? (
                          <small>
                            {publico.tipoTexto} · ID {publico.id}
                            {publico.resumo ? ` · ${publico.resumo}` : ''}
                            {publico.tamanho ? ` · ${publico.tamanho} pessoas` : ''}
                          </small>
                        ) : null}
                      </label>
                      <label className="campo">
                        <span>Nome do conjunto</span>
                        <input list="nomes-conjunto" value={it.nomeConjunto} onChange={(e) => atualizarItem(it.chave, { nomeConjunto: e.target.value, nomeConjuntoManual: true })} />
                      </label>
                      <label className="campo">
                        <span>Nome do anúncio</span>
                        <input value={it.nomeAnuncio} onChange={(e) => atualizarItem(it.chave, { nomeAnuncio: e.target.value })} />
                      </label>
                      {modo === 'conjunto' ? (
                        <label className="campo">
                          <span>Orçamento diário (R$)</span>
                          <input inputMode="decimal" value={it.valor} onChange={(e) => atualizarItem(it.chave, { valor: e.target.value })} />
                        </label>
                      ) : null}
                    </div>
                    <button type="button" className="btn fantasma icone" aria-label="Remover" onClick={() => setItens((l) => renumerar(l.filter((x) => x.chave !== it.chave)))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
              <datalist id="nomes-conjunto">
                {nomesConjunto.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          )}

          {itens.length ? (
            <p className="resumo-orcamento">
              {itens.length} conjunto(s) · {itens.length} anúncio(s) · {modo === 'conjunto' ? `${formatarMoeda(totalDiario)} por dia somando os conjuntos` : `${formatarMoeda(totalDiario)} ${modo === 'campanha_diario' ? 'por dia (campanha)' : 'no total'}`}
            </p>
          ) : null}
          {faltaEtapa2.length ? <ul className="lista-falta">{faltaEtapa2.map((f) => <li key={f}>{f}</li>)}</ul> : null}
          {erroRevisao ? <div className="faixa alerta"><p>{erroRevisao}</p></div> : null}
          <div className="acoes fim-etapa">
            <button type="button" className="btn fantasma" onClick={() => setEtapa(1)}>
              <ChevronLeft size={16} /> Voltar
            </button>
            <button type="button" className="btn primario" disabled={faltaEtapa2.length > 0 || ocupado} onClick={revisar}>
              {ocupado ? 'Conferindo na Meta…' : 'Revisar'} <ChevronRight size={16} />
            </button>
          </div>
          {biblioteca ? (
            <BibliotecaModal
              clienteId={clienteId}
              jaUsadas={itens.map((i) => i.midia.id)}
              aoFechar={() => setBiblioteca(false)}
              aoEscolher={(m) => {
                adicionarMidias(m);
                setBiblioteca(false);
              }}
            />
          ) : null}
        </section>
      ) : null}

      {etapa === 3 && revisao ? (
        <section className="cartao bloco-criacao">
          <div className="resumo-revisao">
            <div><span>Cliente</span><b>{revisao.plano.clienteNome}</b></div>
            <div><span>Conta</span><b><code>{revisao.plano.contaId}</code> {revisao.plano.contaNome}</b></div>
            <div><span>Campanha</span><b>{revisao.plano.nomeCampanha}</b></div>
            <div><span>Objetivo → destino</span><b>{revisao.plano.config.objective} → {revisao.plano.config.destination_type} ({revisao.plano.config.optimization_goal})</b></div>
            <div><span>Configuração</span><b>{revisao.plano.config.origem === 'referencia' ? `copiada de “${revisao.plano.config.referencia?.nome}”` : 'padrão do sistema (não testada nesta conta)'}</b></div>
            <div><span>Estrutura</span><b>{revisao.plano.itens.length} conjunto(s), {revisao.plano.itens.length} anúncio(s), 1 criativo em cada</b></div>
            <div>
              <span>Orçamento</span>
              <b>
                {revisao.plano.orcamento.modo === 'conjunto'
                  ? `por conjunto · ${formatarMoeda(revisao.plano.estimativa.totalDiario ?? 0)}/dia no total`
                  : revisao.plano.orcamento.modo === 'campanha_diario'
                    ? `da campanha · ${formatarMoeda(revisao.plano.orcamento.valor ?? 0)}/dia`
                    : `total da campanha · ${formatarMoeda(revisao.plano.orcamento.valor ?? 0)}`}
                {revisao.plano.estimativa.totalPeriodo && revisao.plano.orcamento.modo !== 'campanha_total'
                  ? ` · estimativa no período: ${formatarMoeda(revisao.plano.estimativa.totalPeriodo)}`
                  : ''}
              </b>
            </div>
            <div><span>Estado ao publicar</span><b>Tudo pausado</b></div>
          </div>
          {revisao.avisos.length ? (
            <div className="faixa">
              <AlertTriangle size={18} />
              <div>{revisao.avisos.map((a) => <p key={a}>{a}</p>)}</div>
            </div>
          ) : null}
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Conjunto</th>
                  <th>Criativo</th>
                  <th>Público (ID)</th>
                  <th style={{ textAlign: 'right' }}>Orçamento</th>
                </tr>
              </thead>
              <tbody>
                {revisao.plano.itens.map((i) => (
                  <tr key={i.n}>
                    <td><b>{i.nomeAnuncio}</b></td>
                    <td>{i.nomeConjunto}</td>
                    <td>{i.midiaNome}</td>
                    <td>
                      {i.publico.nome} <code>{i.publico.id}</code>
                      <div className="muted" style={{ fontSize: 12 }}>{i.resumoPublico}</div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{i.valor ? `${formatarMoeda(i.valor)}/dia` : 'da campanha'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {erroRevisao ? <div className="faixa alerta"><p>{erroRevisao}</p></div> : null}
          <div className="acoes fim-etapa">
            <button type="button" className="btn fantasma" onClick={() => setEtapa(2)}>
              <ChevronLeft size={16} /> Editar
            </button>
            <button type="button" className="btn primario" disabled={ocupado} onClick={publicar}>
              <Rocket size={16} /> {ocupado ? 'Enviando…' : 'Publicar pausado na Meta'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            A publicação roda no servidor: pode fechar a página. Acompanhe em Anúncios → Central de execução. A aprovação e a entrega dependem da Meta.
          </p>
        </section>
      ) : null}
    </div>
  );
};
