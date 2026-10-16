import { AtSign, Building2, CheckCircle2, Flag, Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Avatar, Modal, Vazio } from '@/components/ui';
import { anunciosApi, type AtivosConta, ErroApi, situacaoConta } from '@/lib/anuncios';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type Cliente } from '@/lib/types';

import { AvisoSoServidor } from './Diagnostico';

const COR_SITUACAO = { 'sem-conta': 'slate', invalida: 'red', pendente: 'amber', validada: 'green' } as const;

const ValidarConta = ({ cliente, aoFechar }: { cliente: Cliente; aoFechar: () => void }) => {
  const mostrar = useToast((estado) => estado.mostrar);
  const [ativos, setAtivos] = useState<AtivosConta | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [paginaId, setPaginaId] = useState(cliente.metaPaginaId || '');
  const [instagramId, setInstagramId] = useState(cliente.metaInstagramId || '');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const lidos = await anunciosApi.ativos(cliente.id);
      setAtivos(lidos);
      // Mantém a página/Instagram já escolhidos se ainda existirem; senão sugere o único disponível.
      setPaginaId((atual) => (lidos.paginas.some((p) => p.id === atual) ? atual : lidos.paginas.length === 1 ? lidos.paginas[0].id : ''));
      setInstagramId((atual) => (lidos.instagram.some((i) => i.id === atual) ? atual : lidos.instagram.length === 1 ? lidos.instagram[0].id : ''));
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível consultar a Meta.');
    }
    setCarregando(false);
  }, [cliente.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const { cliente: atualizado } = await anunciosApi.validar(cliente.id, { paginaId, instagramId });
      useStore.setState((estado) => ({ dados: { ...estado.dados, clientes: estado.dados.clientes.map((c) => (c.id === atualizado.id ? atualizado : c)) } }));
      mostrar('Conta validada e salva');
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível salvar.');
    }
    setSalvando(false);
  };

  const paginaEscolhida = ativos?.paginas.find((p) => p.id === paginaId);

  return (
    <Modal
      titulo={`Validar conta — ${cliente.nome}`}
      aoFechar={aoFechar}
      rodape={
        <div className="acoes">
          <button type="button" className="btn fantasma" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="btn primario" onClick={salvar} disabled={!ativos || salvando || ativos.conta.status !== 1}>
            <ShieldCheck size={15} /> {salvando ? 'Conferindo…' : 'Confirmar e salvar'}
          </button>
        </div>
      }
    >
      <div className="validar-conta">
        {carregando ? <p className="muted">Consultando a Meta…</p> : null}
        {erro ? (
          <div className="faixa alerta">
            <p>{erro}</p>
            <button type="button" className="btn pequeno" onClick={carregar}>
              <RefreshCw size={13} /> Tentar de novo
            </button>
          </div>
        ) : null}

        {ativos ? (
          <>
            <div className="bloco-ativo">
              <span className="rotulo-ativo"><Building2 size={14} /> Conta de anúncios (confirmada pela Meta)</span>
              <b>{ativos.conta.nome}</b>
              <div className="sub-etapa">
                <code>{ativos.conta.id}</code>
                <span className={`tag ${ativos.conta.status === 1 ? 'green' : 'red'}`}>{ativos.conta.statusTexto}</span>
                <span>{ativos.conta.moeda} · {ativos.conta.fuso}</span>
                {ativos.conta.negocio ? <span>BM: {ativos.conta.negocio}</span> : null}
              </div>
            </div>

            <div className="bloco-ativo">
              <span className="rotulo-ativo"><Flag size={14} /> Página do Facebook</span>
              {ativos.erros.paginas ? <p className="erro-ativo">{ativos.erros.paginas.mensagem}</p> : null}
              {ativos.paginas.length === 0 && !ativos.erros.paginas ? <p className="muted">Nenhuma página disponível para esta conta.</p> : null}
              {ativos.paginas.map((p) => (
                <label key={p.id} className="opcao-ativo">
                  <input
                    type="radio"
                    name="pagina"
                    checked={paginaId === p.id}
                    onChange={() => {
                      setPaginaId(p.id);
                      if (p.instagram) setInstagramId(p.instagram.id);
                    }}
                  />
                  <span>
                    <b>{p.nome}</b> <code>{p.id}</code>
                    {p.instagram ? <small>Instagram ligado: @{p.instagram.usuario}</small> : null}
                  </span>
                </label>
              ))}
            </div>

            <div className="bloco-ativo">
              <span className="rotulo-ativo"><AtSign size={14} /> Perfil do Instagram</span>
              {ativos.erros.instagram && !ativos.instagram.length ? <p className="erro-ativo">{ativos.erros.instagram.mensagem}</p> : null}
              {ativos.instagram.length === 0 && !ativos.erros.instagram ? <p className="muted">Nenhum perfil do Instagram ligado a esta conta.</p> : null}
              {ativos.instagram.map((i) => (
                <label key={i.id} className="opcao-ativo">
                  <input type="radio" name="instagram" checked={instagramId === i.id} onChange={() => setInstagramId(i.id)} />
                  <span>
                    <b>@{i.usuario}</b> <code>{i.id}</code>
                    {i.viaPagina ? <small>via página {i.viaPagina}</small> : null}
                  </span>
                </label>
              ))}
              {instagramId ? (
                <button type="button" className="btn fantasma pequeno" style={{ alignSelf: 'flex-start' }} onClick={() => setInstagramId('')}>
                  Não usar Instagram
                </button>
              ) : null}
            </div>

            {paginaEscolhida?.instagram && instagramId && paginaEscolhida.instagram.id !== instagramId ? (
              <div className="faixa"><p>O Instagram escolhido não é o ligado a esta página. Confira se é isso mesmo.</p></div>
            ) : null}
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Ao salvar, o servidor consulta a Meta de novo e só grava se a conta, a página e o perfil pertencerem mesmo a este cliente.
            </p>
          </>
        ) : null}
      </div>
    </Modal>
  );
};

