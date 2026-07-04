# Matchday

A self-custodial, **gasless USDT wallet for the tournament moment**. Set a matchday budget, tap to pay, and every spend is checked against rules you set up front — bar tabs, player cheers, merch and group pots. The [Tether Wallet Development Kit](https://docs.wdk.tether.io/) runs **entirely in your browser**: your recovery phrase is generated on-device, encrypted under a PIN, and signs every payment locally — no server ever holds a key. The same rules are also enforced **on-chain**, so not even your own signature can push you past a cap.

## Try it

- **Web app:** https://matchday-rayyer220s-projects.vercel.app
- **Telegram Mini-App:** [@matchdaywalletbot](https://t.me/matchdaywalletbot) → tap the menu button to open it

Open it and a real self-custodial wallet is created in the browser (write down the recovery phrase). Send a little USDT to your Arbitrum address and every payment is a **real, gasless** on-chain transaction — no backend, no gas token. The on-chain proof transactions below are permanent and verifiable.

## Why

Paying with stablecoins at a watch party should feel like tapping a card — not juggling a native gas token, a seed phrase, and a browser extension. Matchday makes USDT payments **gasless** (the fee comes out of the USDT itself), **self-custodial** (keys generated and kept on your device), and **safe by default** (a budget and rules you set up front, enforced before anything is signed — and again on-chain).

## What it does

- **Fan wallet, keys on device.** WDK runs in the browser: the recovery phrase is generated locally, encrypted with a PIN, and signs on-device. Payments on Arbitrum are gasless — no ETH to hold, the fee comes out of the USDT itself. (WDK also covers TON and TRON gaslessly.)
- **Spend policy, enforced twice.** Set a matchday budget, per-category caps (🍺 Bar & Food · 📣 Cheers · 🧣 Merch · 🤝 Group Pot), per-tap stake caps, cooldowns, an allowlist of who you can pay, and a time window. The wallet checks every spend **on-device**, and a deployed contract can re-check it **on-chain** — a payment that breaks a rule is rejected even if it carries a valid signature.
- **Goal-for-good.** Pledge an auto-donation to an allowlisted cause on every goal — a hands-free spend that still passes the same policy gate.
- **Host pools.** Spin up a fan-pool or watch-party tip-jar that receives USDT, with a shareable link and live progress toward a target.
- **Friendly Wager.** A P2P bet matched with another fan — the per-tap stake cap and cooldown keep it a bit of fun, not tilt-betting.
- **Second Screen.** Unlock premium match content pay-per-view with [x402](https://www.x402.org/) (HTTP 402 Payment Required) — each unlock is a gasless, policy-checked tap, no subscription.

Every one of these is the *same* policy-gated, gasless engine — not a pile of separate features.

## Architecture

A small monorepo of focused packages plus an on-chain enforcer:

- **`policy-core`** — pure rule engine: the policy schema, the spend evaluator (budget / category caps / per-tap stake caps / cooldowns / allowlist / time window), and a canonical, hashable serialization so the very same rules can be enforced off-chain and on-chain.
- **`policy-guard`** — runs `policy-core` before any spend and advances the per-user spend state only when the payment actually settles.
- **`wallet-multichain`** — one seed across Arbitrum (ERC-4337 account abstraction), TON (gasless relay) and TRON (GasFree) via WDK, behind a single `transfer` API that resolves each gasless payment to its settled on-chain transaction and explorer link.
- **`sdk`** — the app-facing facade: policy-gated payments for fans and pool management for hosts.
- **`app`** — the React PWA / Telegram Mini-App. It runs **WDK in the browser** (`app/src/wallet`): a WebCrypto keystore (the phrase is generated and encrypted with a PIN on-device) plus a WDK-backed smart account that signs gasless USDT payments on Arbitrum. `policy-guard` gates every spend client-side before it is signed.
- **`contracts/MatchdayPolicyGuard.sol`** — a trustless on-chain enforcer. It stores a fan's committed rules and recomputes the **same rules hash** the wallet derives off-chain (identical ABI layout), so the on-device check and the on-chain check enforce byte-identical policy. `pay()` reverts on any window / allowlist / stake / cooldown / budget / category-cap violation.

Gasless is handled per chain by the relevant standard — an ERC-4337 paymaster that accepts USDT for gas on Arbitrum, a sponsored relay on TON, and GasFree on TRON — so the fee is always denominated in USDT and the user never needs a native gas token.

## Live on Arbitrum One

**Self-custodial, in-browser, gasless:** a payment fired from the wallet UI is a real gasless USDT transfer, signed on-device and paid for in USDT via the ERC-4337 paymaster — e.g. [tx `0x425256da…eea6e3e6`](https://arbiscan.io/tx/0x425256da05b516c641c2fb4f1675cf19d4fa182e35a6c76a319e7971eea6e3e6) (no server, no native gas token).

**On-chain policy enforcer** — deployed and source-verified on Arbitrum mainnet:

- **MatchdayPolicyGuard** — [`0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e`](https://arbiscan.io/address/0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e) (verified)
- **Rules committed on-chain** — [tx `0x98f4ade3…a72f793`](https://arbiscan.io/tx/0x98f4ade3230a74fd28485139250e2a9eb030b859a627c24fed722d196a72f793)
- **Valid spend within policy → succeeds, moves real USDT** — [tx `0x8ac860e6…ebdaa83b`](https://arbiscan.io/tx/0x8ac860e618f5530957fccc93dae0bf4294f774ec53146d5fc5ca56d3ebdaa83b) (emits `Paid`, advances on-chain spend state)
- **Over-cap and over-stake spends revert** with `CategoryCapExceeded` / `StakeCapExceeded` — covered by the contract test suite and verified against the live deployment.

## Develop

Requires Node ≥ 20 and pnpm.

```bash
pnpm install
pnpm -r test       # run the test suite across all packages
pnpm -r typecheck  # type-check everything
pnpm --filter @matchday/app dev   # the wallet UI (PWA / Telegram Mini-App)
```

The on-chain enforcer is a [Foundry](https://book.getfoundry.sh/) project in `contracts/`:

```bash
cd contracts
forge install foundry-rs/forge-std   # first checkout only
forge test                           # rules-hash bridge + fuzz invariants
```

## License

MIT — see [LICENSE](./LICENSE).
