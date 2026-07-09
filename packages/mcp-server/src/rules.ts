import type { PolicyRules } from '@matchday/policy-core'

export const U = 1_000_000n // USDT has 6 decimals
export const usdt = (n: number): bigint => BigInt(Math.round(n * 1e6))
export const fmt = (base: bigint): string => {
  const neg = base < 0n
  const v = neg ? -base : base
  const s = v % U === 0n ? (v / U).toString() : (v / U) + '.' + (v % U).toString().padStart(6, '0').replace(/0+$/, '')
  return (neg ? '-' : '') + s
}

/** The single allowlisted demo payee (a pre-approved vendor). */
export const PAYEE = '0x000000000000000000000000000000000000dEaD'

export interface AgentCategory {
  key: string
  label: string
  payee: string
}

/** The spend categories an agent may pay into (mirrors the Matchday app). */
export const CATEGORIES: AgentCategory[] = [
  { key: 'bar', label: 'Bar & Food', payee: PAYEE },
  { key: 'cheers', label: 'Player cheers', payee: PAYEE },
  { key: 'merch', label: 'Merch', payee: PAYEE },
  { key: 'pool', label: 'Group pool', payee: PAYEE },
]

/** The matchday spend policy the agent is bound by — identical shape to the on-device
 *  and on-chain rules, so an agent is capped by exactly what the fan set. */
export const DEFAULT_RULES: PolicyRules = {
  totalBudget: 5n * U,
  perCategoryCaps: { bar: 2n * U, cheers: 1n * U, merch: 1_500_000n, pool: 1_500_000n },
  perCategoryStakeCaps: { cheers: 500_000n }, // tilt-cap: max 0.5 USDT per single cheer
  cooldownSeconds: { cheers: 30 },
  allowlist: [PAYEE],
  window: { start: 0, end: 4_000_000_000 },
}