// Anúncios → Contas: cada cliente com a conta, a página e o Instagram confirmados pela Meta.
export const ContasAnuncios = () => {
  const { dados, ir } = useStore();
  const modo = useStore((estado) => estado.backend?.modo ?? 'local');
  const [validando, setValidando] = useState<Cliente | null>(null);
  const clientes = dados.clientes.filter((c) => c.status !== 'encerrado');

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <Link2 size={26} /> Contas de anúncios
          </h1>
          <p>Cada cliente ligado à sua conta, página e Instagram, conferidos pelos IDs oficiais da Meta. Só contas validadas poderão receber campanhas.</p>
        </div>
      </div>

      {modo !== 'servidor' ? <AvisoSoServidor /> : null}

      {clientes.length === 0 ? (
        <Vazio texto="Nenhum cliente cadastrado." />
      ) : (
        <section className="cartao">
          <div className="lista">
            {clientes.map((c) => {
              const situacao = situacaoConta(c);
              const validada = situacao.status === 'validada';
              return (
                <div key={c.id} className="linha-conta">
                  <div className="quem">
                    <Avatar nome={c.nome} cor={c.cor} tamanho={34} />
                    <div style={{ minWidth: 0 }}>
                      <b>{c.nome}</b>
                      <div className="sub-etapa">
                        {c.metaContaId ? <code>{c.metaContaId}</code> : null}
                        {validada && c.metaValidacao ? <span>{c.metaValidacao.contaNome}</span> : null}
                        {validada && c.metaPaginaNome ? <span><Flag size={12} /> {c.metaPaginaNome}</span> : null}
                        {validada && c.metaInstagramUsuario ? <span><AtSign size={12} /> {c.metaInstagramUsuario}</span> : null}
                      </div>
                    </div>
                  </div>
                  <span className={`tag ${COR_SITUACAO[situacao.status]}`}>
                    {validada ? <CheckCircle2 size={12} /> : null} {situacao.texto}
                  </span>
                  <div className="acoes-cobranca">
                    {situacao.status === 'sem-conta' || situacao.status === 'invalida' ? (
                      <button type="button" className="btn pequeno" onClick={() => ir({ tela: 'cliente', id: c.id })}>
                        Informar conta
                      </button>
                    ) : (
                      <button type="button" className={`btn pequeno${validada ? ' fantasma' : ' primario'}`} disabled={modo !== 'servidor'} onClick={() => setValidando(c)}>
                        <ShieldCheck size={13} /> {validada ? 'Conferir de novo' : 'Validar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {validando ? <ValidarConta cliente={validando} aoFechar={() => setValidando(null)} /> : null}
    </div>
  );
};
