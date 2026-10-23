import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lerReceitaEmTopicos } from './parser';

const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const hoje = () => new Date().toISOString().slice(0, 10);
const diasDepois = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------- Dados de exemplo (valores da confeitaria e da planilha) ---------- */
const insumosExemplo = () => [
  { id: 'ins_choc', nome: 'Chocolate em pó', unidade: 'g', qtdEmbalagem: 1000, preco: 40 },
  { id: 'ins_leite', nome: 'Leite', unidade: 'ml', qtdEmbalagem: 1000, preco: 5.5 },
  { id: 'ins_trigo', nome: 'Farinha de trigo', unidade: 'g', qtdEmbalagem: 1000, preco: 4.69 },
  { id: 'ins_ferm', nome: 'Fermento', unidade: 'g', qtdEmbalagem: 250, preco: 9.59 },
  { id: 'ins_ovo', nome: 'Ovo', unidade: 'un', qtdEmbalagem: 30, preco: 18 },
  { id: 'ins_oleo', nome: 'Óleo', unidade: 'ml', qtdEmbalagem: 900, preco: 9 },
  { id: 'ins_acucar', nome: 'Açúcar', unidade: 'g', qtdEmbalagem: 1000, preco: 4.29 },
  { id: 'ins_marg', nome: 'Margarina', unidade: 'g', qtdEmbalagem: 500, preco: 5.29 },
  { id: 'ins_lcond', nome: 'Leite condensado', unidade: 'g', qtdEmbalagem: 395, preco: 5.69 },
  { id: 'ins_creme', nome: 'Creme de leite', unidade: 'g', qtdEmbalagem: 200, preco: 3.29 },
  { id: 'ins_morango', nome: 'Morango', unidade: 'un', qtdEmbalagem: 1, preco: 4 },
  { id: 'ins_flocos', nome: 'Flocos de brigadeiro', unidade: 'g', qtdEmbalagem: 100, preco: 1.79 },
  { id: 'ins_granulado', nome: 'Granulado', unidade: 'g', qtdEmbalagem: 500, preco: 18 },
  { id: 'ins_coco', nome: 'Coco ralado', unidade: 'g', qtdEmbalagem: 1000, preco: 36 },
  { id: 'ins_nutella', nome: 'Creme de avelã', unidade: 'g', qtdEmbalagem: 750, preco: 42 },
  { id: 'ins_lpo', nome: 'Leite em pó', unidade: 'g', qtdEmbalagem: 1000, preco: 22 },
];

const embalagensExemplo = () => [
  { id: 'emb_prato', nome: 'Prato / base', unidade: 'un', qtdEmbalagem: 1, preco: 5 },
  { id: 'emb_adesivo', nome: 'Adesivo da marca', unidade: 'un', qtdEmbalagem: 1000, preco: 100 },
  { id: 'emb_celofane', nome: 'Celofane 22x22', unidade: 'un', qtdEmbalagem: 100, preco: 6.99 },
  { id: 'emb_sacola', nome: 'Sacola pastel 10x10', unidade: 'un', qtdEmbalagem: 100, preco: 4.4 },
  { id: 'emb_muffin', nome: 'Saco para muffin', unidade: 'un', qtdEmbalagem: 100, preco: 5.99 },
  { id: 'emb_filme', nome: 'Filme plástico (m)', unidade: 'm', qtdEmbalagem: 80000, preco: 90 },
];

const configInicial = () => ({
  maoDeObra: { salario: 2600, horasDia: 6, diasSemana: 5 },
  custosFixos: [
    { id: 'cf_agua', nome: 'Água', valor: 30 },
    { id: 'cf_luz', nome: 'Luz', valor: 200 },
    { id: 'cf_net', nome: 'Internet', valor: 80 },
    { id: 'cf_limp', nome: 'Materiais de limpeza', valor: 20 },
    { id: 'cf_mei', nome: 'MEI', valor: 0 },
  ],
  equipe: [],
  gas: [
    { id: 'boca_p', nome: 'Boca pequena', kgPorHora: 0.1207, pesoBotijao: 13, precoBotijao: 110 },
    { id: 'boca_g', nome: 'Boca grande', kgPorHora: 0.213, pesoBotijao: 13, precoBotijao: 110 },
    { id: 'forno', nome: 'Forno', kgPorHora: 0.1775, pesoBotijao: 13, precoBotijao: 110 },
  ],
  margemPadrao: 0.4,
  descontoRevenda: 0.1,
  canais: [
    { id: 'ifood_basico', nome: 'iFood (Plano Básico)', taxa: 0.16 },
    { id: 'ifood_plus', nome: 'iFood (Entrega Plus)', taxa: 0.27 },
    { id: 'cartao_1', nome: 'Cartão de crédito (3,99%)', taxa: 0.0399 },
    { id: 'cartao_2', nome: 'Cartão de crédito (4,99%)', taxa: 0.0499 },
  ],
});

