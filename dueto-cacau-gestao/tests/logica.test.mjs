import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularOperacao, calcularReceita, calcularPreco, simularPreco, custoUnitario,
  componentesInvalidos, calcularResultadoPedidos, resumoCaixa,
} from '../lib/calculations.js';
import { lerReceitaEmTopicos, encontrarInsumo } from '../lib/parser.js';

// Mesmos números da planilha comprada (aba Custos fixos / Precificação):
// R$ 1.000 de salário, 8 h/dia, 2 dias/semana  →  64 h/mês (planilha usa 4 semanas)
const configPlanilha = {
  maoDeObra: { salario: 1000, horasDia: 8, diasSemana: 2 },
  custosFixos: [
    { id: 'a', nome: 'Água', valor: 30 }, { id: 'b', nome: 'Luz', valor: 200 },
    { id: 'c', nome: 'Gás', valor: 100 }, { id: 'd', nome: 'Internet', valor: 80 },
    { id: 'e', nome: 'Limpeza', valor: 20 },
  ],
  equipe: [],
  gas: [],
  margemPadrao: 0.4,
  canais: [
    { id: 'ifood', nome: 'iFood (Plano Básico)', taxa: 0.16 },
    { id: 'ifood+', nome: 'iFood (Entrega Plus)', taxa: 0.27 },
    { id: 'c1', nome: 'Cartão 3,99%', taxa: 0.0399 },
    { id: 'c2', nome: 'Cartão 4,99%', taxa: 0.0499 },
  ],
  descontoRevenda: 0.1,
};

test('hora de trabalho e custos fixos por hora', () => {
  const op = calcularOperacao(configPlanilha);
  assert.ok(Math.abs(op.horasMes - 8 * 2 * 4.33) < 1e-9);
  assert.ok(Math.abs(op.custoHoraTrabalho - 1000 / op.horasMes) < 1e-9);
  assert.equal(op.custosFixosMes, 430);
  assert.ok(Math.abs(op.fixosPorHora - 430 / op.horasMes) < 1e-9);
  assert.ok(Math.abs(op.custoHoraOperacao - 1430 / op.horasMes) < 1e-9);
});

const estado = () => ({
  config: configPlanilha,
  ingredientes: [
    { id: 'i1', nome: 'Açúcar', unidade: 'g', qtdEmbalagem: 1000, preco: 4 },
    { id: 'i2', nome: 'Ovo', unidade: 'un', qtdEmbalagem: 30, preco: 18 },
    { id: 'i3', nome: 'Chocolate em pó', unidade: 'g', qtdEmbalagem: 1000, preco: 40 },
    { id: 'i4', nome: 'Leite condensado', unidade: 'g', qtdEmbalagem: 395, preco: 7 },
    { id: 'i5', nome: 'Manteiga', unidade: 'g', qtdEmbalagem: 500, preco: 20 },
  ],
  embalagens: [{ id: 'e1', nome: 'Caixa', unidade: 'un', qtdEmbalagem: 10, preco: 20 }],
  receitas: [
    {
      id: 'r1', nome: 'Massa', rendimento: 1, minutos: 60,
      ingredientes: [{ insumoId: 'i1', qtd: 250 }, { insumoId: 'i2', qtd: 3 }],
      embalagens: [], gas: [], componentes: [], equipeIds: [], margem: null, precoVenda: null,
    },
    {
      id: 'r2', nome: 'Bolo', rendimento: 4, minutos: 30,
      ingredientes: [{ insumoId: 'i3', qtd: 100 }],
      embalagens: [{ embalagemId: 'e1', qtd: 1 }],
      gas: [], componentes: [{ receitaId: 'r1', qtd: 2 }], equipeIds: [], margem: null, precoVenda: null,
    },
  ],
});

test('custo unitário de insumo', () => {
  assert.equal(custoUnitario({ qtdEmbalagem: 1000, preco: 4 }), 0.004);
  assert.equal(custoUnitario({ qtdEmbalagem: 0, preco: 4 }), 0);
});

test('custo da receita soma ingredientes, operação e componentes', () => {
  const e = estado();
  const op = calcularOperacao(e.config);
  const massa = calcularReceita('r1', e);
  // 250 g × 0,004 + 3 ovos × 0,6 = 1 + 1,8
  assert.ok(Math.abs(massa.ingredientes - 2.8) < 1e-9);
  assert.ok(Math.abs(massa.maoDeObra - op.custoHoraTrabalho) < 1e-9); // 60 min = 1 h
  assert.ok(Math.abs(massa.fixos - op.fixosPorHora) < 1e-9);
  assert.ok(Math.abs(massa.total - (2.8 + op.custoHoraOperacao)) < 1e-9);

  const bolo = calcularReceita('r2', e);
  const proprio = 100 * 0.04 + 2 + 0.5 * op.custoHoraOperacao; // choc + caixa + 30 min
  assert.ok(Math.abs(bolo.total - (proprio + 2 * massa.total)) < 1e-9);
  assert.ok(Math.abs(bolo.porUnidade - bolo.total / 4) < 1e-9);
  assert.equal(bolo.minutosTotais, 30 + 2 * 60);
});

test('preço sugerido usa margem sobre o preço e dá o lucro por hora', () => {
  const e = estado();
  const p = calcularPreco('r1', e);
  assert.ok(Math.abs(p.sugeridoReceita - p.custo.total / 0.6) < 0.01);
  assert.ok(Math.abs(p.margemReal - 0.4) < 0.005);
  assert.equal(p.lucroUnidade, p.lucroReceita); // rendimento 1
  // 60 minutos → lucro por hora = lucro da receita
  assert.ok(Math.abs(p.lucroPorHora - p.lucroReceita) < 0.01);
});

