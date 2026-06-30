# @matchday/sidecar

The Tether Wallet Development Kit runs on Node, the app runs in the browser — this small
HTTP service bridges them. It puts the real WDK-backed multi-chain wallet behind the same
`policy-guard` the app uses, so a payment is checked against the fan's rules **on the server**
before the gasless transfer, and exposes a live read of the deployed on-chain guard.

## Run

```bash
cp .env.example .env   # add a seed (the file is gitignored)
pnpm start             # http://127.0.0.1:8787
```

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /balances` → live USD₮ balances per chain (fault-tolerant: a flaky chain is omitted, not fatal)
- `GET /policy` → the active rules, the server-side spend state, and a live read of the on-chain guard
- `POST /transfer` `{ chain, recipient, amount }` → a raw gasless transfer (no policy gate)
- `POST /pay` `{ chain, category, recipient, amount }` → a **policy-gated** gasless payment; `409 { reason }` if a rule blocks it

Amounts are USD₮ base units (6 decimals) as strings; bigints are serialized as decimal strings.

## Use as a library

```ts
import { MatchdaySidecar, createServer, buildFromEnv } from '@matchday/sidecar'

const sidecar = buildFromEnv()          // real WDK wallet + guard from env
createServer(sidecar).listen(8787)
```

`MatchdaySidecar` also takes an injected wallet/store for tests — see `src/service.test.ts`.
