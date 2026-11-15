# Samsung Galaxy S20 FE — passo a passo completo

**Objetivo:** trocar o One UI pelo **LineageOS** (Android limpo e leve, com suporte oficial ou build
mais recente oficial) + lojas de apps. Se preferir não arriscar: só as etapas 1–3.

> ⚠️ **Diferença importante em relação ao Motorola:** no Samsung, desbloquear queima o **Knox**
> para sempre (eFuse). Mesmo voltando ao original: **Samsung Pay/Wallet, Pasta Segura e Samsung
> Health** podem não funcionar nunca mais, e a garantia acaba.

## Visão geral
| Etapa | O que faz | Risco | Apaga dados? | Script |
|---|---|---|---|---|
| 0 | Preparar PC | nenhum | não | `../comum/PREPARAR-PC.md` |
| 1 | Diagnóstico | nenhum | não | `scripts/01-diagnostico.sh` |
| 2 | Backup | nenhum | não | `../comum/backup.sh` (+ Samsung Smart Switch no PC) |
| 3 | Debloat sem root (**teste primeiro**) | muito baixo | não | `../comum/debloat.sh debloat-lista.txt` |
| 4 | Desbloquear bootloader | médio, Knox permanente | **SIM** | `scripts/02-preparar-desbloqueio.sh` |
| 5 | Instalar LineageOS | médio | **SIM** | `scripts/03-instalar-lineage.sh arquivos/` |
| 6 | Lojas de apps + otimização | baixo | não | `../comum/instalar-apks.sh` |
| 7 | Root Magisk (opcional) | médio | não | `scripts/04-root-magisk.sh` |
| — | Voltar ao One UI | — | SIM | `scripts/05-restaurar-original.sh` (instruções Odin) |

Rode tudo **de dentro desta pasta** (`root-guides/samsung-s20-fe`).

## Etapa 1 — Diagnóstico
```bash
bash scripts/01-diagnostico.sh
```
Define o codinome (**r8s** = Exynos SM-G780F; **r8q** = Snapdragon SM-G780G/G781B).
Modelos americanos de operadora (G781U/V/W) **não desbloqueiam**: pare aqui.

## Etapa 2 — Backup
`bash ../comum/backup.sh` + **Samsung Smart Switch** no PC (backup completo de apps e configurações
para restaurar no One UI) + backup do WhatsApp pelo app.

## Etapa 3 — Debloat (sem root)
```bash
bash ../comum/debloat.sh debloat-lista.txt
bash ../comum/debloat.sh debloat-lista.txt --aplicar
adb reboot
```
Depois: `../comum/OTIMIZACAO-RAM.md`. Se resolver, **pare aqui**.

## Etapa 4 — Desbloquear o bootloader
1. Atualize o celular para o **Android 13 mais recente** (Configurações → Atualização de software).
   O LineageOS exige essa base de firmware.
2. `bash scripts/02-preparar-desbloqueio.sh` e siga a tela.
3. **"Desbloqueio de OEM" não aparece?** É o bloqueio KG ("Prenormal"): fique com o celular
   conectado à internet, com data/hora automáticas, e procure atualizações. Pode levar alguns dias para liberar.
4. Depois de desbloquear, configure o celular **com internet** e confirme nas Opções do desenvolvedor
   que o "Desbloqueio de OEM" continua ativo. Se o KG voltar a bloquear, não grave nada ainda.

## Etapa 5 — Instalar o LineageOS
1. Baixe da página do seu codinome (`DOWNLOADS.md`) para `arquivos/`:
   `recovery.img`, `lineage-XX-...-r8q(ou r8s).zip`, e `vbmeta.img`/`dtbo.img` **se o wiki pedir**.
   Opcional: `MindTheGapps-XX-arm64-....zip` (mesma versão Android).
2. Instale o Heimdall e rode:
   ```bash
   bash scripts/03-instalar-lineage.sh arquivos/
   ```
   O script grava o recovery e guia: **sair do modo Download direto para o recovery** (passo crítico),
   formatar os dados, enviar o LineageOS e o MindTheGapps por `adb sideload`.
3. **Alternativa com Odin (Windows):** compacte o recovery em `.tar`
   (`tar -cvf recovery.tar recovery.img` e o vbmeta junto, se precisar), abra o Odin,
   **desmarque "Auto Reboot"** em Options, coloque o `.tar` em **AP**, clique Start.
   Depois faça os mesmos passos do recovery (VOL− + POWER, depois VOL+ + POWER).
4. Primeiro boot: até 10 min. Teste chamada, 4G/5G, Wi‑Fi, câmera, digital, NFC.

## Etapa 6 — Lojas e apps
```bash
bash ../comum/instalar-apks.sh arquivos/apks
```
Ver `../comum/LOJAS-DE-APPS.md`. No S20 FE você pode usar WhatsApp/Instagram/Facebook **completos**
(6 GB de RAM são suficientes). Versões Lite são opcionais.

## Etapa 7 — Root (opcional)
`bash scripts/04-root-magisk.sh arquivos/Magisk-vXX.apk`

## Se der errado
| Sintoma | Solução |
|---|---|
| Ligou no One UI e não no recovery do LineageOS | A Samsung sobrescreveu o recovery: grave de novo e saia do modo Download **direto** para o recovery. |
| "Only official released binaries are allowed" | KG/RMM bloqueado: volte ao firmware oficial e aguarde o desbloqueio de OEM liberar (etapa 4). |
| Bootloop | Recovery → Factory Reset → Format data; reenvie o zip. Confira se o firmware base é Android 13. |
| Quero o One UI de volta | `bash scripts/05-restaurar-original.sh` (Odin + firmware Bifrost). |
