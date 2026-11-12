// Telegram Bot API oficial — https://core.telegram.org/bots/api#sendmessage
// O bot precisa ser administrador do canal; target_ref = @nome_do_canal ou chat_id numérico.
export async function sendTelegram(token: string, chatId: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: false } }),
    });
    const body = await res.json() as { ok: boolean; description?: string };
    return body.ok ? { ok: true } : { ok: false, error: body.description ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
