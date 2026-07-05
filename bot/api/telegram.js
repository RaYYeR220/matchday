// Matchday Telegram bot — a single serverless webhook (Vercel).
// Responds to /start and /help with a welcome and a button that opens the
// Matchday Mini-App. The bot token and webhook secret come from env vars.
const APP_URL = 'https://matchday-rayyer220s-projects.vercel.app'

const WELCOME =
  '⚽ *Matchday* — the gasless USD₮ wallet for the match.\n\n' +
  'Set a budget, tap to pay, and keep your keys. Every payment is a real, gasless ' +
  'transaction on Arbitrum, checked against rules you set up front — budget, ' +
  'category caps, per-tap limits and cooldowns.\n\n' +
  'Tap below to open the wallet 👇'

async function tg(token, method, body) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'matchday' })

  // Only Telegram knows the secret we registered with setWebhook.
  const secret = process.env.WEBHOOK_SECRET
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ ok: false })
  }

  const token = process.env.BOT_TOKEN
  const msg = req.body?.message
  const text = msg?.text || ''
  if (msg && (text.startsWith('/start') || text.startsWith('/help'))) {
    await tg(token, 'sendMessage', {
      chat_id: msg.chat.id,
      text: WELCOME,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚽ Open Matchday', web_app: { url: APP_URL } }]] },
    })
  }
  return res.status(200).json({ ok: true })
}
