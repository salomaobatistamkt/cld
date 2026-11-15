#!/usr/bin/env bash
# Guia interativo do desbloqueio do bootloader Samsung. APAGA TUDO. (Desbloqueio é feito nos botões do celular.)
source "$(dirname "$0")/../../comum/lib.sh"
precisa adb
confirmar "Desbloquear APAGA TODOS OS DADOS e queima o Knox PERMANENTEMENTE (Samsung Pay/Wallet, Pasta Segura e Samsung Health podem parar para sempre). Continuar?"
cat <<'TXT'

1) No celular: Opções do desenvolvedor → ative "Desbloqueio de OEM" → confirme.
   (Se a opção não aparecer: conecte ao Wi‑Fi, aguarde/atualize o sistema; ver README.)
2) Vou desligar o celular agora. Quando apagar a tela:
   - Segure VOLUME + e VOLUME − juntos e conecte o cabo USB no PC.
   - Na tela azul/verde de aviso: SEGURE "volume +" para entrar no modo de desbloqueio.
   - Pressione "volume +" para confirmar o desbloqueio. O celular apaga tudo e reinicia.
3) Configure o celular rapidamente (CONECTADO À INTERNET), ative de novo as Opções do desenvolvedor
   e confira que "Desbloqueio de OEM" aparece ativado e cinza ("bootloader já desbloqueado").
TXT
read -r -p "ENTER para desligar o celular..."
adb shell reboot -p || true
ok "Siga os passos 2 e 3 na tela do celular."
