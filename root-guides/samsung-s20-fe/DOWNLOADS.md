# Downloads — Samsung Galaxy S20 FE

> Salve tudo em `samsung-s20-fe/arquivos/` (pasta ignorada pelo git).
> **Rode `scripts/01-diagnostico.sh` primeiro** para saber se o seu é **r8s** (Exynos) ou **r8q** (Snapdragon).

| Modelo | Chip | Codinome | Página oficial LineageOS |
|---|---|---|---|
| SM-G780F (Brasil 2020) | Exynos 990 | **r8s** | https://wiki.lineageos.org/devices/r8s/ |
| SM-G780G (Brasil 2021) | Snapdragon 865 4G | **r8q** | https://wiki.lineageos.org/devices/r8q/ |
| SM-G781B (5G) | Snapdragon 865 5G | **r8q** | https://wiki.lineageos.org/devices/r8q/ |

> Segundo o wiki, o r8q **não recebe mais builds oficiais** (a última versão listada é a 23.0 / Android 16).
> O último build continua para baixar e funciona. Confira o status atual do r8s na página dele.
> **Antes de instalar, leia a página "Install" do seu codinome no wiki** e confira se ela pede, além do
> `recovery.img`, os arquivos `vbmeta.img` e/ou `dtbo.img`. O script usa o que estiver na pasta.

## Checklist
| ✓ | Item | Onde |
|---|---|---|
| ☐ | Platform Tools (adb) | https://developer.android.com/tools/releases/platform-tools |
| ☐ | Samsung USB Driver (Windows) | developer.samsung.com → Android USB Driver |
| ☐ | **Heimdall** (Linux/Mac/Windows) | https://git.sr.ht/~grimler/Heimdall (ou o pacote `heimdall-flash` do seu Linux) |
| ☐ | **Odin** (só Windows, para restaurar o original) | Distribuído não oficialmente. Use a versão indicada no wiki do LineageOS. |
| ☐ | **Firmware oficial Samsung** (para atualizar o Android 13 e restaurar) | **Bifrost**: https://github.com/zacharee/SamloaderKotlin (baixa direto dos servidores Samsung) |
| ☐ | `recovery.img` + `lineage-*.zip` (+ `vbmeta.img`/`dtbo.img` se o wiki pedir) | https://download.lineageos.org/devices/r8q (ou `/r8s`) |
| ☐ | MindTheGapps (opcional: Play Store) — **mesma versão de Android do LineageOS**, arm64 | https://wiki.lineageos.org/gapps |
| ☐ | Aurora Store / F-Droid | https://auroraoss.com · https://f-droid.org |
| ☐ | Magisk (opcional) | https://github.com/topjohnwu/Magisk/releases |

## Alternativa sem trocar o sistema
O S20 FE tem 6 GB de RAM e um chip forte. Muitas vezes o **debloat + otimização** no One UI já
resolve os travamentos (`debloat-lista.txt`). O modelo **Exynos (G780F)** tem problemas
conhecidos de aquecimento: ative o **modo de economia de energia leve**/"Desempenho otimizado"
e evite capinhas grossas.
