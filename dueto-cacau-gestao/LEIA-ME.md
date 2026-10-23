# Dueto CaCau · Gestão

Sistema de gestão da confeitaria: receitas (inclusive por tópicos), insumos, precificação, pedidos, tarefas e caixa.

## Rodar no computador
    npm install
    APP_PASSWORD=suasenha npm run dev      # abre em http://localhost:3000

Os dados ficam em `./dados/estado.json`.

## Publicar com Coolify (Dockerfile)
- Build pack: Dockerfile · Base directory: `/dueto-cacau-gestao` · Porta: `80`
- Variável de ambiente obrigatória: `APP_PASSWORD` (senha de acesso, mínimo 4 caracteres)
- Armazenamento persistente: montar um volume em `/data` (é onde ficam os dados)

Sem `APP_PASSWORD` o sistema recusa qualquer acesso. Sem o volume em `/data`, os dados se perdem a cada novo deploy.

## Testes da lógica de preço
    npm test