test('preço próprio recalcula margem e lucro', () => {
  const e = estado();
  e.receitas[0].precoVenda = 38.64;
  const p = calcularPreco('r1', e);
  assert.equal(p.precoUnidade, 38.64);
  assert.ok(Math.abs(p.lucroUnidade - (38.64 - p.custo.porUnidade)) < 0.01);
});

test('canais e revenda batem com a planilha (12 → 14,29 / 16,44 / 12,50 / 12,63)', () => {
  const e = estado();
  e.receitas[0].precoVenda = 12;
  const p = calcularPreco('r1', e);
  const por = Object.fromEntries(p.canais.map((c) => [c.id, c.preco]));
  assert.equal(por.ifood, 14.29);
  assert.equal(por['ifood+'], 16.44);
  assert.equal(por.c1, 12.5);
  assert.equal(por.c2, 12.63);
  assert.equal(p.revenda.preco, 10.8);
});

test('simulador de preço', () => {
  const s = simularPreco(1.93, 12, 12);
  assert.equal(s.lucroUnidade, 10.07);
  assert.ok(Math.abs(s.margem - 0.839) < 0.001);
});

test('dependência circular é bloqueada', () => {
  const e = estado();
  const invalidos = componentesInvalidos('r1', e.receitas);
  assert.ok(invalidos.has('r1') && invalidos.has('r2'));
  e.receitas[0].componentes = [{ receitaId: 'r2', qtd: 1 }]; // loop proposital
  assert.ok(Number.isFinite(calcularReceita('r2', e).total));
});

test('resultado dos pedidos e caixa', () => {
  const e = estado();
  const pedidos = [
    { id: 1, data: '2026-10-01', status: 'entregue', itens: [{ receitaId: 'r2', qtd: 2, preco: 50 }] },
    { id: 2, data: '2026-10-02', status: 'pendente', itens: [{ receitaId: 'r2', qtd: 9, preco: 50 }] },
  ];
  const r = calcularResultadoPedidos(pedidos, e);
  assert.equal(r.receita, 100);
  assert.equal(r.unidades, 2);
  const cx = resumoCaixa([
    { tipo: 'entrada', valor: 100, categoria: 'Vendas', data: '2026-10-01' },
    { tipo: 'saida', valor: 30, categoria: 'Insumos', data: '2026-10-01' },
  ]);
  assert.equal(cx.saldo, 70);
});

// -------- Leitor de receita em tópicos --------
const catalogo = estado().ingredientes;

test('lê receita em tópicos do exemplo', () => {
  const r = lerReceitaEmTopicos(
    `Brownie artesanal
Rendimento: 12 unidades
Tempo: 1h30
Forno: 35 min
300g de açúcar
90 g de chocolate em pó
- 3 ovos
1 lata de leite condensado
2 colheres (sopa) de manteiga
200g de nozes`,
    catalogo,
  );
  assert.equal(r.nome, 'Brownie artesanal');
  assert.equal(r.rendimento, 12);
  assert.equal(r.minutos, 90);
  assert.equal(r.forno, 35);
  assert.equal(r.itens.length, 6);
  const por = Object.fromEntries(r.itens.map((i) => [i.nomeDigitado, i]));
  assert.equal(por['açúcar'].insumoId, 'i1');
  assert.equal(por['açúcar'].qtd, 300);
  assert.equal(por['chocolate em pó'].insumoId, 'i3');
  assert.equal(por['ovos'].insumoId, 'i2');
  assert.equal(por['ovos'].qtd, 3);
  assert.equal(por['leite condensado'].qtd, 395); // 1 lata = embalagem do insumo
  assert.equal(por['manteiga'].qtd, 30); // 2 colheres de sopa ≈ 30
  assert.equal(por['nozes'].insumoId, null); // não cadastrado → novo insumo
  assert.equal(por['nozes'].novo.unidade, 'g');
  assert.ok(r.avisos.some((a) => /manteiga/i.test(a)));
});

test('formato mínimo: só nome e linhas com quantidade', () => {
  const r = lerReceitaEmTopicos('Nome da receita\n300g de açúcar\n90g de chocolate\n', catalogo);
  assert.equal(r.nome, 'Nome da receita');
  assert.equal(r.itens.length, 2);
  assert.equal(r.itens[1].insumoId, 'i3'); // "chocolate" → "Chocolate em pó"
});

test('kg, litros, frações e pontuação variada', () => {
  const r = lerReceitaEmTopicos('Teste\n1,5 kg de açúcar\n1/2 xícara de chocolate em pó\n• 2 ovos\n3) 500ml leite', catalogo);
  assert.equal(r.itens[0].qtd, 1500);
  assert.equal(r.itens[1].qtd, 120);
  assert.equal(r.itens[2].qtd, 2);
  assert.equal(r.itens[3].novo.unidade, 'ml');
  assert.equal(r.itens[3].qtd, 500);
});

test('busca de insumo ignora acento e plural', () => {
  assert.equal(encontrarInsumo('Ovos', catalogo).insumo.id, 'i2');
  assert.equal(encontrarInsumo('acucar', catalogo).insumo.id, 'i1');
  assert.equal(encontrarInsumo('farinha', catalogo), null);
});
