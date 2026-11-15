# Moto G8 Power Lite — passo a passo completo

**Aparelho:** XT2055 (‑1, ‑2, ‑3, ‑4…), codinome *blackjack*, MediaTek Helio P35, 4 GB RAM, Android 9 de fábrica.
**Objetivo:** trocar o sistema pesado da Motorola por um Android genérico leve (GSI) + lojas de apps.

> ⚠️ **Confirme o modelo antes:** Configurações → Sobre o telefone → Modelo deve começar com **XT2055**.
> Se for outro número, **pare** e me avise: os arquivos mudam.

## Visão geral (cada etapa é independente — pare onde quiser)
| Etapa | O que faz | Risco | Apaga dados? | Script |
|---|---|---|---|---|
| 0 | Preparar PC | nenhum | não | `../comum/PREPARAR-PC.md` |
| 1 | Diagnóstico | nenhum | não | `scripts/01-diagnostico.sh` |
| 2 | Backup | nenhum | não | `../comum/backup.sh` |
| 3 | Debloat sem root (**teste isto primeiro**) | muito baixo, reversível | não | `../comum/debloat.sh debloat-lista.txt` |
| 4 | Desbloquear bootloader | médio | **SIM** | `scripts/02-desbloquear-bootloader.sh` |
| 5 | Instalar GSI leve | médio/alto | **SIM** | `scripts/03-instalar-gsi.sh` |
| 6 | Lojas de apps + otimização | baixo | não | `../comum/instalar-apks.sh` |
| 7 | Root Magisk (opcional) | médio | não | `scripts/04-root-magisk.sh` |
| — | Voltar ao original | — | SIM | `scripts/05-restaurar-original.sh` ou LMSA |

Todos os comandos abaixo são rodados **de dentro desta pasta** (`root-guides/moto-g8-power-lite`).

---

## Etapa 0 — Preparar o PC
Siga `../comum/PREPARAR-PC.md` (adb/fastboot, drivers, Depuração USB).

## Etapa 1 — Diagnóstico
```bash
bash scripts/01-diagnostico.sh
```
Anote: **arquitetura** (arm64/arm32), **tipo** (A/B, A-only SAR, A-only antigo), **vndklite**.
Isso define qual GSI baixar em `DOWNLOADS.md`.

## Etapa 2 — Backup
```bash
bash ../comum/backup.sh
```
E manualmente: WhatsApp → Configurações → Conversas → **Backup**. Confira contatos na conta Google.

## Etapa 3 — Debloat sem root (faça e use alguns dias antes de decidir pelo root)
```bash
bash ../comum/debloat.sh debloat-lista.txt            # mostra o que sairia
bash ../comum/debloat.sh debloat-lista.txt --aplicar  # remove
adb reboot
```
Depois aplique as dicas de `../comum/OTIMIZACAO-RAM.md` e instale **Facebook Lite / Instagram Lite**.
Se o celular ficar bom, **não precisa seguir adiante**. Para desfazer: `bash ../comum/restaurar-debloat.sh debloat-removidos-*.txt`.

## Etapa 4 — Desbloquear o bootloader (APAGA TUDO)
1. Opções do desenvolvedor → ative **Desbloqueio de OEM** (se estiver cinza/indisponível, o aparelho
   é de operadora bloqueada e **não dá para continuar**).
2. Crie conta no site de desbloqueio da Motorola (link em `DOWNLOADS.md`).
3. Rode:
   ```bash
   bash scripts/02-desbloquear-bootloader.sh
   ```
   O script reinicia no bootloader, mostra o código, você cola no site, recebe a **chave por e-mail**
   e cola de volta no script. Confirme na tela do celular (volume para escolher, power para confirmar).
4. Vai aparecer um aviso "bootloader desbloqueado" a cada boot — é normal.

## Etapa 5 — Instalar a GSI (sistema novo)
1. Baixe o **firmware original** do seu modelo (mesma versão que estava no celular) e extraia.
   Copie `vbmeta.img` e `boot.img` para `arquivos/`.
2. Baixe a GSI escolhida (tabela em `DOWNLOADS.md`) e **descompacte** o `.xz` (7-Zip no Windows,
   `xz -d arquivo.img.xz` no Linux/Mac).
3. Rode:
   ```bash
   bash scripts/03-instalar-gsi.sh arquivos/<gsi>.img arquivos/vbmeta.img
   ```
4. Primeiro boot: até 10 min. Configure o básico e teste: **chamada, SMS, 4G, Wi‑Fi, Bluetooth,
   câmera, áudio no fone, GPS**.
5. Bugs? Nas GSIs do phh/TrebleDroid existe o menu **Configurações → Phh Treble Settings** com
   correções específicas para MediaTek (áudio, brilho, câmera). Teste as opções "MediaTek".

## Etapa 6 — Lojas de apps e otimização
```bash
mkdir -p arquivos/apks   # coloque aqui Aurora Store, F-Droid, etc.
bash ../comum/instalar-apks.sh arquivos/apks
```
Na Aurora Store instale: **WhatsApp, Instagram Lite, Facebook Lite**, e o que mais usar.
Veja `../comum/LOJAS-DE-APPS.md` (restaurar backup do WhatsApp) e `../comum/OTIMIZACAO-RAM.md`.

## Etapa 7 — Root com Magisk (opcional)
1. Instale o Magisk APK (`instalar-apks.sh`).
2. Copie o `boot.img` do firmware original: `adb push arquivos/boot.img /sdcard/Download/`
3. No app Magisk: **Instalar → Selecionar e corrigir um arquivo → boot.img**.
4. `bash scripts/04-root-magisk.sh`

---

## Se der errado
| Sintoma | Solução |
|---|---|
| Fica no logo > 15 min (bootloop) | Desligue (segure power + volume ‑ 10 s), entre no bootloader (power + volume ‑), rode de novo `fastboot -w` e `fastboot reboot`. Persistindo: GSI incompatível → tente outra versão/variante (vndklite, Android 12). |
| `fastboot flash system` dá erro de tamanho | GSI grande demais para a partição: use variante **vanilla/bvN** (sem Google) ou uma versão de Android anterior. |
| Sem sinal/chamadas | Phh Treble Settings → opções IMS/MediaTek; ou volte para Android 12. |
| Quero o sistema original de volta | **LMSA** (Lenovo Rescue and Smart Assistant) → "Software Fix" (automático), ou `bash scripts/05-restaurar-original.sh <pasta-do-firmware>`. |
| Banco não abre | Bootloader desbloqueado é detectado por alguns bancos. Volte ao original e rebloqueie (`fastboot oem lock` **só** com firmware original instalado). |

> **Nunca** rode `fastboot oem lock` com GSI ou root instalados: o aparelho pode não ligar mais.
