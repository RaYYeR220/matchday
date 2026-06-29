# Matchday

A self-custodial, **gasless USDT wallet for the tournament moment**. Set a matchday budget, tap to pay across chains, and every spend is rule-gated — tips, merch, fan-pools and watch-party tip-jars, with the keys never leaving your device. Built on the [Tether Wallet Development Kit](https://docs.wdk.tether.io/).

## Why

Paying with stablecoins at a watch party should feel like tapping a card — not juggling a native gas token, a seed phrase, and three different chains. Matchday makes USDT payments **gasless** (the fee comes out of the USDT itself), **self-custodial** (one seed, keys on device), and **safe by default** (a budget and rules you set up front, enforced before anything is signed).

## What it does

- **Fan wallet.** One seed controls USDT on Arbitrum, TON and TRON. Every payment is gasless — no ETH/TON/TRX required.
- **Spend policy.** Set a tournament/match budget, per-category caps (tips, merch, …), an allowlist of who you can pay, and a time window. The wallet checks each spend against the policy and blocks anything outside it.
- **Host pools.** Spin up a fan-pool or watch-party tip-jar that receives USDT, with a shareable link and live progress toward a target.

## Architecture

A small monorepo of focused packages:

- **`policy-core`** — pure rule engine: the policy schema, the spend evaluator (budget / category caps / allowlist / time window), and a canonical, hashable serialization so the same rules can be enforced off-chain and on-chain.
- **`policy-guard`** — runs `policy-core` before any spend and advances the per-user spend state only when the payment actually settles.
- **`wallet-multichain`** — one seed across Arbitrum (ERC-4337 account abstraction), TON (gasless relay) and TRON (GasFree), behind a single `transfer` API, resolving each gasless payment to its settled on-chain transaction and explorer link.
- **`sdk`** — the app-facing facade: policy-gated payments for fans and pool management for hosts.

Gasless is handled per chain by the relevant standard — an ERC-4337 paymaster that accepts USDT for gas on Arbitrum, a sponsored relay on TON, and GasFree on TRON — so the fee is always denominated in USDT and the user never needs a native gas token.

## Develop

Requires Node ≥ 20 and pnpm.

```bash
pnpm install
pnpm -r test       # run the test suite across all packages
pnpm -r typecheck  # type-check everything
```

## License

MIT — see [LICENSE](./LICENSE).
