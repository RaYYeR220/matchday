# MatchdayPolicyGuard

Trustless **on-chain enforcement** of a fan's matchday spend policy. The committed rules use the
**same canonical ABI layout** as the off-chain `policy-core` serializer, so the `rulesHash` computed
on-chain is byte-identical to the one the wallet computes on-device — the two enforce the very same
policy. A payment that breaches the budget, a category cap, a per-tap stake cap, a cooldown, the time
window, or the allowlist **reverts on-chain and cannot be bypassed by the owner's own signature**.

## Interface

- `commit(totalBudget, windowStart, windowEnd, allowlist[], capIds[], caps[], stakeIds[], stakeCaps[], cooldownIds[], cooldowns[])`
  — store your rules. Arrays mirror `policy-core`'s `serializeRules` (sorted by id off-chain) and the
  function emits `RulesCommitted(owner, rulesHash)`.
- `pay(token, to, amount, category)` — pay USD₮ to an allowlisted destination, enforced against your
  committed rules. Precedence mirrors `policy-core`: window → allowlist → stake → cooldown → budget →
  category cap. On success it pulls `amount` via `transferFrom` (owner must `approve` first), advances
  the on-chain spend state, and emits `Paid(owner, to, token, amount, category)`.

Convention (matching `policy-core`): a cap / stakeCap / cooldown of `0` means "not set"
(unlimited / none); `totalBudget == 0` means "not committed".

## Deployment (Arbitrum One mainnet)

- **MatchdayPolicyGuard** — [`0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e`](https://arbiscan.io/address/0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e), source-verified.
- Rules committed: [`0x98f4ade3…a72f793`](https://arbiscan.io/tx/0x98f4ade3230a74fd28485139250e2a9eb030b859a627c24fed722d196a72f793)
- Valid spend within policy (succeeds, moves USDT): [`0x8ac860e6…ebdaa83b`](https://arbiscan.io/tx/0x8ac860e618f5530957fccc93dae0bf4294f774ec53146d5fc5ca56d3ebdaa83b)

## Build & test

```bash
forge install foundry-rs/forge-std   # first checkout only
forge test                           # rules-hash bridge + fuzz invariants
```

`foundry.toml` enables `via_ir` (the 10-argument `commit` otherwise hits stack-too-deep).

## Deploy & commit demo rules

```bash
forge script script/Deploy.s.sol --rpc-url <arbitrum_rpc> --private-key <key> --broadcast
forge script script/CommitDemo.s.sol --rpc-url <arbitrum_rpc> --private-key <key> --broadcast
```
