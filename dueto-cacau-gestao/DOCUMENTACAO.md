# 📚 Documentação Técnica - Eliz Bakery System

## 📋 Índice
1. [Arquitetura](#arquitetura)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Componentes](#componentes)
4. [Store (Estado)](#store-estado)
5. [Cálculos](#cálculos)
6. [Como Usar Cada Aba](#como-usar-cada-aba)
7. [Dicas Importantes](#dicas-importantes)

---

## 🏗️ Arquitetura

### Fluxo de Dados
```
User Input → Component → Store (Zustand) → localStorage → Render
```

### Tecnologias
- **Next.js**: Framework React com SSR
- **Zustand**: Gerenciamento de estado
- **Tailwind CSS**: Estilização
- **Recharts**: Gráficos
- **date-fns**: Manipulação de datas

---

## 📁 Estrutura de Pastas

```
eliz-bakery-system/
├── components/          # Componentes React
│   ├── Navigation.jsx   # Navegação principal
│   ├── Dashboard.jsx    # Dashboard mensal
│   ├── WeeklyOrders.jsx # Pedidos da semana
│   ├── Recipes.jsx      # Receitas e produtos
│   ├── Pricing.jsx      # Precificação
│   ├── CashBox.jsx      # Caixa da empresa
│   └── FinancialNotes.jsx # Notas financeiras
├── pages/               # Páginas Next.js
│   ├── _app.jsx        # App wrapper
│   └── index.jsx       # Home
├── lib/                 # Funções utilitárias
│   ├── store.js        # Store Zustand
│   └── calculations.js # Cálculos de preço
├── styles/             # CSS
│   └── globals.css     # Estilos globais
├── public/             # Arquivos estáticos
├── package.json        # Dependências
└── README.md          # Documentação
```

---

## 🧩 Componentes

### 1. Navigation (Navegação)
Renderiza as abas principais e permite navegação entre seções.

**Props:**
- `activeTab`: string (aba ativa)
- `setActiveTab`: função (altera aba)

**Funcionalidades:**
- Menu responsivo
- Indicador visual da aba ativa
- Gradientes com paleta de cores

### 2. Dashboard
Exibe resumo mensal com KPIs e gráficos.

**Exibe:**
- Receita total
- Custo total
- Lucro bruto
- Margem percentual
- Fluxo de caixa
- Gráficos de receita vs custo

### 3. WeeklyOrders
Gerencia pedidos da semana.

**Funcionalidades:**
- Criar novo pedido
- Adicionar múltiplos itens por pedido
- Editar pedido existente
- Deletar pedido
- Mudar status (pendente/entregue/cancelado)
- Visualizar total por pedido

### 4. Recipes
Cadastra e gerencia receitas.

**Funcionalidades:**
- Criar receita com ingredientes
- Registrar gás utilizado (fogão)
- Editar receita existente
- Deletar receita
- Visualizar custo total de ingredientes

### 5. Pricing
Mostra tabela de precificação com cálculos.

**Funcionalidades:**
- Configurar preço do gás
- Configurar margem de mão de obra
- Configurar margem de lucro
- Visualizar preços sugeridos
- Ver alternativas de preço (30%, 50%, 75%, 100%)

### 6. CashBox
Registra entradas e saídas.

**Funcionalidades:**
- Criar lançamento (entrada/saída)
- Categorizar por tipo
- Filtrar por tipo e categoria
- Ver saldo em tempo real
- Editar e deletar lançamentos

### 7. FinancialNotes
Notas sobre decisões financeiras.

**Funcionalidades:**
- Criar nota com prioridade
- Marcar como concluída
- Filtrar por prioridade e status
- Editar e deletar notas

---

## 💾 Store (Estado)

### useBakeryStore

Gerencia todo o estado da aplicação:

```javascript
const store = useBakeryStore();

// Receitas
store.recipes              // Array de receitas
store.addRecipe()          // Adicionar
store.updateRecipe()       // Atualizar
store.deleteRecipe()       // Deletar

// Pedidos
store.weeklyOrders         // Array de pedidos
store.addOrder()           // Adicionar
store.updateOrder()        // Atualizar
store.deleteOrder()        // Deletar

// Configurações
store.pricingConfig        // { gasPrice, laborMargin, profitMargin }
store.updatePricingConfig()// Atualizar

// Caixa
store.cashBox              // Array de lançamentos
store.addCashEntry()       // Adicionar
store.updateCashEntry()    // Atualizar
store.deleteCashEntry()    // Deletar

// Notas
store.financialNotes       // Array de notas
store.addFinancialNote()   // Adicionar
store.updateFinancialNote()// Atualizar
store.deleteFinancialNote()// Deletar
```

---

## 🧮 Cálculos

### calculateRecipeCost(recipe, gasPrice)
Calcula custo direto de uma receita.

**Retorna:**
```javascript
{
  ingredientCost: 2.50,      // Custo ingredientes
  gasCost: 5.63,             // Custo gás
  directCost: 8.13,          // Total direto
  costPerUnit: 0.68,         // Por unidade
  yield: 12                  // Quantidade
}
```

### calculatePrice(recipe, gasPrice, laborMargin, profitMargin)
Calcula preço final com margens.

**Retorna:**
```javascript
{
  costPerUnit: 0.68,              // Custo por unidade
  laborCost: 0.27,                // Custo mão de obra
  operationalCost: 0.95,          // Custo operacional
  profitMargin: 0.47,             // Margem lucro
  finalPrice: 1.43,               // Preço final
  priceForDifferentMargins: {
    margin30: 1.23,
    margin50: 1.43,
    margin75: 1.66,
    margin100: 1.90
  }
}
```

### calculateMonthlyFinancials(orders, recipes, gasPrice, laborMargin, profitMargin)
Resumo financeiro do mês.

**Retorna:**
```javascript
{
  totalRevenue: 1500.00,
  totalCost: 800.00,
  profit: 700.00,
  profitMarginPercentage: 46.67,
  totalProduction: 150,
  ordersByRecipe: {
    "Pão Francês": {
      quantity: 100,
      revenue: 150.00,
      cost: 68.00
    }
  }
}
```

---

## 🎯 Como Usar Cada Aba

### 📊 Dashboard

**O que é:**
Visão geral do negócio em um mês.

**Como usar:**
1. Crie receitas na aba "Receitas"
2. Configure preço do gás em "Precificação"
3. Registre pedidos em "Pedidos"
4. Registre vendas no "Caixa"
5. Dashboard mostrará automaticamente os dados

**Métricas importantes:**
- **Receita**: Soma de todos os pedidos entregues
- **Custo**: Baseado no custo de produção
- **Lucro**: Receita - Custo
- **Margem**: (Lucro / Receita) × 100

---

### 📦 Pedidos da Semana

**O que é:**
Registro de pedidos para acompanhamento semanal.

**Como usar:**
1. Clique "+ Novo Pedido"
2. Preencha data e nome do cliente
3. Clique "+ Adicionar Item"
4. Selecione receita, quantidade e preço
5. Defina status (pendente/entregue/cancelado)
6. Clique "Criar Pedido"

**Dicas:**
- Use "Entregue" apenas quando cliente pagar
- Adicione notas de entrega para lembrete
- Pode ter múltiplos itens por pedido

---

### 🥖 Receitas & Produtos

**O que é:**
Cadastro de suas receitas com ingredientes e custos.

**Como usar:**
1. Clique "+ Nova Receita"
2. Preencha nome e categoria
3. Coloque quantidade produzida (ex: 12 pães)
4. Registre gás utilizado em LITROS 🔥
5. Clique "+ Adicionar Ingrediente" para cada item
6. Preencha: nome, quantidade, unidade, custo

**Importante - Gás:**
- Este campo é **específico para seu fogão**
- Você precisa saber quantos litros seu fogão usa
- Use para calcular preço real do gás consumido
- Exemplo: se usa 0,45L para assar uma batelada de 12 pães

**Unidades disponíveis:**
- g (gramas)
- ml (mililitros)
- kg (quilogramas)
- l (litros)
- und (unidades)

---

### 💰 Precificação

**O que é:**
Tabela com cálculo automático de preços baseado em custos reais.

**Como usar:**
1. Clique "⚙️ Configuração"
2. Defina **Preço do Gás** (consulte sua conta de gás)
3. Defina **Margem Mão de Obra** (sugerido: 40%)
4. Defina **Margem de Lucro** (sugerido: 50%)
5. Salve

**Entendendo cada campo:**

- **Preço do Gás (R$/litro)**: Valor que você paga por litro
  - Encontra-se na sua conta de gás
  - Exemplo: R$ 12,50/litro

- **Margem Mão de Obra (%)**: Adicional pelo trabalho
  - 40% = você ganha 40% a mais sobre custo direto
  - Cobre seu tempo de trabalho

- **Margem de Lucro (%)**: Ganho da empresa
  - 50% = você ganha 50% a mais sobre custo operacional
  - Cobre riscos e reinvestimento

**Fórmula visual:**
```
Receita        = Custo Direto + Mão de Obra + Lucro
R$ 1.43        = R$ 0.68     + R$ 0.27     + R$ 0.47
100%           = 47%         + 19%         + 34%
```

**Alternativas:**
- Margens diferentes permitem experimentar
- 30% lucro = preço mais competitivo
- 100% lucro = preço premium/especial

---

### 💳 Caixa da Empresa

**O que é:**
Registro diário de entrada e saída de dinheiro.

**Como usar:**
1. Clique "+ Lançamento"
2. Escolha **Tipo**: Entrada ou Saída
3. Selecione **Categoria** (muda conforme tipo)
4. Coloque **Valor** (sempre positivo)
5. Escreva **Descrição**
6. Adicione **Notas** se necessário
7. Clique "Registrar Lançamento"

**Categorias Entrada:**
- Vendas (vendas de produtos)
- Devoluções (devolução de cliente)
- Empréstimos (dinheiro emprestado)
- Outras

**Categorias Saída:**
- Ingredientes (compra de insumos)
- Gás (reabastecimento)
- Transporte (entrega)
- Embalagem (sacolas, caixas)
- Aluguel (if applicable)
- Outros

**Filtros:**
- Filtre por tipo para ver apenas entradas/saídas
- Filtre por categoria para análise de despesa

**Saldo:**
- Atualiza em tempo real
- Entradas positivas, saídas negativas
- Resume tudo no topo

---

### 📝 Notas Financeiras

**O que é:**
Anotações sobre decisões financeiras e tarefas.

**Como usar:**
1. Clique "+ Nova Nota"
2. Preencha **Data**
3. Escolha **Prioridade**: Alta/Média/Baixa
4. Escreva **Título**
5. Detalhe no **Conteúdo**
6. Clique "Criar Nota"

**Exemplos de notas:**
- "Rever margem de Bolo de Chocolate - passou de custo"
- "Aumentar preço do Pão Francês em 10%"
- "Buscar novo fornecedor de gás mais barato"
- "Revisar produtividade da padaria"

**Prioridades:**
- 🔴 **Alta**: Afeta lucro imediatamente
- 🟡 **Média**: Importante para organização
- 🟢 **Baixa**: Informacional ou lembretes

**Workflow:**
1. Cria nota
2. Executa ação
3. Clica "✅ Concluir"
4. Nota fica com strikethrough (visual de concluído)

---

## 💡 Dicas Importantes

### 1️⃣ Primeiros Passos

1. Comece adicionando 3-5 receitas principais
2. Configure o preço do gás corretamente
3. Teste a precificação com uma receita
4. Crie alguns pedidos de exemplo
5. Registre entradas e saídas

### 2️⃣ Usando o Gás 🔥

**Como descobrir quanto gás usa:**
1. Anote o marcador do cilindro (litros)
2. Produz uma batelada
3. Anota o marcador novamente
4. Diferença = gás utilizado

**Por que importa:**
- Cada receita tem custo de gás diferente
- Forno consome mais que fogão
- Isso afeta DIRETAMENTE seu preço final

### 3️⃣ Precificação Correta

**Não cometa erros comuns:**
- ❌ Não esqueça o custo do gás
- ❌ Não esqueça mão de obra
- ❌ Não cobre menos que o custo direto
- ❌ Não ignore ingredientes secundários

**Regra de ouro:**
```
Preço Final ≥ Custo Direto + Mão de Obra
```

Se não cumprir isso, você está perdendo dinheiro!

### 4️⃣ Acompanhamento

**Diário:**
- Registre todas as vendas no Caixa
- Registre todas as despesas
- Atualize status dos pedidos

**Semanal:**
- Revise receitas mais lucrativas
- Revise receitas com baixa margem
- Considere ajustes de preço

**Mensal:**
- Use Dashboard para ver tendências
- Analise lucro por produto
- Revise notas financeiras pendentes

### 5️⃣ Backup de Dados

**Seus dados estão em localStorage:**
- Abra DevTools (F12)
- Abra Console
- Digite: `JSON.stringify(localStorage)`
- Copie tudo e salve em arquivo

**Para restaurar:**
- localStorage.setItem('bakery-store', 'seus-dados-aqui')

### 6️⃣ Dúvidas Comuns

**P: Por que meu preço está muito alto?**
R: Verifique se margem de lucro não está muito alta. Experimente 30% em vez de 50%.

**P: Como saber o preço de gás correto?**
R: Olhe na nota/conta da distribuidora. Divida preço total por litros.

**P: Posso editar receitas depois de criar pedido?**
R: Sim, mas o pedido não atualizará automaticamente. Você precisa atualizar manualmente se precisar.

**P: Meus dados desapareceram!**
R: localStorage foi limpo. Se tivesse backup, pode restaurar. Senão, terá que recriar.

**P: Posso usar em celular?**
R: Sim! O sistema é totalmente responsivo. Acesse pelo navegador.

---

## 🔐 Segurança de Dados

⚠️ **IMPORTANTE:**
- Seus dados estão apenas no seu navegador (localStorage)
- Se limpar cache, os dados são perdidos
- Não há criptografia (dados são em texto plano)
- Para dados sensíveis, use a versão com Supabase

**Recomendação:**
Faça backup semanal de seus dados!

---

## 📞 Suporte

Para dúvidas sobre o sistema, consulte:
1. Esta documentação
2. O README.md
3. Os comentários no código

Boa sorte com Eliz Bakery! 🍞✨
