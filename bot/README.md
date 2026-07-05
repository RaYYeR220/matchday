# Matchday bot

A one-file Telegram webhook (Vercel serverless) for [@matchdaywalletbot](https://t.me/matchdaywalletbot).
It answers `/start` and `/help` with a welcome and a button that opens the Matchday Mini-App. The
Mini-App also opens from the bot's menu button.

## Deploy

```bash
vercel deploy --prod                       # deploy api/telegram.js
```

Set two environment variables on the project:

- `BOT_TOKEN` — the bot token from BotFather.
- `WEBHOOK_SECRET` — any random string; passed to `setWebhook` and checked on every request.

Then register the webhook:

```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d url="https://<deployment>/api/telegram" \
  -d secret_token="$WEBHOOK_SECRET"
```
