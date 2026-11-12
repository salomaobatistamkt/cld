# 01 · Decisões tomadas e pendentes

Com a aprovação da análise, o desenvolvimento começou. Quatro das seis perguntas abertas ainda não tinham resposta. Nesses casos, segui a recomendação da análise. Tudo abaixo pode ser trocado sem reescrever o sistema.

## Tomadas (podem ser revistas)

| Tema | Decisão | Por quê | Como mudar |
|---|---|---|---|
| Ordem | Central de achadinhos primeiro, portal de planejamento sobre o mesmo motor | Valida receita com menos risco | — |
| Hospedagem da aplicação | Cloudflare Workers + arquivos estáticos | Você já usa Cloudflare; custo baixo; borda global | `wrangler.toml` |
| Banco | Cloudflare D1 (SQLite gerenciado) | Zero servidor extra no MVP; SQL padrão | Migração para Postgres (VPS ou Supabase) prevista em `02-arquitetura.md` |
| Orquestração | n8n chamando endpoints HTTP dos jobs | Aproveita seu n8n; lógica fica versionada no código | `n8n/*.json` |
| Fonte de preços | Travelpayouts · Aviasales Data API | Única fonte aberta a afiliados hoje (Amadeus Self-Service encerrado, Kiwi só por convite) | `src/adapters/` |
| WhatsApp | Só meios oficiais. Canal com publicação assistida; API oficial quando aprovada | Ferramentas não oficiais violam os termos e arriscam banimento | — |
| Globo | Canvas 2D + d3-geo (leve). MapLibre GL como evolução | Desempenho em celulares modestos | `public/js/globe.js` |
| Autenticação do painel | Token único no MVP; Cloudflare Access na produção | Simples agora, robusto depois | `10-deploy-cloudflare.md` |
| Nome | **Meridia (provisório)** | Era o favorito da análise | Ajustes do painel e HTML |
| Repositório | Pasta `plataforma/` neste repositório, no branch de desenvolvimento | Única permissão de escrita disponível nesta sessão | Mover para repositório próprio é só copiar a pasta |

## Pendentes: preciso de você

1. **Conta Travelpayouts**: cadastro, conexão ao programa Aviasales, **token** e **marker**. Sem isso não há preço real automático.
2. **Bot do Telegram**: criar com o @BotFather, adicionar como administrador do canal e informar o **token**.
3. **IDs de afiliado**: Booking.com e Rentcars (via Awin). Cadastre em *Painel → Parceiros*.
4. **CNPJ**: alguns programas exigem pessoa jurídica para pagar comissões.
5. **Domínio** na Cloudflare para publicar.
6. **Nome final** da marca, depois da checagem no INPI e de domínio.
7. **Confirmar o n8n**: versão, URL e se roda na VPS via Portainer.
