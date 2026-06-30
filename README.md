# Matchday

A self-custodial, **gasless USDT wallet for the tournament moment**. Set a matchday budget, tap to pay across chains, and every spend is checked against rules you set up front — bar tabs, player cheers, merch and group pots — with the keys never leaving your device. The same rules are also enforced **on-chain**, so not even your own signature can push you past a cap. Built on the [Tether Wallet Development Kit](https://docs.wdk.tether.io/).

## Why

Paying with stablecoins at a watch party should feel like tapping a card — not juggling a native gas token, a seed phrase, and three different chains. Matchday makes USDT payments **gasless** (the fee comes out of the USDT itself), **self-custodial** (one seed, keys on device), and **safe by default** (a budget and rules you set up front, enforced before anything is signed — and again on-chain).

## What it does

- **Fan wallet.** One seed controls USDT on Arbitrum, TON and TRON. Every payment is gasless — no ETH/TON/TRX to hold; the fee comes out of the USDT itself.
- **Spend policy, enforced twice.** Set a matchday budget, per-category caps (🍺 Bar & Food · 📣 Cheers · 🧣 Merch · 🤝 Group Pot), per-tap stake caps, cooldowns, an allowlist of who you can pay, and a time window. The wallet checks every spend **on-device**, and a deployed contract re-checks it **on-chain** — a payment that breaks a rule is rejected even if it carries a valid signature.
- **Goal-for-good.** Pledge an auto-donation to an allowlisted cause on every goal — a hands-free spend that still passes the same policy gate.
- **Host pools.** Spin up a fan-pool or watch-party tip-jar that receives USDT, with a shareable link and live progress toward a target.

## Architecture

A small monorepo of focused packages plus an on-chain enforcer:

- **`policy-core`** — pure rule engine: the policy schema, the spend evaluator (budget / category caps / per-tap stake caps / cooldowns / allowlist / time window), and a canonical, hashable serialization so the very same rules can be enforced off-chain and on-chain.
- **`policy-guard`** — runs `policy-core` before any spend and advances the per-user spend state only when the payment actually settles.
- **`wallet-multichain`** — one seed across Arbitrum (ERC-4337 account abstraction), TON (gasless relay) and TRON (GasFree), behind a single `transfer` API, resolving each gasless payment to its settled on-chain transaction and explorer link.
- **`sdk`** — the app-facing facade: policy-gated payments for fans and pool management for hosts.
- **`contracts/MatchdayPolicyGuard.sol`** — a trustless on-chain enforcer. It stores a fan's committed rules and recomputes the **same rules hash** the wallet derives off-chain (identical ABI layout), so the on-device check and the on-chain check enforce byte-identical policy. `pay()` reverts on any window / allowlist / stake / cooldown / budget / category-cap violation.

Gasless is handled per chain by the relevant standard — an ERC-4337 paymaster that accepts USDT for gas on Arbitrum, a sponsored relay on TON, and GasFree on TRON — so the fee is always denominated in USDT and the user never needs a native gas token.

## Live on Arbitrum One

The on-chain policy enforcer is **deployed and source-verified** on Arbitrum mainnet:

- **MatchdayPolicyGuard** — [`0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e`](https://arbiscan.io/address/0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e) (verified)

Enforcement proven end-to-end on mainnet — both that valid spends go through and that violations are rejected:

- **Rules committed on-chain** — [tx `0x98f4ade3…a72f793`](https://arbiscan.io/tx/0x98f4ade3230a74fd28485139250e2a9eb030b859a627c24fed722d196a72f793)
- **Valid spend within policy → succeeds, moves real USDT** — [tx `0x8ac860e6…ebdaa83b`](https://arbiscan.io/tx/0x8ac860e618f5530957fccc93dae0bf4294f774ec53146d5fc5ca56d3ebdaa83b) (0.1 USDT under the Bar & Food cap; emits `Paid`, advances on-chain spend state)
- **Over-cap and over-stake spends revert** with `CategoryCapExceeded` / `StakeCapExceeded` — covered by the contract test suite and verified against the live deployment.

## Develop

Requires Node ≥ 20 and pnpm.

```bash
pnpm install
pnpm -r test       # run the test suite across all packages
pnpm -r typecheck  # type-check everything
```

The on-chain enforcer is a [Foundry](https://book.getfoundry.sh/) project in `contracts/`:

```bash
cd contracts
forge install foundry-rs/forge-std   # first checkout only
forge test                           # rules-hash bridge + fuzz invariants
```

## License

MIT — see [LICENSE](./LICENSE).
