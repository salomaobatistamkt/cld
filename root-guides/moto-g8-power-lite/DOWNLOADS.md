# Downloads — Moto G8 Power Lite (XT2055, codinome *blackjack*, MediaTek Helio P35, 4 GB RAM)

> Salve tudo em `moto-g8-power-lite/arquivos/` (pasta ignorada pelo git).
> **Só baixe a GSI depois de rodar `scripts/01-diagnostico.sh`** — ele diz qual variante serve.

## Checklist
| ✓ | Item | Para quê | Onde (fonte oficial) |
|---|---|---|---|
| ☐ | Platform Tools (adb/fastboot) | Comandos | https://developer.android.com/tools/releases/platform-tools |
| ☐ | Drivers Motorola (Windows) | Reconhecer o celular | Site de suporte Motorola → "Motorola Device Manager" |
| ☐ | **Chave de desbloqueio** | Etapa 2 | Site oficial: https://en-us.support.motorola.com/app/standalone/bootloader/unlock-your-device-a |
| ☐ | **Firmware original do SEU modelo** (mesma versão do celular) | Tirar `vbmeta.img`/`boot.img` e salvar o aparelho se der errado | LMSA (Lenovo Rescue and Smart Assistant, oficial) ou espelho https://mirrors.lolinet.com/firmware/lenomola/ (procure por "blackjack") |
| ☐ | **GSI** (escolha UMA, ver tabela abaixo) | O novo sistema | Ver abaixo |
| ☐ | Aurora Store APK | Loja (apps da Play sem conta) | https://auroraoss.com |
| ☐ | F-Droid APK | Loja de apps livres | https://f-droid.org |
| ☐ | Magisk APK (opcional) | Root | https://github.com/topjohnwu/Magisk/releases |

## Qual GSI baixar
| Resultado do diagnóstico | GSI recomendada | Arquivo a procurar |
|---|---|---|
| arm64 + system-as-root ou A/B | **TrebleDroid (AOSP puro, mais leve)** — https://github.com/TrebleDroid/treble_experimentations/releases | `system-td-arm64-ab-vanilla.img.xz` (sem Google) ou `...-gapps.img.xz` |
| arm64 + system-as-root ou A/B | **LineageOS GSI (AndyYan)** — https://sourceforge.net/projects/andyyan-gsi/files/ | `lineage-2x.x-...-arm64_bvN.img.xz` (`bvN` = sem Google; `bgN` = com Google) |
| arm32 / binder64 | Mesmos projetos, variante `a64` / `arm32_binder64` | `...-a64-ab-...` |
| A-only antigo (não SAR) | GSIs antigas (Android 10/11 "aonly") do phh — https://github.com/phhusson/treble_experimentations/releases | `system-quack-arm64-aonly-...` |
| `vndk.lite = true` | Variante **vndklite** do mesmo projeto | `...-vndklite.img.xz` |

### Qual versão de Android?
O aparelho saiu com **Android 9/10 de fábrica** (vendor antigo). GSIs muito novas podem ter bugs
(câmera, Bluetooth, chamadas). Ordem sugerida de teste:
1. **Android 12 / 12L** (LineageOS 19.1 GSI) — melhor equilíbrio leveza × compatibilidade.
2. **Android 13** (LineageOS 20 GSI / TrebleDroid) — se o 12 funcionar bem e você quiser mais novo.
3. Evite Android 14+ neste aparelho, a não ser que relatos no XDA confirmem que funciona.

### Google: com ou sem?
- Variante **com Google** (`gapps`/`bgN`): mais simples, WhatsApp com notificação e backup do Drive.
- Variante **sem Google** (`vanilla`/`bvN`) + Aurora Store: mais RAM livre; notificações do
  WhatsApp podem atrasar. Melhor opção para "máximo de RAM".

## Fóruns para consultar relatos do aparelho
- XDA Developers — busque "Moto G8 Power Lite" / "blackjack" / "XT2055 GSI".
- Lista de compatibilidade de GSIs: https://github.com/phhusson/treble_experimentations/wiki
