# 🍞 GUIA RÁPIDO - ELIZ BAKERY SYSTEM

## ✅ Checklist de Instalação

### 1. Preparação Local
```bash
# Acesse a pasta do projeto
cd eliz-bakery-system

# Instale dependências
npm install

# Teste localmente
npm run dev
# Acesse http://localhost:3000
```

### 2. Prepare para GitHub
```bash
# Inicialize git
git init

# Adicione todos os arquivos
git add .

# Crie commit inicial
git commit -m "Initial commit: Eliz Bakery System"
```

### 3. Crie Repositório GitHub
1. Acesse **github.com**
2. Clique em **"New"** (criar novo repositório)
3. Nome: `eliz-bakery-system`
4. Descrição: "Sistema de Gerenciamento de Padaria"
5. Deixe **Public** (para Vercel)
6. Clique **"Create repository"**

### 4. Conecte ao GitHub
```bash
# Adicione remote (copie do GitHub)
git remote add origin https://github.com/SEU-USUARIO/eliz-bakery-system.git

# Envie o código
git branch -M main
git push -u origin main
```

### 5. Deploy no Vercel
1. Acesse **vercel.com**
2. Clique **"New Project"**
3. Clique **"Import Git Repository"**
4. Selecione seu repositório
5. Clique **"Deploy"**
6. Aguarde (leva 2-3 minutos)
7. Seu app estará em `https://eliz-bakery-system.vercel.app`

---

## 🎯 Primeiros Passos no App

### Passo 1: Configure o Gás 💰
1. Acesse aba **"💰 Precificação"**
2. Clique **"⚙️ Configuração"**
3. Coloque **Preço do Gás** (consulte sua conta)
   - Exemplo: R$ 12,50/litro
4. Deixe as margens padrão (40% e 50%)

### Passo 2: Adicione Receitas 🥖
1. Acesse aba **"🥖 Receitas"**
2. Clique **"+ Nova Receita"**
3. Preencha:
   - **Nome**: Pão Francês
   - **Categoria**: Pão
   - **Quantidade**: 12 (unidades)
   - **Gás Utilizado**: 0.45 (litros) 🔥
   - **Tempo**: 45 (minutos)
4. Clique **"+ Adicionar Ingrediente"**
5. Adicione:
   - Farinha: 500g - R$ 2,50
   - Sal: 10g - R$ 0,20
   - Fermento: 5g - R$ 0,50
   - Água: 300ml - R$ 0,30
6. Clique **"Criar Receita"**

### Passo 3: Veja Preço Sugerido 💵
1. Acesse aba **"💰 Precificação"**
2. Encontre "Pão Francês"
3. Veja o **"Preço Final Sugerido"**
   - Deve estar em torno de **R$ 1,40-1,50**

### Passo 4: Crie Pedido 📦
1. Acesse aba **"📦 Pedidos"**
2. Clique **"+ Novo Pedido"**
3. Preencha:
   - **Data**: hoje
   - **Cliente**: "Seu Nome"
   - **Status**: entregue (se já vendeu)
4. Clique **"+ Adicionar Item"**
5. Adicione:
   - Receita: Pão Francês
   - Quantidade: 12
   - Preço: 1,50 (preço sugerido)
6. Clique **"Criar Pedido"**

### Passo 5: Registre Caixa 💳
1. Acesse aba **"💳 Caixa"**
2. Clique **"+ Lançamento"**
3. **ENTRADA:**
   - Tipo: Entrada
   - Categoria: Vendas
   - Valor: 18,00 (12 × 1,50)
   - Descrição: Venda pão francês
4. Clique **"Registrar Lançamento"**

5. **SAÍDA:**
   - Tipo: Saída
   - Categoria: Ingredientes
   - Valor: 3,50 (custo total ingredientes)
   - Descrição: Compra farinha, sal, fermento

6. **SAÍDA GÁS:**
   - Tipo: Saída
   - Categoria: Gás
   - Valor: 5,63 (0,45L × 12,50)
   - Descrição: Gás fogão

### Passo 6: Veja Dashboard 📊
1. Acesse aba **"📊 Dashboard"**
2. Veja os KPIs:
   - **Receita Mensal**: R$ 18,00
   - **Custo Total**: R$ 9,13
   - **Lucro Bruto**: R$ 8,87
   - **Margem**: 49%

---

## 🔥 Entendendo o Gás

### Por que Gás é Importante?

Ele afeta DIRETAMENTE seu preço final!

**Exemplo sem considerar gás:**
- Ingredientes: R$ 3,50
- Sem gás: Preço = R$ 1,05/pão

**Exemplo CORRETO com gás:**
- Ingredientes: R$ 3,50
- Gás: R$ 5,63
- **Total: R$ 9,13**
- Com gás: Preço = R$ 1,43/pão
- **Diferença: +R$ 0,38 por pão!**

### Como Medir Gás do Seu Fogão

1. Anote o marcador/litros do cilindro
2. Asse uma batelada (ex: 12 pães)
3. Anote o marcador/litros novamente
4. **Diferença = gás utilizado**

Exemplo:
- Antes: 13.5 L
- Depois: 13.05 L
- Utilizou: 0.45 L

---

## 💾 Mantendo Backup

**Semanal:**
```
1. DevTools (F12)
2. Console tab
3. Cole: JSON.stringify(localStorage)
4. Copie resultado
5. Salve em arquivo de texto (.txt)
```

**Restaurar:**
```
1. DevTools (F12)
2. Console
3. localStorage.setItem('bakery-store', 'seus-dados-aqui')
4. Recarregue página
```

---

## 🎨 Sua Paleta de Cores

- **Azul**: #488399 (primário)
- **Rosa**: #EA9393 (destaque)
- **Amarelo**: #F4D38A (secundário)
- **Rosa Pastel**: #F1BEBE (suave)
- **Cinza**: #D8D8D8 (neutro)

Use essa paleta em:
- Embalagens
- Rótulos
- Material de marketing
- Mantém identidade visual

---

## 📱 Acessar em Celular

1. Acesse vercel-app-url.com pelo navegador do celular
2. Clique menu (⋯) → "Adicionar à tela inicial"
3. Funciona como app nativo
4. Todos os dados salvos localmente

---

## ❓ Dúvidas Frequentes

**P: Meu gás está em KG, não em L?**
R: 1 KG GLP ≈ 2 Litros. Multiplique por 2 se em KG.

**P: Posso mudar preço do gás depois?**
R: Sim! Va em Precificação → Configuração → mude valor.

**P: Como atualizar sistema quando tiver novas features?**
R: Entre no código, faça mudanças, git push, e Vercel atualiza automaticamente.

**P: Perdi dados! Como recupero?**
R: Restaure do backup seguindo instruções acima. Sem backup = dados perdidos.

**P: Como compartilhar com sócio/empregado?**
R: Compartilhe o link vercel. Cada um tem dados locais separados.

---

## 🚀 Próximos Passos

✅ Sistema funcionando
✅ Dados sendo registrados
✅ Backup feito

**Depois:**
1. Monitore precificação por 1-2 meses
2. Ajuste margens conforme necessário
3. Crie rotina de entrada de dados
4. Faça backup toda semana
5. Revise Dashboard mensalmente

---

## 📞 Precisa de Ajuda?

1. Releia este guia
2. Veja a DOCUMENTACAO.md completa
3. Consulte README.md
4. Verifique o código dos componentes

**Desenvolvido com ❤️ para Elizandra**
