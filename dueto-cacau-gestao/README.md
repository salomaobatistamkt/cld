# 🍞 Eliz Bakery System

Sistema completo de gerenciamento para padaria desenvolvido em Next.js com armazenamento local (localStorage).

## 🎯 Funcionalidades

### 📊 Dashboard
- Resumo mensal com KPIs principais
- Gráficos de receita, custo e lucro
- Fluxo de caixa em tempo real
- Estatísticas de produção

### 📦 Pedidos da Semana
- Criar, editar e deletar pedidos
- Acompanhamento de status (pendente, entregue, cancelado)
- Total de vendas por pedido
- Notas de entrega

### 🥖 Receitas & Produtos
- Cadastro completo de receitas
- Listagem de ingredientes com custos
- Rastreamento de gás utilizado (fogão específico)
- Tempo de produção por receita

### 💰 Precificação
- **Cálculo automático de preço** baseado em:
  1. Custo de ingredientes
  2. Custo de gás por receita
  3. Margem de mão de obra
  4. Margem de lucro
- Simulação de diferentes margens de lucro (30%, 50%, 75%, 100%)
- Visualização detalhada de cada componente de preço

### 💳 Caixa da Empresa
- Registro de entradas e saídas
- Categorização por tipo de despesa
- Saldo em tempo real
- Filtros por tipo e categoria

### 📝 Notas Financeiras
- Criação de notas com prioridade
- Rastreamento de tarefas financeiras
- Status de conclusão
- Histórico completo

## 🎨 Paleta de Cores

```
- Azul Petróleo: #488399
- Rosa Coral: #EA9393
- Amarelo Suave: #F4D38A
- Rosa Pastel: #F1BEBE
- Cinza Claro: #D8D8D8
```

## 🚀 Como Usar

### Instalação Local

```bash
# Clone o repositório
git clone <seu-repo>

# Instale as dependências
npm install

# Execute em desenvolvimento
npm run dev

# Acesse http://localhost:3000
```

### Deploy no Vercel

1. **Prepare o repositório**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Crie repositório no GitHub**
   - Acesse github.com e crie um novo repositório
   - Adicione como remote:
   ```bash
   git remote add origin <seu-url-github>
   git branch -M main
   git push -u origin main
   ```

3. **Deploy no Vercel**
   - Acesse vercel.com
   - Clique em "New Project"
   - Selecione seu repositório GitHub
   - Vercel detectará automaticamente que é Next.js
   - Clique em "Deploy"

### Variáveis de Ambiente (Opcional)
Se quiser integrar com Supabase no futuro, crie um arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave
```

## 📊 Como a Precificação Funciona

### Estrutura de Cálculo

1. **Custo de Ingredientes (R$)**
   - Soma do custo de todos os ingredientes

2. **Custo de Gás (R$)** 🔥
   - Litros usados × Preço por litro
   - Específico para seu fogão

3. **Custo Direto Total (R$)**
   - Ingredientes + Gás

4. **Custo por Unidade (R$)**
   - Custo Total ÷ Quantidade Produzida

5. **Margem de Mão de Obra (R$)**
   - Custo Unitário × Margem Configurada (padrão: 40%)

6. **Custo Operacional (R$)**
   - Unitário + Mão de Obra

7. **Preço Final (R$)**
   - Custo Operacional × (1 + Margem de Lucro - padrão: 50%)

### Exemplo Prático

**Receita: Pão Francês**
- Ingredientes: R$ 2,50
- Gás: R$ 5,63 (0,45L × R$ 12,50)
- Total: R$ 8,13
- Rende: 12 unidades
- Custo por pão: R$ 0,68
- Mão de obra (40%): R$ 0,27
- Operacional: R$ 0,95
- **Preço final (50% lucro): R$ 1,43**

## 💾 Armazenamento de Dados

Os dados são armazenados localmente no navegador usando localStorage. Você pode:

### Fazer Backup
1. Abra o DevTools (F12)
2. Console > Digite: `localStorage.getItem('bakery-store')`
3. Copie os dados e salve em um arquivo

### Restaurar Backup
1. Console > Digite: `localStorage.setItem('bakery-store', 'seus-dados-aqui')`
2. Recarregue a página

## 🔄 Próximas Melhorias

- [ ] Integração com Supabase para backup na nuvem
- [ ] Gráficos mais avançados
- [ ] Relatório PDF exportável
- [ ] Integração com WhatsApp/Telegram
- [ ] APP mobile
- [ ] Integração com banco de dados

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14
- **Estilização**: Tailwind CSS
- **Estado**: Zustand
- **Gráficos**: Recharts
- **Data**: date-fns
- **Hospedagem**: Vercel

## 📝 Licença

Este projeto é de código aberto e pode ser usado livremente.

## 🤝 Suporte

Para dúvidas ou sugestões, entre em contato!

---

**Desenvolvido com ❤️ para Eliz Bakery**
