# Otimização de RAM e desempenho (vale para os dois aparelhos)

## Sem root
| Ação | Onde | Ganho |
|---|---|---|
| Escala de animação = 0,5x ou desligada (3 opções) | Opções do desenvolvedor | Sensação de fluidez |
| Limite de processos em segundo plano = "No máximo 3" | Opções do desenvolvedor | RAM livre (pode atrasar notificações de apps limitados) |
| Remover bloatware via ADB | `scripts/03-debloat.sh` | 200–600 MB de RAM |
| Facebook Lite, Instagram Lite, Messenger Lite | Aurora Store / Play | Muito menos RAM |
| Launcher leve (Lawnchair, KISS Launcher) | F-Droid / Play | RAM e fluidez |
| Navegador leve (Bromite/Cromite, Fennec) | F-Droid / GitHub | RAM |
| Remover widgets animados e papel de parede animado | Tela inicial | CPU/RAM |

## Com ROM custom (LineageOS / GSI)
- **zRAM** (compressão de RAM): LineageOS já vem com zRAM ativo. Ver o status com
  `adb shell cat /proc/swaps`.
- Instale **só** o mínimo do Google: MindTheGapps (Play Store + serviços) ou **microG** (mais leve).
- Sem Google nenhum = máximo de RAM, mas o WhatsApp/Instagram podem atrasar notificações.
  Recomendado para o Moto: **microG** ou **MindTheGapps**, nunca GApps "full".

## Com root (Magisk) — opcional
- Não instale módulos "milagrosos" de "boost de RAM": a maioria piora a estabilidade.
- Úteis e seguros: nenhum é obrigatório. Se quiser algum, prefira os mantidos ativamente no GitHub.
