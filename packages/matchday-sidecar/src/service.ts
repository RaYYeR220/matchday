import type { PolicyRules, PolicyState, SpendRequest } from '@matchday/policy-core'
import { PolicyGuard, type StateStore } from '@matchday/policy-guard'
import type { Chain, MatchdayWalletLike, TransferReceipt } from '@matchday/wallet-multichain'

export interface TransferRequest {
  chain: Chain
  recipient: string
  amount: bigint
}

export interface PayRequest extends TransferRequest {
  category: string
}

/** A read of the deployed on-chain MatchdayPolicyGuard for the configured owner. */
export interface OnchainSnapshot {
  guard: string
  owner: string
  totalBudget: bigint
  totalSpent: bigint
  committed: boolean
}

export interface SidecarDeps {
  wallet: MatchdayWalletLike
  store: StateStore
  rules: PolicyRules
  userKey: string
  /** Injectable clock (unix seconds) for deterministic time-window checks. */
  now?: () => number
  /** Optional reader for the deployed on-chain guard state. */
  onchain?: () => Promise<OnchainSnapshot>
}

/**
 * The server-side Matchday engine: the real WDK-backed wallet behind the same policy
 * guard the app uses. `pay()` enforces the policy on the server before the gasless
 * transfer — the browser is no longer the only thing standing between a fan and an
 * over-spend.
 */
export class MatchdaySidecar {
  private readonly guard: PolicyGuard
  private readonly now: () => number

  constructor(private readonly d: SidecarDeps) {
    this.guard = new PolicyGuard(d.store)
    this.now = d.now ?? (() => Math.floor(Date.now() / 1000))
  }

  /** Live USDT balances. Fault-tolerant per chain: a chain whose RPC/provider errors is omitted
   *  rather than failing the whole call, so one flaky network never blanks the others. */
  async balances(chains: Chain[] = ['arbitrum', 'ton', 'tron']): Promise<Record<string, bigint>> {
    const out: Record<string, bigint> = {}
    const settled = await Promise.allSettled(chains.map((c) => this.d.wallet.getUsdtBalance(c)))
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') out[chains[i]] = r.value
    })
    return out
  }

  /** Raw gasless transfer — no policy gate. For integrators that run their own checks. */
  async transfer(req: TransferRequest): Promise<TransferReceipt> {
    return this.d.wallet.transfer(req.chain, { recipient: req.recipient, amount: req.amount })
  }

  /** Policy-gated gasless payment. Throws PolicyViolationError if the spend breaks a rule. */
  async pay(req: PayRequest): Promise<TransferReceipt> {
    const sr: SpendRequest = { amount: req.amount, category: req.category, to: req.recipient, timestamp: this.now() }
    return this.guard.run(this.d.userKey, this.d.rules, sr, () =>
      this.d.wallet.transfer(req.chain, { recipient: req.recipient, amount: req.amount }),
    )
  }

  async policy(): Promise<{ rules: PolicyRules; state: PolicyState; onchain: OnchainSnapshot | null }> {
    const state = await this.d.store.get(this.d.userKey)
    const onchain = this.d.onchain ? await this.d.onchain() : null
    return { rules: this.d.rules, state, onchain }
  }
}
