import { Building2, Check, Database, Download, ImagePlus, Megaphone, Pencil, Plug, Plus, Settings, Tags, Trash2, Upload, Wallet, Webhook as WebhookIcone, Workflow, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Campo, Confirmar, useItemAtivoVisivel } from '@/components/ui';
import { metaApi } from '@/lib/meta';
import { dadosVazios, useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { criarDadosExemplo } from '@/lib/seed';
import { type Config, type Dados } from '@/lib/types';

import { SecaoWebhooks } from './Webhooks';

type Secao = { id: string; rotulo: string; icone: ReactNode; descricao: string };

const SECOES: Secao[] = [
  { id: 'empresa', rotulo: 'Empresa', icone: <Building2 size={17} />, descricao: 'Nome e logo que aparecem no menu e nas apresentações para clientes.' },
  { id: 'servicos', rotulo: 'Serviços que você vende', icone: <Tags size={17} />, descricao: 'A lista de tipos de serviço. Ela aparece quando você cadastra um serviço num cliente e serve de filtro nas entregas.' },
  { id: 'caixa', rotulo: 'Categorias do caixa', icone: <Wallet size={17} />, descricao: 'Como você classifica o dinheiro que entra e que sai. Aparecem ao registrar um lançamento no Caixa.' },
  { id: 'processos', rotulo: 'Áreas dos processos', icone: <Workflow size={17} />, descricao: 'Agrupam os processos da empresa na tela Processos (ex.: Comercial, Produção).' },
  { id: 'integracoes', rotulo: 'Integrações', icone: <Plug size={17} />, descricao: 'Conexão com o Meta Ads para ver as métricas das campanhas dos clientes.' },
  { id: 'webhooks', rotulo: 'Webhooks', icone: <WebhookIcone size={17} />, descricao: 'Avisa outros sistemas (n8n, Make, Zapier) quando uma cobrança vence, é paga, ou quando um cliente ou entrega muda. Ex.: lembrete de pagamento no WhatsApp.' },
  { id: 'dados', rotulo: 'Seus dados', icone: <Database size={17} />, descricao: 'Onde os dados ficam, cópia de segurança e dados de exemplo.' },
];

// Lista com renomear e excluir em cada linha, mostrando quantas vezes cada item é usado.
const ListaItens = ({
  itens,
  uso,
  aoMudar,
  aoRenomear,
  exemplo,
}: {
  itens: string[];
  uso: (item: string) => number;
  aoMudar: (itens: string[]) => void;
  aoRenomear: (antigo: string, novo: string) => void;
  exemplo: string;
}) => {
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState<{ original: string; valor: string } | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const adicionar = () => {
    const valor = novo.trim();
    if (!valor || itens.includes(valor)) return;
    aoMudar([...itens, valor]);
    setNovo('');
  };

  return (
    <div className="lista-config">
      {itens.map((item) => (
        <div key={item} className="item-config">
          {editando?.original === item ? (
            <form
              style={{ display: 'flex', gap: 8, flex: 1 }}
              onSubmit={(e) => {
                e.preventDefault();
                const valor = editando.valor.trim();
                if (valor && valor !== item && !itens.includes(valor)) aoRenomear(item, valor);
                setEditando(null);
              }}
            >
              <input id={`ren-${item}`} className="input" autoFocus value={editando.valor} onChange={(e) => setEditando({ original: item, valor: e.target.value })} />
              <button type="submit" className="btn icone" aria-label="Salvar nome">
                <Check size={16} />
              </button>
              <button type="button" className="btn fantasma icone" aria-label="Cancelar" onClick={() => setEditando(null)}>
                <X size={16} />
              </button>
            </form>
          ) : (
            <>
              <span className="nome-item">{item}</span>
              <span className="muted uso">{uso(item) ? `usado ${uso(item)}×` : 'sem uso'}</span>
              <button type="button" className="btn fantasma icone" aria-label={`Renomear ${item}`} onClick={() => setEditando({ original: item, valor: item })}>
                <Pencil size={15} />
              </button>
              <button type="button" className="btn fantasma icone perigo" aria-label={`Excluir ${item}`} onClick={() => setExcluindo(item)}>
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      ))}
      <form
        className="item-config novo"
        onSubmit={(e) => {
          e.preventDefault();
          adicionar();
        }}
      >
        <input id={`novo-${exemplo}`} className="input" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder={`Novo… (ex.: ${exemplo})`} />
        <button type="submit" className="btn primario" disabled={!novo.trim()}>
          <Plus size={15} /> Adicionar
        </button>
      </form>
      {excluindo ? (
        <Confirmar
          texto={
            uso(excluindo)
              ? `"${excluindo}" está em uso ${uso(excluindo)} vez(es). Os registros continuam com esse nome, mas ele some da lista de opções. Excluir mesmo assim?`
              : `Excluir "${excluindo}" da lista?`
          }
          aoCancelar={() => setExcluindo(null)}
          aoConfirmar={() => {
            aoMudar(itens.filter((i) => i !== excluindo));
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
};

const reduzirImagem = (arquivo: File) =>
  new Promise<string>((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onerror = rejeitar;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = rejeitar;
      img.onload = () => {
        const escala = Math.min(1, 480 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolver(canvas.toDataURL('image/png'));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });

const IntegracaoMeta = () => {
  const modo = useStore((estado) => estado.backend?.modo ?? 'local');
  const mostrar = useToast((estado) => estado.mostrar);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (modo !== 'servidor') return;
    metaApi.estado().then((r) => setConectado(r.conectado)).catch(() => setConectado(false));
  }, [modo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="passos">
        <div><b>1</b><span>No Gerenciador de Negócios da Meta, crie um <b>usuário do sistema</b> e gere um token com a permissão <code>ads_read</code>.</span></div>
        <div><b>2</b><span>Cole o token abaixo. Ele fica guardado só no servidor e nunca volta para a tela.</span></div>
        <div><b>3</b><span>Na ficha de cada cliente, informe a <b>conta de anúncios</b> dele (act_…). As métricas aparecem na aba Campanhas.</span></div>
      </div>
      {modo !== 'servidor' ? (
        <div className="faixa">
          <Megaphone size={18} />
          <p>
            <b>Disponível quando o Konext estiver instalado no servidor.</b> No protótipo, as campanhas mostram números de demonstração para você ver como fica.
          </p>
        </div>
      ) : (
        <form
          className="grade-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setSalvando(true);
            setErro('');
            try {
              const r = await metaApi.conectar(token.trim());
              setConectado(true);
              setToken('');
              mostrar(`Conectado. ${r.contas} conta(s) de anúncio encontrada(s).`);
            } catch (falha) {
              setErro(falha instanceof Error ? falha.message : 'Não foi possível conectar');
            }
            setSalvando(false);
          }}
        >
          <Campo rotulo="Token de acesso" dica={conectado ? 'Já existe um token guardado. Cole um novo só se quiser trocar.' : 'Precisa da permissão ads_read.'} largo>
            <input id="meta-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={conectado ? 'Guardado — preencha só para trocar' : 'EAA…'} />
          </Campo>
          {erro ? <p className="largo" style={{ color: 'var(--tag-red)', margin: 0 }}>{erro}</p> : null}
          <div className="largo acoes">
            <span className={`tag ${conectado ? 'green' : 'slate'}`}>{conectado === null ? 'Verificando…' : conectado ? 'Conectado' : 'Não conectado'}</span>
            <button type="submit" className="btn primario" disabled={salvando || token.trim().length < 20}>
              {salvando ? 'Conectando…' : 'Salvar e testar'}
            </button>
            {conectado ? (
              <button
                type="button"
                className="btn fantasma perigo"
                onClick={async () => {
                  await metaApi.desconectar();
                  setConectado(false);
                  mostrar('Meta Ads desconectado');
                }}
              >
                Desconectar
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
};

export const Configuracoes = ({ aba = 'empresa' }: { aba?: string }) => {
  const { dados, salvarConfig, salvar, backend, ir, substituirTudo } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const config = dados.config;
  const secao = SECOES.find((s) => s.id === aba) ?? SECOES[0];
  const menuRef = useItemAtivoVisivel<HTMLElement>('[aria-current="page"]', secao.id);
  const [confirmar, setConfirmar] = useState<'zerar' | 'exemplos' | null>(null);
  const [importado, setImportado] = useState<Dados | null>(null);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const entradaLogo = useRef<HTMLInputElement>(null);

  const mudar = (parcial: Partial<Config>, aviso = 'Salvo') => {
    salvarConfig({ ...config, ...parcial });
    mostrar(aviso);
  };

  const renomear = (campo: 'tiposServico' | 'categoriasEntrada' | 'categoriasSaida' | 'areasProcesso', antigo: string, novo: string) => {
    mudar({ [campo]: config[campo].map((i) => (i === antigo ? novo : i)) } as Partial<Config>, 'Renomeado em todos os registros');
    if (campo === 'tiposServico') dados.servicos.filter((s) => s.tipo === antigo).forEach((s) => salvar('servicos', { ...s, tipo: novo }));
    if (campo === 'categoriasEntrada' || campo === 'categoriasSaida')
      dados.lancamentos.filter((l) => l.categoria === antigo).forEach((l) => salvar('lancamentos', { ...l, categoria: novo }));
    if (campo === 'areasProcesso') dados.processos.filter((p) => p.area === antigo).forEach((p) => salvar('processos', { ...p, area: novo }));
  };

  const baixarBackup = () => {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `konext-gestao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Settings size={26} /> Configurações
          </h1>
          <p>Ajuste as listas e conexões do sistema. Escolha uma seção.</p>
        </div>
      </div>

      <div className="layout-config">
        <nav className="menu-config" aria-label="Seções das configurações" ref={menuRef}>
          {SECOES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === secao.id ? 'ativo' : ''}
              aria-current={s.id === secao.id ? 'page' : undefined}
              onClick={() => ir({ tela: 'config', aba: s.id })}
            >
              {s.icone}
              <span>{s.rotulo}</span>
            </button>
          ))}
        </nav>

        <section className="cartao">
          <div className="cabeca-secao">
            <span className="icone-secao">{secao.icone}</span>
            <div>
              <h2>{secao.rotulo}</h2>
              <p className="muted">{secao.descricao}</p>
            </div>
          </div>

          {secao.id === 'empresa' ? (
            <div className="grade-form">
              <Campo rotulo="Nome da empresa">
                <input id="cfg-empresa" defaultValue={config.empresa} onBlur={(e) => e.target.value.trim() && e.target.value !== config.empresa && mudar({ empresa: e.target.value.trim() })} />
              </Campo>
              <Campo rotulo="Logo" dica="PNG ou JPG. Aparece no menu e na capa das apresentações. Sem logo, usamos o nome da Konext.">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="previa-logo">{config.logo ? <img src={config.logo} alt="Logo atual" /> : <span className="logo-texto">konext</span>}</span>
                  <button type="button" className="btn" onClick={() => entradaLogo.current?.click()}>
                    <ImagePlus size={15} /> {config.logo ? 'Trocar logo' : 'Enviar logo'}
                  </button>
                  {config.logo ? (
                    <button type="button" className="btn fantasma perigo" onClick={() => mudar({ logo: '' }, 'Logo removido')}>
                      Remover
                    </button>
                  ) : null}
                  <input
                    ref={entradaLogo}
                    id="cfg-logo"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const arquivo = e.target.files?.[0];
                      if (!arquivo) return;
                      try {
                        mudar({ logo: await reduzirImagem(arquivo) }, 'Logo atualizado');
                      } catch {
                        mostrar('Não consegui ler essa imagem', true);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </Campo>
            </div>
          ) : null}

          {secao.id === 'servicos' ? (
            <ListaItens
              itens={config.tiposServico}
              exemplo="Gestão de YouTube"
              uso={(item) => dados.servicos.filter((s) => s.tipo === item).length}
              aoMudar={(tiposServico) => mudar({ tiposServico })}
              aoRenomear={(a, n) => renomear('tiposServico', a, n)}
            />
          ) : null}

          {secao.id === 'caixa' ? (
            <div className="grade-2">
              <div>
                <h3 className="subtitulo-config">Entradas (o que você recebe)</h3>
                <ListaItens
                  itens={config.categoriasEntrada}
                  exemplo="Comissão"
                  uso={(item) => dados.lancamentos.filter((l) => l.tipo === 'entrada' && l.categoria === item).length}
                  aoMudar={(categoriasEntrada) => mudar({ categoriasEntrada })}
                  aoRenomear={(a, n) => renomear('categoriasEntrada', a, n)}
                />
              </div>
              <div>
                <h3 className="subtitulo-config">Saídas (o que você paga)</h3>
                <ListaItens
                  itens={config.categoriasSaida}
                  exemplo="Aluguel"
                  uso={(item) => dados.lancamentos.filter((l) => l.tipo === 'saida' && l.categoria === item).length}
                  aoMudar={(categoriasSaida) => mudar({ categoriasSaida })}
                  aoRenomear={(a, n) => renomear('categoriasSaida', a, n)}
                />
              </div>
            </div>
          ) : null}

          {secao.id === 'processos' ? (
            <ListaItens
              itens={config.areasProcesso}
              exemplo="Pós-venda"
              uso={(item) => dados.processos.filter((p) => p.area === item).length}
              aoMudar={(areasProcesso) => mudar({ areasProcesso })}
              aoRenomear={(a, n) => renomear('areasProcesso', a, n)}
            />
          ) : null}

          {secao.id === 'integracoes' ? <IntegracaoMeta /> : null}

          {secao.id === 'webhooks' ? <SecaoWebhooks /> : null}

          {secao.id === 'dados' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="faixa">
                <Database size={18} />
                <p>
                  {backend?.modo === 'servidor'
                    ? 'Os dados ficam no servidor: todo mundo que entra no Konext vê as mesmas informações, de qualquer aparelho.'
                    : 'Protótipo: os dados ficam salvos só neste navegador. Quando o Konext for instalado no servidor, eles passam a ficar online.'}
                </p>
              </div>
              <div className="acoes">
                <button type="button" className="btn" onClick={baixarBackup}>
                  <Download size={15} /> Baixar cópia de segurança
                </button>
                <button type="button" className="btn" onClick={() => entradaArquivo.current?.click()}>
                  <Upload size={15} /> Restaurar cópia
                </button>
                <input
                  ref={entradaArquivo}
                  id="cfg-importar"
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const arquivo = e.target.files?.[0];
                    if (!arquivo) return;
                    try {
                      const lido = JSON.parse(await arquivo.text()) as Dados;
                      if (!Array.isArray(lido.clientes)) throw new Error('formato');
                      setImportado(lido);
                    } catch {
                      mostrar('Esse arquivo não é uma cópia do Konext Gestão', true);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
              <div className="acoes">
                <button type="button" className="btn fantasma" onClick={() => setConfirmar('exemplos')}>
                  Carregar dados de exemplo
                </button>
                <button type="button" className="btn fantasma perigo" onClick={() => setConfirmar('zerar')}>
                  <Trash2 size={15} /> Apagar todos os dados
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {confirmar === 'zerar' ? (
        <Confirmar
          texto="Apagar todos os clientes, serviços, entregas, quadros, lançamentos e processos? As configurações ficam. Baixe uma cópia antes, se quiser guardar."
          rotuloAcao="Apagar tudo"
          aoCancelar={() => setConfirmar(null)}
          aoConfirmar={() => {
            substituirTudo({ ...dadosVazios(), config }, false);
            setConfirmar(null);
            mostrar('Dados apagados');
          }}
        />
      ) : null}
      {confirmar === 'exemplos' ? (
        <Confirmar
          texto="Substituir os dados atuais pelos dados de exemplo?"
          rotuloAcao="Carregar exemplos"
          aoCancelar={() => setConfirmar(null)}
          aoConfirmar={() => {
            substituirTudo(criarDadosExemplo(), true);
            setConfirmar(null);
            mostrar('Exemplos carregados');
          }}
        />
      ) : null}
      {importado ? (
        <Confirmar
          texto={`Restaurar a cópia com ${importado.clientes.length} cliente(s)? Os dados atuais serão substituídos.`}
          rotuloAcao="Restaurar"
          aoCancelar={() => setImportado(null)}
          aoConfirmar={() => {
            substituirTudo({ ...dadosVazios(), ...importado, config: { ...config, ...importado.config } }, false);
            setImportado(null);
            mostrar('Cópia restaurada');
          }}
        />
      ) : null}
    </div>
  );
};
