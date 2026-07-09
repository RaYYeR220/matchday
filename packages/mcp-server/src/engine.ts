import { evaluate, rulesHash, type PolicyRules, type SpendRequest } from '@matchday/policy-core'
import { InMemoryStateStore, PolicyGuard, PolicyViolationError } from '@matchday/policy-guard'
import { CATEGORIES, DEFAULT_RULES, PAYEE, usdt } from './rules'

const KEY = 'agent'

/** A minimal wallet the engine can spend from in live mode. */
export interface AgentWallet {
  address(): Promise<string>
  getUsdtBalance(): Promise<bigint>
  transfer(recipient: string, amountBase: bigint): Promise<{ explorerUrl: string | null; feeUsdt: bigint; settledHash: string | null }>
}

export interface EngineOpts {
  rules?: PolicyRules
  /** When provided, payments are REAL gasless USDT transfers on Arbitrum. Omit for a safe, fund-free demo. */
  wallet?: AgentWallet
  /** Starting balance (USDT) for the fund-free demo mode. */
  demoBalanceUsdt?: number
  now?: () => number
}

export interface PolicyView {
  live: boolean
  totalBudget: bigint
  totalSpent: bigint
  remaining: bigint
  categories: { category: string; label: string; cap: bigint; spent: bigint; remaining: bigint }[]
  stakeCaps: Record<string, bigint>
  cooldownSeconds: Record<string, number>
  allowlist: string[]
  rulesHash: string
}

export type QuoteResult =
  | { allowed: true; category: string; amount: bigint; to: string }
  | { allowed: false; reason: string; category: string; amount: bigint; to: string }

export type PayResult =
  | { ok: true; category: string; amount: bigint; to: string; simulated: boolean; feeUsdt: bigint; explorerUrl: string | null; settledHash: string | null }
  | { ok: false; blocked: true; reason: string; category: string; amount: bigint; to: string }
  | { ok: false; blocked: false; error: string }

/**
 * The policy-bound agent engine. Every payment an agent initiates is checked against the fan's
 * matchday rules BEFORE it executes — so an agent can spend, but it can never exceed the budget,
 * a category cap, a per-tap stake cap, a cooldown, or pay outside the allowlist.
 */
export class MatchdayAgentEngine {
  readonly live: boolean
  private readonly rules: PolicyRules
  private readonly store = new InMemoryStateStore()
  private readonly guard: PolicyGuard
  private readonly wallet?: AgentWallet
  private readonly demoBalance: bigint
  private readonly now: () => number

  constructor(opts: EngineOpts = {}) {
    this.rules = opts.rules ?? DEFAULT_RULES
    this.wallet = opts.wallet
    this.live = !!opts.wallet
    this.demoBalance = usdt(opts.demoBalanceUsdt ?? 5)
    this.now = opts.now ?? (() => Math.floor(Date.now() / 1000))
    // guard + quotes share one store so spend state stays consistent
    this.guard = new PolicyGuard(this.store)
  }

  private payeeFor(category: string): string {
    return CATEGORIES.find((c) => c.key === category)?.payee ?? PAYEE
  }

  async getBalance(): Promise<bigint> {
    if (this.wallet) return this.wallet.getUsdtBalance()
    const state = await this.store.get(KEY)
    return this.demoBalance - state.totalSpent
  }

  async getPolicy(): Promise<PolicyView> {
    const state = await this.store.get(KEY)
    const categories = Object.entries(this.rules.perCategoryCaps).map(([k, cap]) => {
      const spent = state.spentByCategory[k] ?? 0n
      return { category: k, label: CATEGORIES.find((c) => c.key === k)?.label ?? k, cap, spent, remaining: cap - spent }
    })
    return {
      live: this.live,
      totalBudget: this.rules.totalBudget,
      totalSpent: state.totalSpent,
      remaining: this.rules.totalBudget - state.totalSpent,
      categories,
      stakeCaps: this.rules.perCategoryStakeCaps ?? {},
      cooldownSeconds: this.rules.cooldownSeconds ?? {},
      allowlist: this.rules.allowlist,
      rulesHash: rulesHash(this.rules),
    }
  }

  /** Preview a payment against the policy without spending or advancing state. */
  async quote(category: string, amountUsdt: number, recipient?: string): Promise<QuoteResult> {
    const amount = usdt(amountUsdt)
    const to = recipient ?? this.payeeFor(category)
    const req: SpendRequest = { amount, category, to, timestamp: this.now() }
    const res = evaluate(this.rules, await this.store.get(KEY), req)
    return res.allowed ? { allowed: true, category, amount, to } : { allowed: false, reason: res.reason!, category, amount, to }
  }

  /** Make a policy-checked payment. Rejected on any rule violation; executes (real or simulated) only if allowed. */
  async pay(category: string, amountUsdt: number, recipient?: string): Promise<PayResult> {
    const amount = usdt(amountUsdt)
    const to = recipient ?? this.payeeFor(category)
    const req: SpendRequest = { amount, category, to, timestamp: this.now() }
    try {
      const receipt = await this.guard.run(KEY, this.rules, req, async () => {
        if (this.wallet) return { ...(await this.wallet.transfer(to, amount)), simulated: false }
        return { explorerUrl: null, feeUsdt: 0n, settledHash: null, simulated: true }
      })
      return { ok: true, category, amount, to, simulated: receipt.simulated, feeUsdt: receipt.feeUsdt, explorerUrl: receipt.explorerUrl, settledHash: receipt.settledHash }
    } catch (e) {
      if (e instanceof PolicyViolationError) return { ok: false, blocked: true, reason: e.reason, category, amount, to }
      return { ok: false, blocked: false, error: (e as Error).message }
    }
  }

  listCategories(): typeof CATEGORIES {
    return CATEGORIES
  }
}
