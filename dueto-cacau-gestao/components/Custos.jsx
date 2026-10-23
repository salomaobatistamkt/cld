import React from 'react';
import { Clock3, Flame, Gauge, Plus, Receipt, Trash2, Users, Wallet, Percent } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCalculo } from '@/lib/hooks';
import { Aviso, Cartao, CabPagina, Campo, Kpi, Numero, Texto, brl, numero, pct } from './ui';

export const Custos = () => {
  const config = useStore((s) => s.config);
  const exemplo = useStore((s) => s.exemplo);
  const st = useStore();
  const { operacao: op } = useCalculo();
  const { maoDeObra } = config;

  return (
    <div className="pagina">
      <CabPagina titulo="Custos e operação" descricao="Quanto custa manter a confeitaria funcionando. Esses números entram automaticamente no preço de cada receita." />

      {exemplo ? <Aviso tom="info" icone={Wallet}>Os valores abaixo são de exemplo. Troque pelos da sua operação e todos os preços se ajustam.</Aviso> : null}

      <div className="kpis">
        <Kpi destaque icone={Gauge} rotulo="Custo de 1 hora de operação" valor={brl(op.custoHoraOperacao)} rodape={`${brl(op.custoHoraTrabalho)} de trabalho + ${brl(op.fixosPorHora)} de custos fixos`} />
        <Kpi icone={Clock3} rotulo="Horas trabalhadas no mês" valor={`${numero(op.horasMes, 1)} h`} rodape={`${maoDeObra.horasDia || 0} h × ${maoDeObra.diasSemana || 0} dias × 4,33 semanas`} />
        <Kpi icone={Receipt} rotulo="Custo fixo do mês" valor={brl(op.custosFixosMes)} rodape={`${brl(op.fixosPorHora)} por hora trabalhada`} />
        <Kpi icone={Wallet} rotulo="Para a operação fechar o mês" valor={brl(op.custoMensalTotal)} rodape="Seu pró-labore + custos fixos + equipe" />
      </div>

      <div className="duas-colunas">
        <Cartao titulo="Sua hora de trabalho" descricao="Quanto você quer ganhar e quanto tempo trabalha.">
          <div className="grade-campos">
            <Campo rotulo="Quanto quer ganhar no mês?"><Numero prefixo="R$" value={maoDeObra.salario} onChange={(v) => st.updateMaoDeObra({ salario: v ?? 0 })} /></Campo>
            <Campo rotulo="Horas de trabalho por dia"><Numero value={maoDeObra.horasDia} sufixo="h" onChange={(v) => st.updateMaoDeObra({ horasDia: v ?? 0 })} /></Campo>
            <Campo rotulo="Dias de trabalho por semana"><Numero value={maoDeObra.diasSemana} sufixo="dias" onChange={(v) => st.updateMaoDeObra({ diasSemana: v ?? 0 })} /></Campo>
          </div>
          <div className="linhas-valor" style={{ marginTop: 14 }}>
            <div className="linha-valor"><span>Horas trabalhadas no mês</span><strong className="num">{numero(op.horasMes, 1)} h</strong></div>
            <div className="linha-valor"><span>Sua hora custa</span><strong className="num">{brl(op.custoHoraTrabalho)}</strong></div>
            <div className="linha-valor"><span>Seu minuto custa</span><strong className="num">{brl(op.custoHoraTrabalho / 60)}</strong></div>
          </div>
        </Cartao>

        <Cartao
          titulo="Custos fixos do mês"
          descricao="Contas que existem mesmo sem vender nada. O gás do fogão fica separado, por receita."
          acoes={<button type="button" className="btn secundario pequeno" onClick={st.addCustoFixo}><Plus size={14} />Adicionar</button>}
        >
          <div className="linhas-valor">
            {config.custosFixos.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 130px auto', gap: 8, padding: '5px 0', alignItems: 'center' }}>
                <Texto value={c.nome} onChange={(v) => st.updateCustoFixo(c.id, { nome: v })} placeholder="Nome da conta" aria-label="Nome do custo" />
                <Numero prefixo="R$" value={c.valor} onChange={(v) => st.updateCustoFixo(c.id, { valor: v ?? 0 })} aria-label="Valor mensal" />
                <button type="button" className="btn fantasma icone perigo" onClick={() => st.deleteCustoFixo(c.id)} aria-label="Remover custo"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="linha-valor" style={{ borderTop: '1px solid var(--linha-forte)', borderBottom: 0, marginTop: 6 }}>
              <span><strong>Total por mês</strong></span><strong className="num">{brl(op.custosFixosMes)}</strong>
            </div>
            <div className="linha-valor" style={{ borderBottom: 0 }}><span>Por hora trabalhada</span><strong className="num">{brl(op.fixosPorHora)}</strong></div>
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo="Equipe"
        descricao="Se alguém ajuda na produção, cadastre aqui e marque a pessoa nas receitas em que ela trabalha."
        acoes={<button type="button" className="btn secundario pequeno" onClick={st.addPessoa}><Plus size={14} />Adicionar pessoa</button>}
        semPad
      >
        {config.equipe.length === 0 ? (
          <p className="muted" style={{ padding: '0 22px 20px' }}>Ninguém cadastrado. Só o seu trabalho entra no custo das receitas.</p>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Salário no mês</th><th>Horas/dia</th><th>Dias/semana</th><th className="direita">Custo da hora</th><th /></tr></thead>
              <tbody>
                {op.equipe.map((pessoa) => (
                  <tr key={pessoa.id}>
                    <td><Texto value={pessoa.nome} onChange={(v) => st.updatePessoa(pessoa.id, { nome: v })} placeholder="Nome" aria-label="Nome" /></td>
                    <td><Numero prefixo="R$" value={pessoa.salario} onChange={(v) => st.updatePessoa(pessoa.id, { salario: v ?? 0 })} /></td>
                    <td><Numero value={pessoa.horasDia} onChange={(v) => st.updatePessoa(pessoa.id, { horasDia: v ?? 0 })} /></td>
                    <td><Numero value={pessoa.diasSemana} onChange={(v) => st.updatePessoa(pessoa.id, { diasSemana: v ?? 0 })} /></td>
                    <td className="direita num"><strong>{brl(pessoa.custoHora)}</strong></td>
                    <td className="direita"><button type="button" className="btn fantasma icone perigo" onClick={() => st.deletePessoa(pessoa.id)} aria-label="Remover pessoa"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      <div className="duas-colunas">
        <Cartao titulo="Gás" descricao="Custo = minutos ÷ 60 × (consumo ÷ peso do botijão) × preço do botijão." semPad>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Fogão</th><th>Consumo (kg/h)</th><th>Botijão (kg)</th><th>Preço do botijão</th><th className="direita">Custo/hora</th></tr></thead>
              <tbody>
                {config.gas.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.nome}</strong></td>
                    <td><Numero passo="0.0001" value={g.kgPorHora} onChange={(v) => st.updateGas(g.id, { kgPorHora: v ?? 0 })} /></td>
                    <td><Numero value={g.pesoBotijao} onChange={(v) => st.updateGas(g.id, { pesoBotijao: v ?? 0 })} /></td>
                    <td><Numero prefixo="R$" value={g.precoBotijao} onChange={(v) => st.updateGas(g.id, { precoBotijao: v ?? 0 })} /></td>
                    <td className="direita num">{brl(g.pesoBotijao ? (g.kgPorHora / g.pesoBotijao) * g.precoBotijao : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        <Cartao titulo="Margem e revenda" descricao="Valores usados quando a receita não tem os seus próprios.">
          <div className="grade-campos">
            <Campo rotulo="Margem de lucro padrão" dica="Sobre o preço de venda">
              <Numero sufixo="%" value={Math.round(config.margemPadrao * 10000) / 100} onChange={(v) => st.updateConfig({ margemPadrao: (v ?? 0) / 100 })} />
            </Campo>
            <Campo rotulo="Desconto padrão na revenda">
              <Numero sufixo="%" value={Math.round(config.descontoRevenda * 10000) / 100} onChange={(v) => st.updateConfig({ descontoRevenda: (v ?? 0) / 100 })} />
            </Campo>
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo="Canais de venda e taxas"
        descricao="A taxa de cada canal define quanto cobrar para receber o preço líquido."
        acoes={<button type="button" className="btn secundario pequeno" onClick={st.addCanal}><Plus size={14} />Adicionar canal</button>}
        semPad
      >
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Canal</th><th>Taxa</th><th /></tr></thead>
            <tbody>
              {config.canais.map((c) => (
                <tr key={c.id}>
                  <td><Texto value={c.nome} onChange={(v) => st.updateCanal(c.id, { nome: v })} placeholder="Nome do canal" aria-label="Nome do canal" /></td>
                  <td style={{ width: 160 }}><Numero sufixo="%" value={Math.round(c.taxa * 10000) / 100} onChange={(v) => st.updateCanal(c.id, { taxa: (v ?? 0) / 100 })} /></td>
                  <td className="direita"><button type="button" className="btn fantasma icone perigo" onClick={() => st.deleteCanal(c.id)} aria-label="Remover canal"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
};
