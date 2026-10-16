// Configurações → Referências de performance e Modelos de apresentação.
// Os valores são referências operacionais da agência, editáveis sem mexer no código.
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { BIBLIOTECA, MODELOS_RELATORIO_PADRAO, type ModeloRelatorio, PARAMETROS_PADRAO, type ParametrosPerformance, type RegraPerformance, ROTULO_OBJETIVO, SECOES, type Secao } from '@/lib/metricas';
import { descreverRegra, parametrosCom } from '@/lib/performance';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

const NumeroCampo = ({ rotulo, valor, aoMudar, sufixo, passo = 0.1 }: { rotulo: string; valor: number; aoMudar: (v: number) => void; sufixo?: string; passo?: number }) => (
  <label className="campo campo-numero">
    <span>{rotulo}</span>
    <span className="com-sufixo">
      <input
        className="input"
        type="number"
        step={passo}
        min={0}
        defaultValue={valor}
        key={valor}
        onBlur={(e) => {
          const v = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(v) && v >= 0 && v !== valor) aoMudar(v);
        }}
      />
      {sufixo ? <small>{sufixo}</small> : null}
    </span>
  </label>
);

export const SecaoPerformance = () => {
  const { dados, salvarConfig } = useStore();
  const mostrar = useToast((e) => e.mostrar);
  const p = parametrosCom(dados.config.performance);
  const mudar = (parcial: Partial<ParametrosPerformance>) => {
    salvarConfig({ ...dados.config, performance: { ...p, ...parcial } });
    mostrar('Referência salva');
  };
  const [nova, setNova] = useState<RegraPerformance>({ id: '' });
  const clientes = dados.clientes.filter((c) => c.status !== 'encerrado' && c.metaContaId);
  const adicionarRegra = () => {
    if (!nova.clienteId && !nova.procedimento?.trim() && !nova.objetivo && !nova.tipoResultado?.trim()) {
      mostrar('Escolha pelo menos um filtro (cliente, procedimento, objetivo ou tipo de resultado).', true);
      return;
    }
    if (nova.custoOtimo === undefined && nova.custoBom === undefined && nova.ctrBom === undefined && nova.ctrExcelente === undefined) {
      mostrar('Informe pelo menos um limite.', true);
      return;
    }
    mudar({ regras: [...p.regras, { ...nova, procedimento: nova.procedimento?.trim() || undefined, tipoResultado: nova.tipoResultado?.trim() || undefined, id: crypto.randomUUID() }] });
    setNova({ id: '' });
  };
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  return (
    <div className="config-performance">
      <p className="muted">São referências iniciais da agência, não regras universais de mercado. A classificação só aparece quando há dados suficientes e sempre mostra a justificativa.</p>

      <h4 className="sub-titulo">CTR (do link ou de saída, conforme o objetivo)</h4>
      <div className="grade-numeros">
        <NumeroCampo rotulo="Excelente a partir de" valor={p.ctrExcelente} sufixo="%" aoMudar={(v) => mudar({ ctrExcelente: v })} />
        <NumeroCampo rotulo="Muito alto (conferir qualidade) acima de" valor={p.ctrMuitoAlto} sufixo="%" aoMudar={(v) => mudar({ ctrMuitoAlto: v })} />
        <NumeroCampo rotulo="Bom a partir de" valor={p.ctrBom} sufixo="%" aoMudar={(v) => mudar({ ctrBom: v })} />
        <NumeroCampo rotulo="Atenção a partir de (abaixo = alerta)" valor={p.ctrAtencao} sufixo="%" aoMudar={(v) => mudar({ ctrAtencao: v })} />
      </div>

      <h4 className="sub-titulo">Custo por resultado</h4>
      <div className="grade-numeros">
        <NumeroCampo rotulo="Ótimo até" valor={p.custoOtimo} sufixo="R$" aoMudar={(v) => mudar({ custoOtimo: v })} />
        <NumeroCampo rotulo="Bom até (acima = atenção)" valor={p.custoBom} sufixo="R$" aoMudar={(v) => mudar({ custoBom: v })} />
      </div>

      <h4 className="sub-titulo">Volume e frequência</h4>
      <div className="grade-numeros">
        <NumeroCampo rotulo="Impressões: volume positivo acima de" valor={p.impressoesMin} passo={100} aoMudar={(v) => mudar({ impressoesMin: v })} />
        <NumeroCampo rotulo="Alcance: distribuição positiva acima de" valor={p.alcanceMin} passo={100} aoMudar={(v) => mudar({ alcanceMin: v })} />
        <NumeroCampo rotulo="Mínimo de impressões para classificar CTR e custo" valor={p.impressoesParaClassificar} passo={100} aoMudar={(v) => mudar({ impressoesParaClassificar: v })} />
        <NumeroCampo rotulo="Frequência: abaixo disso, verificar dados" valor={p.freqInicial} aoMudar={(v) => mudar({ freqInicial: v })} />
        <NumeroCampo rotulo="Frequência: boa exposição a partir de" valor={p.freqBoa} aoMudar={(v) => mudar({ freqBoa: v })} />
        <NumeroCampo rotulo="Frequência: repetida acima de" valor={p.freqAlta} aoMudar={(v) => mudar({ freqAlta: v })} />
      </div>

      <h4 className="sub-titulo">Limites específicos</h4>
      <p className="muted">Ajuste custo e CTR por cliente, procedimento (o que vem antes de “|” no nome da campanha), objetivo ou tipo de resultado. A regra mais específica vence.</p>
      {p.regras.length ? (
        <div className="lista-regras">
          {p.regras.map((r) => (
            <div key={r.id} className="linha-regra">
              <span>
                <b>{descreverRegra(r)}</b>
                {r.clienteId ? ` · ${dados.clientes.find((c) => c.id === r.clienteId)?.nome || 'cliente removido'}` : ''}
              </span>
              <span className="muted">
                {[r.custoOtimo !== undefined && `ótimo até R$ ${r.custoOtimo}`, r.custoBom !== undefined && `bom até R$ ${r.custoBom}`, r.ctrBom !== undefined && `CTR bom ${r.ctrBom}%`, r.ctrExcelente !== undefined && `CTR excelente ${r.ctrExcelente}%`].filter(Boolean).join(' · ')}
              </span>
              <button type="button" className="btn pequeno" onClick={() => mudar({ regras: p.regras.filter((x) => x.id !== r.id) })} aria-label="Remover regra">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="nova-regra">
        <select className="input" value={nova.clienteId || ''} onChange={(e) => setNova({ ...nova, clienteId: e.target.value || undefined })} aria-label="Cliente">
          <option value="">Qualquer cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Procedimento (ex.: Botox)" value={nova.procedimento || ''} onChange={(e) => setNova({ ...nova, procedimento: e.target.value })} />
        <select className="input" value={nova.objetivo || ''} onChange={(e) => setNova({ ...nova, objetivo: e.target.value || undefined })} aria-label="Objetivo">
          <option value="">Qualquer objetivo</option>
          {['OUTCOME_ENGAGEMENT', 'OUTCOME_TRAFFIC', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_AWARENESS'].map((o) => (
            <option key={o} value={o}>
              {ROTULO_OBJETIVO[o]}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Tipo de resultado (ex.: Conversas iniciadas)" value={nova.tipoResultado || ''} onChange={(e) => setNova({ ...nova, tipoResultado: e.target.value })} />
        <input className="input" placeholder="Custo ótimo até (R$)" inputMode="decimal" onChange={(e) => setNova({ ...nova, custoOtimo: num(e.target.value) })} />
        <input className="input" placeholder="Custo bom até (R$)" inputMode="decimal" onChange={(e) => setNova({ ...nova, custoBom: num(e.target.value) })} />
        <input className="input" placeholder="CTR bom a partir de (%)" inputMode="decimal" onChange={(e) => setNova({ ...nova, ctrBom: num(e.target.value) })} />
        <input className="input" placeholder="CTR excelente a partir de (%)" inputMode="decimal" onChange={(e) => setNova({ ...nova, ctrExcelente: num(e.target.value) })} />
        <button type="button" className="btn primario" onClick={adicionarRegra}>
          <Plus size={15} /> Adicionar limite
        </button>
      </div>

      <div className="acoes">
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (window.confirm('Voltar todas as referências para o padrão? Os limites específicos também são apagados.')) mudar({ ...PARAMETROS_PADRAO });
          }}
        >
          <RotateCcw size={15} /> Voltar ao padrão
        </button>
      </div>
    </div>
  );
};

export const SecaoModelosRelatorio = () => {
  const { dados, salvarConfig } = useStore();
  const mostrar = useToast((e) => e.mostrar);
  const modelos: ModeloRelatorio[] = dados.config.modelosRelatorio?.length ? dados.config.modelosRelatorio : MODELOS_RELATORIO_PADRAO;
  const gravar = (lista: ModeloRelatorio[], aviso = 'Salvo') => {
    salvarConfig({ ...dados.config, modelosRelatorio: lista });
    mostrar(aviso);
  };
  const mudarModelo = (id: string, parcial: Partial<ModeloRelatorio>) => gravar(modelos.map((m) => (m.id === id ? { ...m, ...parcial } : m)));
  const alternar = <T extends string>(lista: T[], item: T) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

  return (
    <div className="config-modelos">
      <p className="muted">Cada modelo define as seções e as métricas de destaque. Em Desempenho → Relatório do cliente você aplica um modelo e ajusta para cada cliente.</p>
      {modelos.map((m) => (
        <details key={m.id} className="modelo-relatorio">
          <summary>
            <b>{m.nome}</b>
            <span className="muted">
              {m.secoes.length} seções · {m.metricas.length} métricas
            </span>
          </summary>
          <label className="campo">
            <span>Nome</span>
            <input className="input" defaultValue={m.nome} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== m.nome && mudarModelo(m.id, { nome: e.target.value.trim() })} />
          </label>
          <small className="muted">Seções</small>
          <div className="grade-escolhas">
            {SECOES.map((s) => (
              <label key={s.id} className="opcao-escolha">
                <input type="checkbox" checked={m.secoes.includes(s.id)} onChange={() => mudarModelo(m.id, { secoes: SECOES.map((x) => x.id).filter((x) => alternar<Secao>(m.secoes, s.id).includes(x)) })} /> {s.rotulo}
              </label>
            ))}
          </div>
          <small className="muted">Métricas em destaque</small>
          <div className="grade-escolhas">
            {BIBLIOTECA.map((b) => (
              <label key={b.id} className="opcao-escolha" title={b.descricao}>
                <input type="checkbox" checked={m.metricas.includes(b.id)} onChange={() => mudarModelo(m.id, { metricas: alternar(m.metricas, b.id) })} /> {b.rotulo}
              </label>
            ))}
          </div>
          <button type="button" className="btn perigo pequeno" onClick={() => window.confirm(`Excluir o modelo “${m.nome}”?`) && gravar(modelos.filter((x) => x.id !== m.id), 'Modelo excluído')}>
            <Trash2 size={14} /> Excluir modelo
          </button>
        </details>
      ))}
      <div className="acoes">
        <button type="button" className="btn primario" onClick={() => gravar([...modelos, { id: crypto.randomUUID(), nome: 'Novo modelo', secoes: ['investimento', 'evolucao', 'comparativo'], metricas: ['gasto', 'resultados', 'custoPorResultado'] }], 'Modelo criado')}>
          <Plus size={15} /> Novo modelo
        </button>
        <button type="button" className="btn" onClick={() => window.confirm('Restaurar os 5 modelos padrão? Os modelos atuais serão substituídos.') && gravar(MODELOS_RELATORIO_PADRAO, 'Modelos restaurados')}>
          <RotateCcw size={15} /> Restaurar modelos padrão
        </button>
      </div>
    </div>
  );
};
