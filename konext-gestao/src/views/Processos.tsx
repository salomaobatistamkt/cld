import { ArrowRight, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Workflow } from 'lucide-react';
import { useState } from 'react';

import { Campo, Confirmar, Modal, Vazio } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type EtapaProcesso, type Processo } from '@/lib/types';
import { novoId } from '@/lib/util';

import { FaixaExemplos } from './FaixaExemplos';

const FormEtapa = ({ inicial, aoSalvar, aoExcluir, aoFechar }: { inicial: EtapaProcesso; aoSalvar: (e: EtapaProcesso) => void; aoExcluir?: () => void; aoFechar: () => void }) => {
  const [e, setE] = useState(inicial);
  return (
    <Modal
      titulo={inicial.titulo ? 'Editar etapa' : 'Nova etapa'}
      aoFechar={aoFechar}
      pequeno
      rodape={
        <>
          <div>
            {aoExcluir ? (
              <button type="button" className="btn fantasma perigo" onClick={aoExcluir}>
                <Trash2 size={15} /> Excluir
              </button>
            ) : null}
          </div>
          <button type="button" className="btn primario" disabled={!e.titulo.trim()} onClick={() => aoSalvar(e)}>
            Salvar
          </button>
        </>
      }
    >
      <div className="grade-form">
        <Campo rotulo="Etapa *" largo>
          <input id="et-titulo" value={e.titulo} onChange={(ev) => setE({ ...e, titulo: ev.target.value })} autoFocus />
        </Campo>
        <Campo rotulo="Responsável">
          <input id="et-resp" value={e.responsavel} onChange={(ev) => setE({ ...e, responsavel: ev.target.value })} />
        </Campo>
        <Campo rotulo="Quando / prazo">
          <input id="et-prazo" value={e.prazo} onChange={(ev) => setE({ ...e, prazo: ev.target.value })} placeholder="Ex.: Dia 1, Segunda" />
        </Campo>
        <Campo rotulo="Como fazer" largo>
          <textarea id="et-desc" value={e.descricao} onChange={(ev) => setE({ ...e, descricao: ev.target.value })} />
        </Campo>
      </div>
    </Modal>
  );
};

