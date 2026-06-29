import type { PolicyRules } from '@matchday/policy-core'
import type { PolicyGuard } from '@matchday/policy-guard'
import type { Chain, MatchdayWalletLike, TransferReceipt } from '@matchday/wallet-multichain'

export interface PayInput {
  recipient: string
  amount: bigint
  category: string
}

export interface MatchdayConfig {
  wallet: MatchdayWalletLike
  guard: PolicyGuard
  rules: PolicyRules
  userKey: string
  /** Injectable clock (unix seconds) for deterministic policy time-window checks. */
  now?: () => number
}

/** Fan-side facade: every spend goes through the policy guard before the gasless transfer. */
export class Matchday {
  private rules: PolicyRules
  private readonly now: () => number
  constructor(private readonly cfg: MatchdayConfig) {
    this.rules = cfg.rules
    this.now = cfg.now ?? (() => Math.floor(Date.now() / 1000))
  }

  setRules(rules: PolicyRules): void {
    this.rules = rules
  }

  async balances(chains: Chain[] = ['arbitrum', 'ton', 'tron']): Promise<Record<string, bigint>> {
    const out: Record<string, bigint> = {}
    for (const c of chains) out[c] = await this.cfg.wallet.getUsdtBalance(c)
    return out
  }

  async payGated(chain: Chain, input: PayInput): Promise<TransferReceipt> {
    const req = { amount: input.amount, category: input.category, to: input.recipient, timestamp: this.now() }
    return this.cfg.guard.run(this.cfg.userKey, this.rules, req, () =>
      this.cfg.wallet.transfer(chain, { recipient: input.recipient, amount: input.amount }),
    )
  }
}
