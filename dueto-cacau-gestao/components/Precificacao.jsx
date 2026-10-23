import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgePercent, Calculator, Clock3, Store, TrendingUp } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCalculo } from '@/lib/hooks';
import { simularPreco } from '@/lib/calculations';
import { Aviso, Cartao, CabPagina, Campo, Numero, Tag, Vazio, brl, minutosTexto, numero, pct } from './ui';

const COR = {
  ingredientes: '#1e3a29',
  embalagens: '#b58d3a',
  gas: '#7a4f33',
  maoDeObra: '#8b1b28',
  fixos: '#d6959b',
  equipe: '#6f8f78',
  componentes: '#3f6b4e',
  lucro: '#e6d3a0',
};

const NOMES = {
  ingredientes: 'Ingredientes',
  embalagens: 'Embalagens',
  gas: 'Gás',
  maoDeObra: 'Seu trabalho',
  fixos: 'Custos fixos',
  equipe: 'Equipe',
  componentes: 'Receitas usadas dentro',
  lucro: 'Lucro',
};

export const Precificacao = ({ receitaId, onVerReceita }) => {
  const receitas = useStore((s) => s.receitas);
  const updateReceita = useStore((s) => s.updateReceita);
  const { preco, operacao } = useCalculo();
  const [selecionada, setSelecionada] = useState(receitaId || receitas[0]?.id);
  const [descontoRevenda, setDescontoRevenda] = useState(null);
  const [simulado, setSimulado] = useState(null);

  useEffect(() => { if (receitaId) setSelecionada(receitaId); }, [receitaId]);
  useEffect(() => { setSimulado(null); }, [selecionada]);

  const receita = receitas.find((r) => r.id === selecionada) || receitas[0];
  const p = receita ? preco(receita.id, descontoRevenda !== null ? { descontoRevenda } : undefined) : null;

  const todas = useMemo(() => receitas.map((r) => ({ r, p: preco(r.id) })), [receitas, preco]);

  if (!receitas.length) {
    return (
      <div className="pagina">
        <CabPagina titulo="Precificação" descricao="Veja quanto custa cada receita, por quanto vender e quanto sobra de lucro." />
        <Cartao><Vazio icone={Calculator} titulo="Cadastre uma receita primeiro" texto="A precificação nasce das receitas: ingredientes, tempo e gás." /></Cartao>
      </div>
    );
  }

  const c = p.custo;
  const totalPreco = Math.max(p.precoReceita, c.total);
  const segmentos = [
    ['ingredientes', c.ingredientes], ['embalagens', c.embalagens], ['gas', c.gas], ['maoDeObra', c.maoDeObra],
    ['fixos', c.fixos], ['equipe', c.equipe], ['componentes', c.componentes], ['lucro', Math.max(p.lucroReceita, 0)],
  ].filter(([, v]) => v > 0.0049);

  const sim = simulado !== null ? simularPreco(c.porUnidade, c.rendimento, simulado) : null;
  const abaixoDoCusto = p.lucroUnidade < 0;
  const descontoAtual = descontoRevenda !== null ? descontoRevenda : p.revenda.desconto;

  return (
    <div className="pagina">
      <CabPagina titulo="Precificação" descricao="Do custo ao preço final: o que entra em cada unidade, por quanto vender em cada canal e quanto você ganha por hora de trabalho." />

      <div className="seletor-receita" role="tablist" aria-label="Receitas">
        {receitas.map((r) => (
          <button type="button" key={r.id} className={`chip${r.id === receita.id ? ' ativo' : ''}`} onClick={() => setSelecionada(r.id)}>{r.nome}</button>
        ))}
      </div>

      {c.semPreco.length ? (
        <Aviso icone={AlertTriangle}>Faltam preços em: {c.semPreco.join(', ')}. Enquanto isso o custo desta receita está subestimado. Preencha na tela Insumos.</Aviso>
      ) : null}
      {!receita.minutos && !c.minutosTotais ? (
        <Aviso icone={Clock3}>Esta receita está sem tempo de trabalho, então seu trabalho e os custos fixos não entram no custo. Informe os minutos na receita.</Aviso>
      ) : null}

      <div className="ficha">
        <Cartao>
          <div className="cartao-topo">
            <div>
              <h2>{receita.nome}</h2>
              <p>Rende {numero(c.rendimento)} · {c.minutosTotais ? `${minutosTexto(c.minutosTotais)} de trabalho` : 'sem tempo informado'}</p>
            </div>
            <button type="button" className="btn secundario pequeno" onClick={() => onVerReceita?.(receita.id)}>Editar receita</button>
          </div>

          <div className="preco-grande">
            <span className="legenda">{p.temPrecoProprio ? 'Seu preço de venda por unidade' : 'Preço sugerido por unidade'}</span>
            <span className="valor num">{brl(p.precoUnidade)}</span>
            <span className="legenda">
              {p.temPrecoProprio
                ? <>O sugerido para {pct(p.margemAlvo)} de margem seria <strong className="num">{brl(p.sugeridoUnidade)}</strong>.</>
                : <>Com margem de {pct(p.margemAlvo)} sobre o preço. Custo por unidade: <strong className="num">{brl(c.porUnidade)}</strong>.</>}
            </span>
          </div>

          <div className="grade-campos" style={{ margin: '18px 0 20px' }}>
            <Campo rotulo="Margem de lucro desejada" dica="Sobre o preço de venda">
              <Numero value={receita.margem === null || receita.margem === undefined ? null : Math.round(receita.margem * 10000) / 100} sufixo="%"
                placeholder={String(Math.round(p.margemAlvo * 100))} onChange={(v) => updateReceita(receita.id, { margem: v === null ? null : v / 100 })} />
            </Campo>
            <Campo rotulo="Preço que vou cobrar" dica="Vazio = usa o sugerido">
              <Numero value={receita.precoVenda} prefixo="R$" placeholder={String(p.sugeridoUnidade)} onChange={(v) => updateReceita(receita.id, { precoVenda: v })} />
            </Campo>
          </div>
          {p.temPrecoProprio ? (
            <button type="button" className="btn fantasma pequeno" style={{ marginTop: -8, marginBottom: 14 }} onClick={() => updateReceita(receita.id, { precoVenda: null })}>Voltar ao preço sugerido</button>
          ) : (
            <button type="button" className="btn fantasma pequeno" style={{ marginTop: -8, marginBottom: 14 }} onClick={() => updateReceita(receita.id, { precoVenda: p.sugeridoUnidade })}>Fixar este preço</button>
          )}

          <div className="pilha" role="img" aria-label="Composição do preço">
            {segmentos.map(([k, v]) => (
              <i key={k} style={{ width: `${(v / totalPreco) * 100}%`, background: COR[k], ...(k === 'lucro' ? { backgroundImage: 'repeating-linear-gradient(135deg, rgba(181,141,58,.45) 0 5px, transparent 5px 10px)' } : null) }} title={`${NOMES[k]}: ${brl(v)}`} />
            ))}
          </div>
          <ul className="legenda-pilha sem-marcador">
            {segmentos.map(([k, v]) => (
              <li key={k}>
                <span className="cor" style={{ background: COR[k] }} />
                <span className="nome">{NOMES[k]}</span>
                <span className="valor">{brl(v)}</span>
                <span className="pct">{pct(v / totalPreco)}</span>
              </li>
            ))}
          </ul>
          <p className="fraco" style={{ marginTop: 12, fontSize: 12.5 }}>Valores para a receita inteira ({numero(c.rendimento)} {c.rendimento === 1 ? 'unidade' : 'unidades'}), vendida a {brl(p.precoUnidade)} cada.</p>
        </Cartao>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Cartao titulo="Seu lucro" className="">
            <div className="linhas-valor">
              <div className="linha-valor"><span>Custo por unidade</span><strong className="num">{brl(c.porUnidade)}</strong></div>
              <div className="linha-valor"><span>Lucro por unidade</span><strong className={`num ${abaixoDoCusto ? 'ruim' : ''}`}>{brl(p.lucroUnidade)}</strong></div>
              <div className="linha-valor"><span>Lucro da receita inteira</span><strong className={`num ${abaixoDoCusto ? 'ruim' : ''}`}>{brl(p.lucroReceita)}</strong></div>
              <div className="linha-valor"><span>Margem real</span><strong className={`num ${abaixoDoCusto ? 'ruim' : ''}`}>{pct(p.margemReal, 1)}</strong></div>
              <div className="linha-valor forte"><span>Lucro em 1 hora</span><strong className="num">{p.lucroPorHora === null ? '—' : brl(p.lucroPorHora)}</strong></div>
            </div>
            {abaixoDoCusto ? <div style={{ marginTop: 12 }}><Aviso icone={AlertTriangle}>Este preço está abaixo do custo. Você paga para vender.</Aviso></div> : null}
          </Cartao>

          <Cartao titulo="E se eu cobrar outro valor?" descricao="Teste um preço sem mexer na receita.">
            <Campo rotulo="Preço por unidade">
              <Numero value={simulado} prefixo="R$" placeholder={String(p.precoUnidade)} onChange={(v) => setSimulado(v)} />
            </Campo>
            {sim ? (
              <div className="linhas-valor" style={{ marginTop: 10 }}>
                <div className="linha-valor"><span>Margem</span><strong className={`num ${sim.lucroUnidade < 0 ? 'ruim' : ''}`}>{pct(sim.margem, 1)}</strong></div>
                <div className="linha-valor"><span>Lucro por unidade</span><strong className="num">{brl(sim.lucroUnidade)}</strong></div>
                <div className="linha-valor"><span>Lucro da receita</span><strong className="num">{brl(sim.lucroReceita)}</strong></div>
              </div>
            ) : null}
          </Cartao>
        </div>
      </div>

      <div className="duas-colunas">
        <Cartao titulo="Por quanto vender em cada canal" descricao={`Para receber ${brl(p.precoUnidade)} limpos, cobre:`} semPad>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Canal</th><th className="direita">Taxa</th><th className="direita">Cobrar</th></tr></thead>
              <tbody>
                <tr><td><strong>Venda direta</strong> <span className="fraco">(Pix, dinheiro)</span></td><td className="direita num">0%</td><td className="direita num"><strong>{brl(p.precoUnidade)}</strong></td></tr>
                {p.canais.map((canal) => (
                  <tr key={canal.id}><td>{canal.nome}</td><td className="direita num">{pct(canal.taxa, 2)}</td><td className="direita num"><strong>{brl(canal.preco)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        <Cartao titulo="Revenda com desconto" descricao="Para vender em quantidade a lojas ou parceiras.">
          <div className="seletor-receita" style={{ marginBottom: 12 }}>
            {[0.05, 0.1, 0.15, 0.2].map((d) => (
              <button type="button" key={d} className={`chip${Math.abs(descontoAtual - d) < 1e-9 ? ' ativo' : ''}`} onClick={() => setDescontoRevenda(d)}>{pct(d)}</button>
            ))}
          </div>
          <div className="linhas-valor">
            <div className="linha-valor"><span>Preço de revenda</span><strong className="num">{brl(p.revenda.preco)}</strong></div>
            <div className="linha-valor"><span>Margem de lucro</span><strong className={`num ${p.revenda.lucroUnidade < 0 ? 'ruim' : ''}`}>{pct(p.revenda.margem, 1)}</strong></div>
            <div className="linha-valor"><span>Lucro por unidade</span><strong className={`num ${p.revenda.lucroUnidade < 0 ? 'ruim' : ''}`}>{brl(p.revenda.lucroUnidade)}</strong></div>
          </div>
          {p.revenda.lucroUnidade < 0 ? <div style={{ marginTop: 12 }}><Aviso icone={AlertTriangle}>Com este desconto o preço fica abaixo do custo.</Aviso></div> : null}
        </Cartao>
      </div>

      <Cartao titulo="Todas as receitas lado a lado" descricao="Clique em uma linha para abrir a ficha. A coluna “Lucro por hora” mostra qual receita paga melhor o seu tempo." semPad>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Receita</th><th className="direita">Custo/un.</th><th className="direita">Preço</th><th className="direita">Margem</th><th className="direita">Lucro/un.</th><th className="direita">Lucro por hora</th></tr></thead>
            <tbody>
              {todas.map(({ r, p: pr }) => (
                <tr key={r.id} onClick={() => { setSelecionada(r.id); window.scrollTo?.(0, 0); document.querySelector('.conteudo')?.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
                  <td><strong>{r.nome}</strong></td>
                  <td className="direita num">{brl(pr.custo.porUnidade)}</td>
                  <td className="direita num">{brl(pr.precoUnidade)}</td>
                  <td className="direita num">{pct(pr.margemReal, 1)}</td>
                  <td className={`direita num ${pr.lucroUnidade < 0 ? 'ruim' : ''}`}>{brl(pr.lucroUnidade)}</td>
                  <td className="direita num"><strong>{pr.lucroPorHora === null ? '—' : brl(pr.lucroPorHora)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <p className="fraco" style={{ fontSize: 12.5 }}>
        Sua hora custa {brl(operacao.custoHoraTrabalho)} de trabalho + {brl(operacao.fixosPorHora)} de custos fixos = {brl(operacao.custoHoraOperacao)} por hora. Ajuste na tela Custos e operação.
      </p>
    </div>
  );
};
