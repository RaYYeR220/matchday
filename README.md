# Matchday

A self-custodial, gasless USDT wallet for the tournament moment. Set a budget for the match, tap to pay, and every spend is checked against rules you set up front: bar tabs, player cheers, merch, group pots. The [Tether Wallet Development Kit](https://docs.wdk.tether.io/) runs in the browser, so your recovery phrase is generated on the device, encrypted under a PIN, and signs every payment locally. No server ever holds a key. The same rules are also enforced on-chain, so not even your own signature can push a spend past a cap.

## Demo

- **Video walkthrough:** https://youtu.be/ZgvUsJQS4Hc
- **Live app:** https://matchday-rayyer220s-projects.vercel.app
- **Telegram Mini-App:** [@matchdaywalletbot](https://t.me/matchdaywalletbot) — open it from the bot's menu button

Open the app and it creates a real self-custodial wallet in the browser (write the recovery phrase down). Send a little USDT to your Arbitrum address and every payment becomes a real, gasless on-chain transaction with no backend and no gas token. The proof transactions further down are permanent and verifiable.

## Why

Paying with stablecoins at a watch party should feel like tapping a card, not juggling a native gas token, a seed phrase, and a browser extension. So the fee comes out of the USDT itself (no ETH to hold), the keys are generated and kept on your device, and the budget and caps you set are checked before anything is signed, then again on-chain.

## What it does

- **Fan wallet, keys on the device.** WDK runs in the browser: the recovery phrase is generated locally, encrypted with a PIN, and signs on-device. Payments on Arbitrum are gasless, with the fee taken from the USDT itself, so there is no ETH to hold. (WDK also covers TON and TRON gaslessly.)
- **Spend policy, enforced twice.** Set a matchday budget, per-category caps (Bar & Food, Cheers, Merch, Group Pot), per-tap stake caps, cooldowns, an allowlist of who you can pay, and a time window. The wallet checks every spend on the device before signing, and the identical rules are enforced by a deployed contract on-chain (proven below), so a spend that breaks a rule is rejected even when it carries a valid signature.
- **Goal-for-good.** Pledge a donation to an allowlisted cause; it passes the same policy gate as any other spend.
- **Host pools.** Spin up a watch-party tip-jar that receives USDT, with a shareable link and live progress toward a target.
- **Friendly Wager.** A P2P bet matched with another fan. A per-tap stake cap and a cooldown keep it a bit of fun rather than tilt-betting.
- **Second Screen.** Unlock premium match content pay-per-view with [x402](https://www.x402.org/) (HTTP 402 Payment Required). Each unlock is a gasless, policy-checked tap, with no subscription.
- **Agent rail (MCP).** An [MCP](https://modelcontextprotocol.io/) server exposes the wallet to an AI agent — it can read the balance and rules, preview a payment and pay, but every payment is checked against your policy first. So you can hand an agent your wallet: it spends within your budget and caps, and can never go beyond them. In live mode those are real gasless transfers on Arbitrum.

All of these run through the same policy-gated, gasless engine.

## Architecture

A small monorepo of focused packages plus an on-chain enforcer:

- **`policy-core`** — the rule engine: the policy schema, the spend evaluator (budget, category caps, per-tap stake caps, cooldowns, allowlist, time window), and a canonical, hashable serialization so the same rules can be enforced off-chain and on-chain.
- **`policy-guard`** — runs `policy-core` before a spend and advances the per-user spend state only once the payment settles.
- **`wallet-multichain`** — one seed across Arbitrum (ERC-4337 account abstraction), TON (gasless relay) and TRON (GasFree) via WDK, behind a single `transfer` API that resolves each gasless payment to its settled transaction and explorer link.
- **`sdk`** — the app-facing facade: policy-gated payments for fans, pool management for hosts.
- **`mcp-server`** — a Model Context Protocol server that wraps the policy-gated wallet as agent tools (get balance, read policy, quote, pay). An AI agent is bound by exactly the same budget, caps and cooldowns a person is; over-limit or off-allowlist payments are rejected before anything is signed.
- **`app`** — the React PWA / Telegram Mini-App. It runs WDK in the browser (`app/src/wallet`): a WebCrypto keystore (the phrase is generated and encrypted with a PIN on-device) plus a WDK smart account that signs gasless USDT payments on Arbitrum. `policy-guard` gates every spend client-side before it is signed.
- **`contracts/MatchdayPolicyGuard.sol`** — the on-chain enforcer. It stores a fan's committed rules and recomputes the same rules hash the wallet derives off-chain (identical ABI layout), so the device check and the chain check enforce byte-identical policy. `pay()` reverts on any window, allowlist, stake, cooldown, budget or category-cap violation.

Gasless is handled per chain by the relevant standard: an ERC-4337 paymaster that accepts USDT for gas on Arbitrum, a sponsored relay on TON, and GasFree on TRON. The fee is always denominated in USDT, so the user never needs a native gas token.

## Live on Arbitrum One

**In-browser, self-custodial, gasless.** A payment fired from the wallet UI is a real gasless USDT transfer, signed on-device and paid for in USDT through the ERC-4337 paymaster: [tx `0x425256da…eea6e3e6`](https://arbiscan.io/tx/0x425256da05b516c641c2fb4f1675cf19d4fa182e35a6c76a319e7971eea6e3e6). No server, no native gas token.

**On-chain policy enforcer**, deployed and source-verified on Arbitrum mainnet:

- **MatchdayPolicyGuard** — [`0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e`](https://arbiscan.io/address/0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e) (verified)
- **Rules committed on-chain** — [tx `0x98f4ade3…a72f793`](https://arbiscan.io/tx/0x98f4ade3230a74fd28485139250e2a9eb030b859a627c24fed722d196a72f793)
- **Valid spend within policy** succeeds and moves real USDT — [tx `0x8ac860e6…ebdaa83b`](https://arbiscan.io/tx/0x8ac860e618f5530957fccc93dae0bf4294f774ec53146d5fc5ca56d3ebdaa83b) (emits `Paid`, advances the on-chain spend state)
- **Over-cap and over-stake spends revert** with `CategoryCapExceeded` / `StakeCapExceeded`, covered by the contract test suite against the live deployment.

## Develop

Requires Node ≥ 20 and pnpm.

```bash
pnpm install
pnpm -r test       # test suite across all packages
pnpm -r typecheck  # type-check everything
pnpm --filter @matchday/app dev   # the wallet UI
```

The on-chain enforcer is a [Foundry](https://book.getfoundry.sh/) project in `contracts/`:

```bash
cd contracts
forge install foundry-rs/forge-std   # first checkout only
forge test                           # rules-hash bridge + fuzz invariants
```

## License

MIT, see [LICENSE](./LICENSE).
