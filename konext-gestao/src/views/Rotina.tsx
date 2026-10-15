import { BellRing, CalendarCheck, Check, ChevronLeft, ChevronRight, Lock, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, Vazio } from '@/components/ui';
import { DIAS_SEMANA, type TarefaRotina, tarefasDaRotina } from '@/lib/processoServico';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { type RotinaFeita } from '@/lib/types';
import { formatarData, hojeISO, somarDias } from '@/lib/util';

import { FaixaExemplos } from './FaixaExemplos';

// Segunda-feira da semana da data.
const segundaDaSemana = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return somarDias(iso, dia === 0 ? -6 : 1 - dia);
};

const horaDe = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const Rotina = () => {
  const { dados, salvar, remover, ir } = useStore();
  const mostrar = useToast((estado) => estado.mostrar);
  const hoje = hojeISO();
  const [semana, setSemana] = useState(() => segundaDaSemana(hoje));
  const [cliente, setCliente] = useState('todos');
  const fim = somarDias(semana, 6);

  const feitas = useMemo(() => new Map(dados.rotina.map((r) => [r.id, r])), [dados.rotina]);
  const tarefas = useMemo(
    () =>
      tarefasDaRotina(
        dados.servicos.filter((s) => cliente === 'todos' || s.clienteId === cliente),
        dados.config,
        semana,
        fim,
      ),
    [dados.servicos, dados.config, semana, fim, cliente],
  );
  const temRotina = Object.values(dados.config.processosServico ?? {}).some((p) => p.rotina.length);
  const clientesComRotina = dados.clientes.filter((c) =>
    dados.servicos.some((s) => s.clienteId === c.id && s.status === 'ativo' && dados.config.processosServico?.[s.tipo]?.rotina.length),
  );

  const deHoje = tarefas.filter((t) => t.data === hoje);
  const atrasadas = tarefas.filter((t) => t.data < hoje && !feitas.has(t.id));

  const alternar = (t: TarefaRotina) => {
    const feita = feitas.get(t.id);
    if (feita) {
      remover('rotina', t.id);
      mostrar('Desmarcada');
      return;
    }
    const registro: RotinaFeita = {
      id: t.id,
      servicoId: t.servico.id,
      clienteId: t.servico.clienteId,
      itemId: t.item.id,
      data: t.data,
      feitoEm: new Date().toISOString(),
      origem: 'manual',
    };
    salvar('rotina', registro);
    mostrar('Feito ✓');
  };

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i));

  return (
    <div className="pagina">
      <FaixaExemplos />
      <div className="cabecalho">
        <div>
          <h1>
            <CalendarCheck size={26} /> Rotina
          </h1>
          <p>O que se repete toda semana e todo mês, de todos os clientes. Marque quando fizer.</p>
        </div>
        <button type="button" className="btn fantasma" onClick={() => ir({ tela: 'config', aba: 'processo-servico' })}>
          <Settings size={15} /> Editar rotinas
        </button>
      </div>

      {!temRotina ? (
        <Vazio
          icone={<CalendarCheck size={26} />}
          texto="Nenhum serviço tem rotina ainda. Monte a rotina de cada serviço em Configurações → Processo de cada serviço."
          acao={
            <button type="button" className="btn primario" onClick={() => ir({ tela: 'config', aba: 'processo-servico' })}>
              Montar rotina
            </button>
          }
        />
      ) : (
        <>
          <div className="acoes">
            <div className="segmentado">
              <button type="button" onClick={() => setSemana(somarDias(semana, -7))} aria-label="Semana anterior">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="ativo" onClick={() => setSemana(segundaDaSemana(hoje))} title="Voltar para esta semana">
                {formatarData(semana)} – {formatarData(fim)}
              </button>
              <button type="button" onClick={() => setSemana(somarDias(semana, 7))} aria-label="Próxima semana">
                <ChevronRight size={16} />
              </button>
            </div>
            <select id="rotina-cliente" className="input" style={{ width: 'auto' }} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
              <option value="todos">Todos os clientes</option>
              {clientesComRotina.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {hoje >= semana && hoje <= fim ? (
            <div className="resumo-rotina">
              <span>
                <b>Hoje:</b> {deHoje.filter((t) => feitas.has(t.id)).length} de {deHoje.length} feitas
              </span>
              {atrasadas.length ? <span className="tag red">{atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''} nesta semana</span> : null}
            </div>
          ) : null}

          {tarefas.length === 0 ? <p className="muted">Nenhuma tarefa da rotina nesta semana{cliente !== 'todos' ? ' para este cliente' : ''}.</p> : null}
          <div className="dias-rotina">
            {dias.filter((dia) => dia === hoje || tarefas.some((t) => t.data === dia)).map((dia) => {
              const doDia = tarefas.filter((t) => t.data === dia);
              const [a, m, d] = dia.split('-').map(Number);
              const nomeDia = DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
              return (
                <section key={dia} className={`dia-rotina${dia === hoje ? ' hoje' : ''}${dia < hoje ? ' passado' : ''}`}>
                  <h3>
                    {nomeDia}, {formatarData(dia)}
                    {dia === hoje ? <span className="tag green">Hoje</span> : null}
                    <small>{doDia.length ? `${doDia.filter((t) => feitas.has(t.id)).length}/${doDia.length}` : ''}</small>
                  </h3>
                  {doDia.length === 0 ? (
                    <p className="muted vazio-dia">Nada na rotina.</p>
                  ) : (
                    doDia.map((t) => {
                      const feita = feitas.get(t.id);
                      const c = dados.clientes.find((x) => x.id === t.servico.clienteId);
                      const atrasada = !feita && t.data < hoje;
                      return (
                        <div key={t.id} className={`tarefa-rotina${feita ? ' feita' : ''}${atrasada ? ' atrasada' : ''}`}>
                          <button type="button" className="marcar" onClick={() => alternar(t)} aria-pressed={Boolean(feita)} aria-label={feita ? 'Desmarcar' : 'Marcar como feita'}>
                            {feita ? <Check size={16} /> : null}
                          </button>
                          <span className="hora">{t.hora || '—'}</span>
                          <div className="corpo">
                            <b>{t.item.titulo}</b>
                            <div className="sub">
                              {c ? (
                                <span className="cliente">
                                  <Avatar nome={c.nome} cor={c.cor} tamanho={18} />
                                  {c.nome}
                                </span>
                              ) : null}
                              {t.item.avisar ? (
                                <span className="tag sky sem-ponto" title={`Avisa o n8n · código ${t.item.codigo || '—'}`}>
                                  <BellRing size={11} /> n8n
                                </span>
                              ) : null}
                              {t.item.interna ? (
                                <span className="tag slate sem-ponto">
                                  <Lock size={11} /> Interna
                                </span>
                              ) : null}
                              {feita ? (
                                <span className="feito-por">
                                  feito {feita.origem === 'automacao' ? 'pela automação' : ''} às {horaDe(feita.feitoEm)}
                                </span>
                              ) : atrasada ? (
                                <span className="tag red sem-ponto">Atrasada</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