const receitasExemplo = () => [
  {
    id: 'rec_massa', nome: 'Massa de bolo de chocolate', categoria: 'Bolo', rendimento: 1, minutos: 25,
    ingredientes: [
      { insumoId: 'ins_choc', qtd: 95 }, { insumoId: 'ins_leite', qtd: 325 }, { insumoId: 'ins_trigo', qtd: 276 },
      { insumoId: 'ins_ferm', qtd: 15 }, { insumoId: 'ins_ovo', qtd: 3 }, { insumoId: 'ins_oleo', qtd: 112.5 },
      { insumoId: 'ins_acucar', qtd: 250 },
    ],
    embalagens: [], gas: [{ fonteId: 'forno', minutos: 55 }], componentes: [], equipeIds: [],
    margem: null, precoVenda: null, notas: 'Massa base de vários bolos (rende 1 forma).',
  },
  {
    id: 'rec_brig', nome: 'Brigadeiro (recheio e cobertura)', categoria: 'Doce', rendimento: 1, minutos: 30,
    ingredientes: [
      { insumoId: 'ins_choc', qtd: 40 }, { insumoId: 'ins_marg', qtd: 30 },
      { insumoId: 'ins_lcond', qtd: 395 }, { insumoId: 'ins_creme', qtd: 200 },
    ],
    embalagens: [], gas: [{ fonteId: 'boca_p', minutos: 30 }], componentes: [], equipeIds: [],
    margem: null, precoVenda: null, notas: 'Usado como recheio e cobertura de bolos.',
  },
  {
    id: 'rec_bolo', nome: 'Bolo brigadeiro com morango', categoria: 'Bolo', rendimento: 1, minutos: 80,
    ingredientes: [{ insumoId: 'ins_morango', qtd: 2 }, { insumoId: 'ins_flocos', qtd: 100 }],
    embalagens: [{ embalagemId: 'emb_prato', qtd: 1 }], gas: [],
    componentes: [{ receitaId: 'rec_massa', qtd: 1 }, { receitaId: 'rec_brig', qtd: 2 }], equipeIds: [],
    margem: 0.45, precoVenda: null,
    notas: 'Massa + brigadeiro (2x) + morango. Montagem, cobertura e acabamento: 80 min.',
  },
];

const dadosExemplo = () => ({
  ingredientes: insumosExemplo(),
  embalagens: embalagensExemplo(),
  receitas: receitasExemplo(),
  config: configInicial(),
  pedidos: [
    { id: 'ped_1', data: diasDepois(1), cliente: 'Cliente A', tipo: 'entrega', status: 'pendente',
      itens: [{ receitaId: 'rec_bolo', qtd: 1, preco: 200 }], notas: 'Entregar de manhã.' },
    { id: 'ped_2', data: diasDepois(-2), cliente: 'Cliente B', tipo: 'retirada', status: 'entregue',
      itens: [{ receitaId: 'rec_bolo', qtd: 2, preco: 200 }], notas: '' },
  ],
  caixa: [
    { id: 'cx_1', data: diasDepois(-2), tipo: 'entrada', categoria: 'Vendas', valor: 400, descricao: 'Pedido da Cliente B' },
    { id: 'cx_2', data: diasDepois(-3), tipo: 'saida', categoria: 'Insumos', valor: 120, descricao: 'Compra de chocolate e leite condensado' },
  ],
  tarefas: [
    { id: 'tar_1', titulo: 'Revisar custos e margem', descricao: 'Conferir se a margem de lucro está adequada.', coluna: 'a_fazer', prioridade: 'alta', prazo: diasDepois(2), pedidoId: null },
    { id: 'tar_2', titulo: 'Comprar embalagens do Natal', descricao: 'Celofane, adesivos e laços verde e vinho.', coluna: 'fazendo', prioridade: 'media', prazo: diasDepois(5), pedidoId: null },
    { id: 'tar_3', titulo: 'Atualizar preços dos insumos', descricao: '', coluna: 'a_fazer', prioridade: 'baixa', prazo: '', pedidoId: null },
  ],
  exemplo: true,
});

