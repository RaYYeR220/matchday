# @matchday/mcp-server

An MCP server that exposes the Matchday wallet to an AI agent — **the wallet you can safely hand an agent.** The agent can read the balance, read the rules, preview a payment and pay, but every payment is checked against the fan's matchday policy first, so **it can never exceed the budget, a category cap, a per-tap stake cap, a cooldown, or pay outside the allowlist.** It's the same policy the wallet enforces on-device and on-chain.

## Tools

- `matchday_get_balance` — USDT balance + mode (demo / live).
- `matchday_get_policy` — budget, per-category caps, per-tap stake caps, cooldowns, allowlist, spend so far, and the on-chain `rulesHash`.
- `matchday_list_categories` — the categories an agent may pay into.
- `matchday_quote_payment` — preview a payment; returns `allowed`, or the exact rule that blocks it.
- `matchday_pay` — a policy-checked gasless payment. Over-budget / over-cap / over-stake / cooldown / off-allowlist payments are rejected **before anything is signed**.

## Run

```bash
pnpm --filter @matchday/mcp-server start        # demo mode — policy-checked, no funds move
MATCHDAY_LIVE=1 MATCHDAY_SEED="<seed>" pnpm --filter @matchday/mcp-server start   # real gasless USDT on Arbitrum
```

Environment:

- `MATCHDAY_SEED` — the fan wallet recovery phrase (live mode only).
- `MATCHDAY_LIVE=1` — make `matchday_pay` a real gasless transfer on Arbitrum.
- `MATCHDAY_DEMO_BALANCE` — starting balance for demo mode (default `5`).

## Use it from an MCP client

Point any MCP client at the server:

```json
{
  "mcpServers": {
    "matchday": { "command": "pnpm", "args": ["--filter", "@matchday/mcp-server", "start"] }
  }
}
```

Then ask the agent: *"pay 1 USDT for a round at the bar"* → it calls `matchday_pay`. Ask it to *"tip a player 5 USDT"* → the policy rejects it (over the per-tap cheer cap), and the agent can't override it.
