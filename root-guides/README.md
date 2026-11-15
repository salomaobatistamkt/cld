# Guias de ROM leve + root — Moto G8 Power Lite e Galaxy S20 FE

Tudo organizado para fazer **depois, com calma**, um aparelho de cada vez.

```
root-guides/
├── README.md                ← você está aqui
├── comum/                   ← vale para os dois aparelhos
│   ├── PREPARAR-PC.md       ← faça primeiro
│   ├── OTIMIZACAO-RAM.md
│   ├── LOJAS-DE-APPS.md     ← Aurora Store, F-Droid, WhatsApp, backups
│   ├── backup.sh  debloat.sh  restaurar-debloat.sh  instalar-apks.sh  lib.sh
├── moto-g8-power-lite/      ← GSI (Android genérico leve) via fastboot
│   ├── README.md  DOWNLOADS.md  debloat-lista.txt
│   └── scripts/ 01-diagnostico … 05-restaurar-original
└── samsung-s20-fe/          ← LineageOS oficial via Heimdall/Odin
    ├── README.md  DOWNLOADS.md  debloat-lista.txt
    └── scripts/ 01-diagnostico … 05-restaurar-original
```

## Ordem recomendada
1. `comum/PREPARAR-PC.md`
2. No aparelho escolhido: **diagnóstico → backup → debloat**. Use alguns dias.
3. Só se ainda travar: **desbloqueio → ROM → lojas → (root opcional)**.

## Por que não um "sistema operacional Linux do zero"?
WhatsApp, Instagram e Facebook só existem para Android. Um Linux puro (postmarketOS, Ubuntu Touch)
não os roda de forma nativa, e emular Android lá dentro (Waydroid) consome a RAM que queremos economizar.
O Android já usa kernel Linux. A solução mais leve e compatível é um **Android limpo** (GSI/LineageOS).

## Regras de segurança
- Os scripts **perguntam antes** de qualquer ação destrutiva (é preciso digitar `SIM`).
- O debloat roda primeiro em **modo simulação**.
- ROMs, firmwares e APKs **não ficam no repositório** (pasta `arquivos/`, ignorada pelo git):
  baixe-os na hora, porque dependem do modelo exato e da versão.
- Bateria > 60%, cabo de dados bom, não desconecte durante gravações.