const vazio = () => ({
  ingredientes: [], embalagens: [], receitas: [], config: configInicial(), pedidos: [], caixa: [], tarefas: [], exemplo: false,
});

const atualizar = (lista, id, dados) => lista.map((x) => (x.id === id ? { ...x, ...dados } : x));

export const useStore = create(
  persist(
    (set, get) => ({
      ...dadosExemplo(),

      /* ---- Insumos e embalagens ---- */
      addInsumo: (dados) => {
        const id = uid('ins');
        set((s) => ({ ingredientes: [...s.ingredientes, { unidade: 'g', qtdEmbalagem: 1000, preco: 0, ...dados, id }] }));
        return id;
      },
      updateInsumo: (id, dados) => set((s) => ({ ingredientes: atualizar(s.ingredientes, id, dados) })),
      deleteInsumo: (id) => set((s) => ({
        ingredientes: s.ingredientes.filter((i) => i.id !== id),
        receitas: s.receitas.map((r) => ({ ...r, ingredientes: r.ingredientes.filter((l) => l.insumoId !== id) })),
      })),
      addEmbalagem: (dados) => {
        const id = uid('emb');
        set((s) => ({ embalagens: [...s.embalagens, { unidade: 'un', qtdEmbalagem: 1, preco: 0, ...dados, id }] }));
        return id;
      },
      updateEmbalagem: (id, dados) => set((s) => ({ embalagens: atualizar(s.embalagens, id, dados) })),
      deleteEmbalagem: (id) => set((s) => ({
        embalagens: s.embalagens.filter((e) => e.id !== id),
        receitas: s.receitas.map((r) => ({ ...r, embalagens: r.embalagens.filter((l) => l.embalagemId !== id) })),
      })),

      /* ---- Receitas ---- */
      addReceita: (dados) => {
        const id = uid('rec');
        set((s) => ({
          receitas: [...s.receitas, {
            categoria: 'Doce', rendimento: 1, minutos: 0, ingredientes: [], embalagens: [], gas: [],
            componentes: [], equipeIds: [], margem: null, precoVenda: null, notas: '', ...dados, id,
          }],
        }));
        return id;
      },
      updateReceita: (id, dados) => set((s) => ({ receitas: atualizar(s.receitas, id, dados) })),
      deleteReceita: (id) => set((s) => ({
        receitas: s.receitas
          .filter((r) => r.id !== id)
          .map((r) => ({ ...r, componentes: (r.componentes || []).filter((c) => c.receitaId !== id) })),
      })),

      /** Lê o texto em tópicos e devolve uma prévia (não grava nada). */
      lerReceitaTexto: (texto) => lerReceitaEmTopicos(texto, get().ingredientes),

      /**
       * Grava a prévia revisada: cria os insumos novos e a receita.
       * `previa.itens[i]` = { insumoId | novo: { nome, unidade, qtdEmbalagem, preco }, qtd }.
       */
      cadastrarReceitaDaPrevia: (previa) => {
        const { addInsumo, addReceita } = get();
        const ingredientes = [];
        previa.itens.forEach((item) => {
          let insumoId = item.insumoId;
          if (!insumoId && item.novo) {
            insumoId = addInsumo({
              nome: item.novo.nome,
              unidade: item.novo.unidade,
              qtdEmbalagem: Number(item.novo.qtdEmbalagem) || (item.novo.unidade === 'un' ? 1 : 1000),
              preco: Number(item.novo.preco) || 0,
            });
          }
          if (insumoId) ingredientes.push({ insumoId, qtd: Number(item.qtd) || 0 });
        });
        const gas = [];
        if (previa.forno) gas.push({ fonteId: 'forno', minutos: Number(previa.forno) });
        if (previa.fogao) gas.push({ fonteId: 'boca_p', minutos: Number(previa.fogao) });
        return addReceita({
          nome: previa.nome,
          categoria: previa.categoria || 'Doce',
          rendimento: Number(previa.rendimento) || 1,
          minutos: Number(previa.minutos) || 0,
          ingredientes,
          gas,
        });
      },

      /* ---- Pedidos ---- */
      addPedido: (dados) => set((s) => ({ pedidos: [...s.pedidos, { ...dados, id: uid('ped') }] })),
      updatePedido: (id, dados) => set((s) => ({ pedidos: atualizar(s.pedidos, id, dados) })),
      deletePedido: (id) => set((s) => ({
        pedidos: s.pedidos.filter((p) => p.id !== id),
        tarefas: s.tarefas.map((t) => (t.pedidoId === id ? { ...t, pedidoId: null } : t)),
      })),

      /* ---- Caixa ---- */
      addLancamento: (dados) => set((s) => ({ caixa: [...s.caixa, { ...dados, id: uid('cx') }] })),
      updateLancamento: (id, dados) => set((s) => ({ caixa: atualizar(s.caixa, id, dados) })),
      deleteLancamento: (id) => set((s) => ({ caixa: s.caixa.filter((c) => c.id !== id) })),

      /* ---- Tarefas e demandas ---- */
      addTarefa: (dados) => set((s) => ({
        tarefas: [...s.tarefas, { coluna: 'a_fazer', prioridade: 'media', prazo: '', descricao: '', pedidoId: null, ...dados, id: uid('tar') }],
      })),
      updateTarefa: (id, dados) => set((s) => ({ tarefas: atualizar(s.tarefas, id, dados) })),
      deleteTarefa: (id) => set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),

      /* ---- Custos e operação ---- */
      updateConfig: (dados) => set((s) => ({ config: { ...s.config, ...dados } })),
      updateMaoDeObra: (dados) => set((s) => ({ config: { ...s.config, maoDeObra: { ...s.config.maoDeObra, ...dados } } })),
      addCustoFixo: () => set((s) => ({ config: { ...s.config, custosFixos: [...s.config.custosFixos, { id: uid('cf'), nome: '', valor: 0 }] } })),
      updateCustoFixo: (id, dados) => set((s) => ({ config: { ...s.config, custosFixos: atualizar(s.config.custosFixos, id, dados) } })),
      deleteCustoFixo: (id) => set((s) => ({ config: { ...s.config, custosFixos: s.config.custosFixos.filter((c) => c.id !== id) } })),
      addPessoa: () => set((s) => ({ config: { ...s.config, equipe: [...s.config.equipe, { id: uid('pes'), nome: '', salario: 0, horasDia: 6, diasSemana: 5 }] } })),
      updatePessoa: (id, dados) => set((s) => ({ config: { ...s.config, equipe: atualizar(s.config.equipe, id, dados) } })),
      deletePessoa: (id) => set((s) => ({
        config: { ...s.config, equipe: s.config.equipe.filter((p) => p.id !== id) },
        receitas: s.receitas.map((r) => ({ ...r, equipeIds: (r.equipeIds || []).filter((x) => x !== id) })),
      })),
      updateGas: (id, dados) => set((s) => ({ config: { ...s.config, gas: atualizar(s.config.gas, id, dados) } })),
      updateCanal: (id, dados) => set((s) => ({ config: { ...s.config, canais: atualizar(s.config.canais, id, dados) } })),
      addCanal: () => set((s) => ({ config: { ...s.config, canais: [...s.config.canais, { id: uid('can'), nome: '', taxa: 0 }] } })),
      deleteCanal: (id) => set((s) => ({ config: { ...s.config, canais: s.config.canais.filter((c) => c.id !== id) } })),

      /* ---- Dados ---- */
      limparExemplos: () => set((s) => ({ ...vazio(), config: s.config })),
      restaurarExemplos: () => set(() => ({ ...dadosExemplo() })),
      exportar: () => {
        const { ingredientes, embalagens, receitas, config, pedidos, caixa, tarefas } = get();
        return JSON.stringify({ versao: 1, ingredientes, embalagens, receitas, config, pedidos, caixa, tarefas }, null, 2);
      },
      importar: (texto) => {
        const d = JSON.parse(texto);
        if (!d || !Array.isArray(d.receitas) || !Array.isArray(d.ingredientes)) throw new Error('Arquivo inválido');
        set(() => ({ ...vazio(), ...d, exemplo: false }));
      },
    }),
    {
      name: 'dueto-cacau-v1',
      version: 1,
      partialize: pegarDados,
      skipHydration: true,
    },
  ),
);

/** Só os dados (sem funções), para salvar no navegador e na nuvem. */
function pegarDados(s) {
  return {
    ingredientes: s.ingredientes, embalagens: s.embalagens, receitas: s.receitas, config: s.config,
    pedidos: s.pedidos, caixa: s.caixa, tarefas: s.tarefas, exemplo: s.exemplo,
  };
}

export { uid, hoje, pegarDados };
