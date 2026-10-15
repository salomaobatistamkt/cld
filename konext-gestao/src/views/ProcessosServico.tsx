import { ArrowDown, ArrowUp, BellRing, Lock, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Campo, Confirmar, Modal, Vazio } from '@/components/ui';
import { DIAS_SEMANA, DIAS_SEMANA_CURTO, descreverRecorrencia } from '@/lib/processoServico';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type EtapaModelo, type ItemRotina, type ProcessoServico } from '@/lib/types';
import { novoId } from '@/lib/util';

const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

const FormEtapa = ({ inicial, fases, aoSalvar, aoFechar }: { inicial: EtapaModelo; fases: string[]; aoSalvar: (e: EtapaModelo) => void; aoFechar: () => void }) => {
  const [e, setE] = useState(inicial);
  return (
    <Modal
      titulo={inicial.titulo ? 'Editar etapa' : 'Nova etapa'}
      aoFechar={aoFechar}
      rodape={
        <div className="acoes">
          <button type="button" className="btn fantasma" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="btn primario" disabled={!e.titulo.trim()} onClick={() => aoSalvar({ ...e, titulo: e.titulo.trim(), fase: e.fase.trim() })}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="grade-form">
        <Campo rotulo="O que precisa ser feito *" largo>
          <input id="etapa-titulo" value={e.titulo} onChange={(ev) => setE({ ...e, titulo: ev.target.value })} placeholder="Ex.: Enviar o contrato" autoFocus />
        </Campo>
        <Campo rotulo="Fase" dica="Agrupa as etapas. Ex.: Contrato, Implementação.">
          <input id="etapa-fase" list="fases-existentes" value={e.fase} onChange={(ev) => setE({ ...e, fase: ev.target.value })} />
          <datalist id="fases-existentes">
            {fases.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Campo>
        <Campo rotulo="Prazo (dias depois do início)" dica="0 = no mesmo dia em que o serviço começa.">
          <input id="etapa-dias" type="number" min={0} max={365} inputMode="numeric" value={e.dias} onChange={(ev) => setE({ ...e, dias: Math.max(0, Number(ev.target.value) || 0) })} />
        </Campo>
        <Campo rotulo="Detalhes" largo>
          <textarea id="etapa-descricao" rows={3} value={e.descricao} onChange={(ev) => setE({ ...e, descricao: ev.target.value })} placeholder="O que conferir, o que pedir ao cliente…" />
        </Campo>
        <label className="largo opcao-evento">
          <input type="checkbox" checked={e.interna} onChange={(ev) => setE({ ...e, interna: ev.target.checked })} />
          <span>
            Interna <code>só a equipe vê; não aparece na apresentação ao cliente</code>
          </span>
        </label>
      </div>
    </Modal>
  );
};

const FormRotina = ({ inicial, aoSalvar, aoFechar }: { inicial: ItemRotina; aoSalvar: (i: ItemRotina) => void; aoFechar: () => void }) => {
  const [i, setI] = useState(inicial);
  const [diasMes, setDiasMes] = useState(inicial.quando === 'mensal' ? inicial.dias.join(', ') : '10');
  const dias =
    i.quando === 'semanal'
      ? i.dias
      : [...new Set(diasMes.split(/[^\d]+/).map(Number).filter((n) => n >= 1 && n <= 31))].sort((a, b) => a - b);
  const alternarDia = (d: number) => setI({ ...i, dias: i.dias.includes(d) ? i.dias.filter((x) => x !== d) : [...i.dias, d] });

  return (
    <Modal
      titulo={inicial.titulo ? 'Editar tarefa da rotina' : 'Nova tarefa da rotina'}
      aoFechar={aoFechar}
      rodape={
        <div className="acoes">
          <button type="button" className="btn fantasma" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primario"
            disabled={!i.titulo.trim() || dias.length === 0}
            onClick={() => aoSalvar({ ...i, titulo: i.titulo.trim(), dias, codigo: i.codigo.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') })}
          >
            Salvar
          </button>
        </div>
      }
    >
      <div className="grade-form">
        <Campo rotulo="Tarefa *" largo>
          <input id="rotina-titulo" value={i.titulo} onChange={(ev) => setI({ ...i, titulo: ev.target.value })} placeholder="Ex.: Enviar relatório de resultados" autoFocus />
        </Campo>
        <Campo rotulo="Repete">
          <select
            id="rotina-quando"
            value={i.quando}
            onChange={(ev) => {
              const quando = ev.target.value as ItemRotina['quando'];
              setI({ ...i, quando, dias: quando === 'semanal' ? [1] : i.dias });
            }}
          >
            <option value="semanal">Toda semana</option>
            <option value="mensal">Todo mês</option>
          </select>
        </Campo>
        <Campo rotulo="Horário" dica="Opcional. É a hora em que o n8n é avisado.">
          <input id="rotina-hora" type="time" value={i.hora} onChange={(ev) => setI({ ...i, hora: ev.target.value })} />
        </Campo>
        {i.quando === 'semanal' ? (
          <div className="largo campo">
            <span>Dias da semana</span>
            <div className="dias-semana">
              {ORDEM_SEMANA.map((d) => (
                <button key={d} type="button" className={i.dias.includes(d) ? 'ativo' : ''} onClick={() => alternarDia(d)} aria-pressed={i.dias.includes(d)} title={DIAS_SEMANA[d]}>
                  {DIAS_SEMANA_CURTO[d]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Campo rotulo="Dias do mês" dica="Separe por vírgula. Dia 30 ou 31 cai no último dia em meses mais curtos." largo>
            <input id="rotina-dias-mes" inputMode="numeric" value={diasMes} onChange={(ev) => setDiasMes(ev.target.value)} placeholder="10, 20, 30" />
          </Campo>
        )}
        <Campo rotulo="Detalhes" largo>
          <textarea id="rotina-descricao" rows={2} value={i.descricao} onChange={(ev) => setI({ ...i, descricao: ev.target.value })} />
        </Campo>
        <label className="largo opcao-evento">
          <input type="checkbox" checked={i.avisar} onChange={(ev) => setI({ ...i, avisar: ev.target.checked })} />
          <span>
            Avisar o n8n no horário <code>dispara o webhook rotina.horario (ex.: mandar WhatsApp ao cliente)</code>
          </span>
        </label>
        {i.avisar ? (
          <Campo rotulo="Código para a automação" dica="O n8n usa para saber o que fazer. Ex.: pausar_campanhas, relatorio." largo>
            <input id="rotina-codigo" value={i.codigo} onChange={(ev) => setI({ ...i, codigo: ev.target.value })} placeholder="pausar_campanhas" />
          </Campo>
        ) : null}
        <label className="largo opcao-evento">
          <input type="checkbox" checked={i.interna} onChange={(ev) => setI({ ...i, interna: ev.target.checked })} />
          <span>
            Interna <code>só a equipe vê; não aparece na apresentação ao cliente</code>
          </span>
        </label>
      </div>
    </Modal>
  );
};

// Configurações → Processo de cada serviço: etapas do início e rotina de cada tipo de serviço.
export const SecaoProcessosServico = () => {
  const { dados, salvarConfig } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const config = dados.config;
  const tipos = config.tiposServico;
  const [tipo, setTipo] = useState(() => tipos.find((t) => config.processosServico?.[t]) ?? tipos[0] ?? '');
  const [etapa, setEtapa] = useState<EtapaModelo | null>(null);
  const [itemRotina, setItemRotina] = useState<ItemRotina | null>(null);
  const [excluir, setExcluir] = useState<{ tipo: 'etapa' | 'rotina'; id: string; titulo: string } | null>(null);

  const processo = config.processosServico?.[tipo];
  const gravar = (novo: ProcessoServico, aviso: string) => {
    salvarConfig({ ...config, processosServico: { ...config.processosServico, [tipo]: novo } });
    mostrar(aviso);
  };
  const fases = [...new Set(processo?.etapas.map((e) => e.fase).filter(Boolean) ?? [])];
  const usos = dados.servicos.filter((s) => s.tipo === tipo).length;

  const salvarEtapa = (e: EtapaModelo) => {
    if (!processo) return;
    const existe = processo.etapas.some((x) => x.id === e.id);
    gravar({ ...processo, etapas: existe ? processo.etapas.map((x) => (x.id === e.id ? e : x)) : [...processo.etapas, e] }, existe ? 'Etapa atualizada' : 'Etapa adicionada');
    setEtapa(null);
  };
  const salvarRotina = (i: ItemRotina) => {
    if (!processo) return;
    const existe = processo.rotina.some((x) => x.id === i.id);
    gravar({ ...processo, rotina: existe ? processo.rotina.map((x) => (x.id === i.id ? i : x)) : [...processo.rotina, i] }, existe ? 'Tarefa atualizada' : 'Tarefa adicionada');
    setItemRotina(null);
  };
  const mover = (indice: number, direcao: -1 | 1) => {
    if (!processo) return;
    const etapas = [...processo.etapas];
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= etapas.length) return;
    [etapas[indice], etapas[alvo]] = [etapas[alvo], etapas[indice]];
    gravar({ ...processo, etapas }, 'Ordem atualizada');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="passos">
        <div><b>1</b><span>Escolha o serviço e monte as <b>etapas do início</b> (contrato, acessos, implementação…). Ao cadastrar esse serviço num cliente, elas viram entregas com prazo.</span></div>
        <div><b>2</b><span>Monte a <b>rotina</b>: o que se repete toda semana ou todo mês. Ela aparece na tela <b>Rotina</b>, como checklist do dia.</span></div>
        <div><b>3</b><span>Marque como <b>interna</b> o que o cliente não precisa ver. No modo apresentação, só aparece o resto.</span></div>
      </div>

      <div className="seletor-tipos" role="tablist" aria-label="Tipo de serviço">
        {tipos.map((t) => {
          const p = config.processosServico?.[t];
          return (
            <button key={t} type="button" role="tab" aria-selected={t === tipo} className={t === tipo ? 'ativo' : ''} onClick={() => setTipo(t)}>
              {t}
              <small>{p ? `${p.etapas.length} etapas · ${p.rotina.length} na rotina` : 'sem processo'}</small>
            </button>
          );
        })}
      </div>

      {!tipo ? (
        <Vazio texto="Cadastre um tipo de serviço em “Serviços que você vende” primeiro." />
      ) : !processo ? (
        <Vazio
          texto={`“${tipo}” ainda não tem processo padrão.`}
          acao={
            <button type="button" className="btn primario" onClick={() => gravar({ etapas: [], rotina: [] }, 'Processo criado. Agora adicione as etapas.')}>
              <Plus size={15} /> Criar processo para {tipo}
            </button>
          }
        />
      ) : (
        <>
          <section className="bloco-processo">
            <div className="cartao-titulo">
              <div>
                <h3>Etapas do início</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Feitas uma vez, quando o cliente fecha. {usos ? `${usos} serviço(s) usam este tipo.` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn pequeno"
                onClick={() => setEtapa({ id: novoId(), fase: fases[fases.length - 1] ?? '', titulo: '', descricao: '', dias: 0, interna: false })}
              >
                <Plus size={14} /> Etapa
              </button>
            </div>
            {processo.etapas.length === 0 ? (
              <p className="muted">Nenhuma etapa ainda.</p>
            ) : (
              <ol className="lista-etapas">
                {processo.etapas.map((e, indice) => (
                  <li key={e.id}>
                    {e.fase && e.fase !== processo.etapas[indice - 1]?.fase ? <div className="fase-etapa">{e.fase}</div> : null}
                    <div className="linha-etapa">
                      <span className="numero-etapa">{indice + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <b>{e.titulo}</b>
                        <div className="sub-etapa">
                          {e.dias === 0 ? 'No dia do início' : `Prazo: ${e.dias} dia${e.dias > 1 ? 's' : ''} depois do início`}
                          {e.interna ? (
                            <span className="tag slate sem-ponto">
                              <Lock size={11} /> Interna
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="botoes-etapa">
                        <button type="button" className="btn fantasma icone" onClick={() => mover(indice, -1)} disabled={indice === 0} aria-label="Subir">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn fantasma icone" onClick={() => mover(indice, 1)} disabled={indice === processo.etapas.length - 1} aria-label="Descer">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn fantasma icone" onClick={() => setEtapa(e)} aria-label="Editar">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="btn fantasma icone" onClick={() => setExcluir({ tipo: 'etapa', id: e.id, titulo: e.titulo })} aria-label="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="bloco-processo">
            <div className="cartao-titulo">
              <div>
                <h3>Rotina</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Repete enquanto o serviço estiver ativo.
                </p>
              </div>
              <button
                type="button"
                className="btn pequeno"
                onClick={() => setItemRotina({ id: novoId(), titulo: '', descricao: '', quando: 'semanal', dias: [1], hora: '09:00', interna: false, avisar: false, codigo: '' })}
              >
                <Plus size={14} /> Tarefa
              </button>
            </div>
            {processo.rotina.length === 0 ? (
              <p className="muted">Nada na rotina ainda.</p>
            ) : (
              <div className="lista-etapas">
                {processo.rotina.map((i) => (
                  <div key={i.id} className="linha-etapa">
                    <span className="numero-etapa">
                      <Repeat size={13} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b>{i.titulo}</b>
                      <div className="sub-etapa">
                        {descreverRecorrencia(i)}
                        {i.avisar ? (
                          <span className="tag sky sem-ponto" title={`código: ${i.codigo || '—'}`}>
                            <BellRing size={11} /> Avisa o n8n
                          </span>
                        ) : null}
                        {i.interna ? (
                          <span className="tag slate sem-ponto">
                            <Lock size={11} /> Interna
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="botoes-etapa">
                      <button type="button" className="btn fantasma icone" onClick={() => setItemRotina(i)} aria-label="Editar">
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="btn fantasma icone" onClick={() => setExcluir({ tipo: 'rotina', id: i.id, titulo: i.titulo })} aria-label="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {etapa ? <FormEtapa inicial={etapa} fases={fases} aoSalvar={salvarEtapa} aoFechar={() => setEtapa(null)} /> : null}
      {itemRotina ? <FormRotina inicial={itemRotina} aoSalvar={salvarRotina} aoFechar={() => setItemRotina(null)} /> : null}
      {excluir && processo ? (
        <Confirmar
          texto={`Tirar “${excluir.titulo}” do processo de ${tipo}? O que já foi criado nos clientes continua lá.`}
          aoCancelar={() => setExcluir(null)}
          aoConfirmar={() => {
            gravar(
              excluir.tipo === 'etapa'
                ? { ...processo, etapas: processo.etapas.filter((e) => e.id !== excluir.id) }
                : { ...processo, rotina: processo.rotina.filter((i) => i.id !== excluir.id) },
              'Removido do processo',
            );
            setExcluir(null);
          }}
        />
      ) : null}
    </div>
  );
};
