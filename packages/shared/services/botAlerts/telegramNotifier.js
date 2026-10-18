'use strict';

const TELEGRAM_API = 'https://api.telegram.org';
const SEND_TIMEOUT_MS = 10 * 1000;

/**
 * Build a Telegram sender for operator alerts (the bot-nitin manager bot's token +
 * the operator's chat id). Best-effort: a failed send is logged, never thrown, and
 * the token never appears in a log line.
 *
 * @param {object} deps
 * @param {string} [deps.token] - Telegram bot token; unset → returns null (alerts stay Redis + logs)
 * @param {string} [deps.chatId] - chat to message
 * @param {{ warn?: Function }} [deps.logger]
 * @param {Function} [deps.fetchImpl] - injectable for tests
 * @returns {((text: string) => Promise<void>) | null}
 */
function createTelegramNotifier({ token, chatId, logger, fetchImpl = fetch }) {
  if (!token || !chatId) return null;
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  return async function notify(text) {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!res.ok) logger?.warn?.({ status: res.status }, 'telegram alert send rejected');
    } catch (err) {
      logger?.warn?.({ err: err.name }, 'telegram alert send failed');
    }
  };
}

module.exports = { createTelegramNotifier };