export const Processos = ({ idInicial }: { idInicial?: string }) => {
  const { dados, salvar, remover } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const [selecionado, setSelecionado] = useState(idInicial ?? dados.processos[0]?.id ?? '');
  const [etapa, setEtapa] = useState<{ etapa: EtapaProcesso; indice: number } | null>(null);
  const [editandoInfo, setEditandoInfo] = useState<Processo | null>(null);
  const [excluir, setExcluir] = useState(false);
  const processo = dados.processos.find((p) => p.id === selecionado) ?? dados.processos[0];

  const atualizar = (proximo: Processo) => salvar('processos', proximo);
  const mover = (indice: number, delta: number) => {
    if (!processo) return;
    const etapas = [...processo.etapas];
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= etapas.length) return;
    [etapas[indice], etapas[alvo]] = [etapas[alvo], etapas[indice]];
    atualizar({ ...processo, etapas });
  };

  const novoProcesso = () => {
    const p: Processo = { id: novoId(), nome: 'Novo processo', area: dados.config.areasProcesso[0] ?? 'Geral', objetivo: '', etapas: [] };
    salvar('processos', p);
    setSelecionado(p.id);
    setEditandoInfo(p);
  };

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <Workflow size={26} /> Processos
          </h1>
          <p>Como a empresa trabalha, etapa por etapa. Todo mundo segue o mesmo caminho.</p>
        </div>
        <button type="button" className="btn primario" onClick={novoProcesso}>
          <Plus size={16} /> Novo processo
        </button>
      </div>

      {dados.processos.length === 0 ? (
        <Vazio texto="Nenhum processo. Comece documentando o onboarding de clientes." />
      ) : (
        <div className="grade-processos">
          <section className="cartao" style={{ padding: 10, alignSelf: 'start' }}>
            {dados.config.areasProcesso
              .filter((area) => dados.processos.some((p) => p.area === area))
              .concat(dados.processos.some((p) => !dados.config.areasProcesso.includes(p.area)) ? ['Outros'] : [])
              .map((area) => (
                <div key={area}>
                  <div className="nav-grupo" style={{ paddingTop: 8 }}>{area}</div>
                  {dados.processos
                    .filter((p) => (area === 'Outros' ? !dados.config.areasProcesso.includes(p.area) : p.area === area))
                    .map((p) => (
                      <button key={p.id} type="button" className={`nav-item${processo?.id === p.id ? ' ativo' : ''}`} onClick={() => setSelecionado(p.id)}>
                        <Workflow size={16} />
                        <span style={{ whiteSpace: 'normal' }}>{p.nome}</span>
                      </button>
                    ))}
                </div>
              ))}
          </section>

          {processo ? (
            <section className="cartao" style={{ minWidth: 0 }}>
              <div className="cartao-titulo" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20 }}>{processo.nome}</h2>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    <span className="chip">{processo.area}</span> {processo.objetivo}
                  </p>
                </div>
                <div className="acoes">
                  <button type="button" className="btn pequeno" onClick={() => setEditandoInfo(processo)}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button type="button" className="btn fantasma perigo pequeno" onClick={() => setExcluir(true)} aria-label="Excluir processo">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="fluxo">
                {processo.etapas.map((e, indice) => (
                  <div key={e.id} className="passo-fluxo">
                    <div className="etapa">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="numero">{indice + 1}</span>
                        <span style={{ display: 'flex', gap: 2 }}>
                          <button type="button" className="btn fantasma icone" onClick={() => mover(indice, -1)} aria-label="Mover para a esquerda" disabled={indice === 0}>
                            <ChevronLeft size={14} />
                          </button>
                          <button type="button" className="btn fantasma icone" onClick={() => mover(indice, 1)} aria-label="Mover para a direita" disabled={indice === processo.etapas.length - 1}>
                            <ChevronRight size={14} />
                          </button>
                          <button type="button" className="btn fantasma icone" onClick={() => setEtapa({ etapa: e, indice })} aria-label="Editar etapa">
                            <Pencil size={14} />
                          </button>
                        </span>
                      </div>
                      <b>{e.titulo}</b>
                      {e.descricao ? <span className="muted" style={{ fontSize: 13 }}>{e.descricao}</span> : null}
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                        {e.responsavel ? <span className="chip">{e.responsavel}</span> : null}
                        {e.prazo ? <span className="chip">{e.prazo}</span> : null}
                      </span>
                    </div>
                    {indice < processo.etapas.length - 1 ? (
                      <div className="seta">
                        <ArrowRight size={20} />
                      </div>
                    ) : null}
                  </div>
                ))}
                <div className="seta" />
                <button
                  type="button"
                  className="etapa"
                  style={{ borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', cursor: 'pointer', minHeight: 150 }}
                  onClick={() => setEtapa({ etapa: { id: novoId(), titulo: '', descricao: '', responsavel: '', prazo: '' }, indice: processo.etapas.length })}
                >
                  <Plus size={20} /> Adicionar etapa
                </button>
              </div>
            </section>
          ) : null}
        </div>
      )}

      {etapa && processo ? (
        <FormEtapa
          inicial={etapa.etapa}
          aoFechar={() => setEtapa(null)}
          aoExcluir={etapa.indice < processo.etapas.length ? () => {
            atualizar({ ...processo, etapas: processo.etapas.filter((e) => e.id !== etapa.etapa.id) });
            setEtapa(null);
          } : undefined}
          aoSalvar={(final) => {
            const etapas = etapa.indice < processo.etapas.length ? processo.etapas.map((e) => (e.id === final.id ? final : e)) : [...processo.etapas, final];
            atualizar({ ...processo, etapas });
            setEtapa(null);
          }}
        />
      ) : null}

      {editandoInfo ? (
        <Modal
          titulo="Processo"
          aoFechar={() => setEditandoInfo(null)}
          pequeno
          rodape={
            <>
              <span />
              <button type="button" className="btn primario" disabled={!editandoInfo.nome.trim()} onClick={() => { atualizar(editandoInfo); setEditandoInfo(null); }}>
                Salvar
              </button>
            </>
          }
        >
          <div className="grade-form">
            <Campo rotulo="Nome *" largo>
              <input id="pr-nome" value={editandoInfo.nome} onChange={(e) => setEditandoInfo({ ...editandoInfo, nome: e.target.value })} autoFocus />
            </Campo>
            <Campo rotulo="Área" largo>
              <select id="pr-area" value={editandoInfo.area} onChange={(e) => setEditandoInfo({ ...editandoInfo, area: e.target.value })}>
                {dados.config.areasProcesso.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Objetivo" largo>
              <textarea id="pr-obj" value={editandoInfo.objetivo} onChange={(e) => setEditandoInfo({ ...editandoInfo, objetivo: e.target.value })} />
            </Campo>
          </div>
        </Modal>
      ) : null}

      {excluir && processo ? (
        <Confirmar
          texto={`Excluir o processo "${processo.nome}"?`}
          aoCancelar={() => setExcluir(false)}
          aoConfirmar={() => {
            remover('processos', processo.id);
            setExcluir(false);
            setSelecionado(dados.processos.find((p) => p.id !== processo.id)?.id ?? '');
            mostrar('Processo excluído');
          }}
        />
      ) : null}
    </div>
  );
};
