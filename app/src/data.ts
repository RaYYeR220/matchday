import type { PolicyRules } from '@matchday/policy-core'

export type Network = 'mainnet' | 'testnet'

/** Allowlisted demo recipient (a vendor/host we set up before the match). */
export const PAYEE = '0x000000000000000000000000000000000000dEaD'

export interface Category { key: string; label: string; icon: string; payee: string }

export const CATEGORIES: Category[] = [
  { key: 'bar', label: 'Bar & Food', icon: '🍺', payee: 'Stadium Beer Stand #7' },
  { key: 'cheers', label: 'Cheers', icon: '📣', payee: 'Stream · ElTrincheraTV' },
  { key: 'merch', label: 'Merch', icon: '🧣', payee: 'Official Merch Stand' },
  { key: 'pool', label: 'Group Pot', icon: '🤝', payee: 'Bombonera Watch Party' },
]

/** Friendly P2P wagers — matched against another fan, winner takes the pot. */
export const WAGERS = [
  { id: 'arg-next', emoji: '🇦🇷', label: 'ARG scores next', payout: '1.8×' },
  { id: 'fra-next', emoji: '🇫🇷', label: 'FRA scores next', payout: '2.1×' },
  { id: 'over25', emoji: '⚽', label: 'Over 2.5 goals', payout: '1.6×' },
]

const U = 1_000_000n
export const toBase = (n: number) => BigInt(Math.round(n * 1e6))

export const fmt = (base: bigint) => {
  const neg = base < 0n
  const v = neg ? -base : base
  const whole = v / U, frac = v % U
  const s = frac === 0n ? whole.toString() : whole + '.' + frac.toString().padStart(6, '0').replace(/0+$/, '')
  return neg ? '-' + s : s
}

export interface Premium { id: string; emoji: string; title: string; blurb: string; price: number; body: string }
export interface NetNumbers {
  rules: PolicyRules
  amounts: number[]
  goalAmounts: number[]
  stakes: number[]
  premium: Premium[]
  budgets: number[]
  defaultBudget: number
}

/** Mainnet: small, real-money scale (the deployed self-custodial wallet). */
const mainnet: NetNumbers = {
  rules: {
    totalBudget: 5n * U,
    perCategoryCaps: { bar: 2n * U, cheers: 1n * U, merch: 1_500_000n, pool: 1_500_000n, wager: 1n * U, unlock: 1n * U },
    perCategoryStakeCaps: { cheers: 500_000n, wager: 500_000n },
    cooldownSeconds: { cheers: 30, wager: 30 },
    allowlist: [PAYEE],
    window: { start: 0, end: 4_000_000_000 },
  },
  amounts: [0.1, 0.25, 0.5, 1],
  goalAmounts: [0.1, 0.25, 0.5],
  stakes: [0.1, 0.25, 0.5, 0.8],
  premium: [
    { id: 'xg', emoji: '📊', title: 'Live xG & shot map', blurb: 'Expected-goals feed + every shot, live.', price: 0.25, body: 'ARG 2.7 xG · FRA 1.4 xG · 18 shots, 7 on target' },
    { id: 'tac', emoji: '🎥', title: 'Tactical cam', blurb: 'Wide tactical angle, full pitch.', price: 0.5, body: '▶ Tactical cam — full-pitch feed unlocked' },
    { id: 'heat', emoji: '🔥', title: 'Player heatmaps', blurb: 'Live positioning for both XIs.', price: 0.25, body: 'Messi heatmap: right half-space, deep playmaking' },
  ],
  budgets: [3, 5, 10],
  defaultBudget: 5,
}

/** Testnet: round demo numbers (Arbitrum Sepolia, sponsored gas, test USD₮). */
const testnet: NetNumbers = {
  rules: {
    totalBudget: 500n * U,
    perCategoryCaps: { bar: 200n * U, cheers: 100n * U, merch: 150n * U, pool: 150n * U, wager: 100n * U, unlock: 50n * U },
    perCategoryStakeCaps: { cheers: 50n * U, wager: 50n * U },
    cooldownSeconds: { cheers: 30, wager: 30 },
    allowlist: [PAYEE],
    window: { start: 0, end: 4_000_000_000 },
  },
  amounts: [5, 10, 25, 50],
  goalAmounts: [5, 10, 25],
  stakes: [10, 25, 50, 80],
  premium: [
    { id: 'xg', emoji: '📊', title: 'Live xG & shot map', blurb: 'Expected-goals feed + every shot, live.', price: 25, body: 'ARG 2.7 xG · FRA 1.4 xG · 18 shots, 7 on target' },
    { id: 'tac', emoji: '🎥', title: 'Tactical cam', blurb: 'Wide tactical angle, full pitch.', price: 50, body: '▶ Tactical cam — full-pitch feed unlocked' },
    { id: 'heat', emoji: '🔥', title: 'Player heatmaps', blurb: 'Live positioning for both XIs.', price: 25, body: 'Messi heatmap: right half-space, deep playmaking' },
  ],
  budgets: [200, 500, 1000],
  defaultBudget: 500,
}

export const NUMBERS: Record<Network, NetNumbers> = { mainnet, testnet }

// Network is fixed for the session, decided at load. Testnet is opt-in (`?testnet`) and only
// where a sponsor key exists (local video demo); the deployed app is always the real mainnet wallet.
function detectNetwork(): Network {
  try {
    const params = new URLSearchParams(location.search)
    return params.has('testnet') && import.meta.env.VITE_PIMLICO_KEY ? 'testnet' : 'mainnet'
  } catch {
    return 'mainnet'
  }
}

export const NETWORK: Network = detectNetwork()
export const ACTIVE: NetNumbers = NUMBERS[NETWORK]
