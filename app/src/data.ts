import type { PolicyRules } from '@matchday/policy-core'

/** Allowlisted demo recipient (a vendor/host we set up before the match). */
export const PAYEE = '0x000000000000000000000000000000000000dEaD'

export interface Category { key: string; label: string; icon: string; payee: string }

export const CATEGORIES: Category[] = [
  { key: 'bar', label: 'Bar & Food', icon: '🍺', payee: 'Stadium Beer Stand #7' },
  { key: 'cheers', label: 'Cheers', icon: '📣', payee: 'Stream · ElTrincheraTV' },
  { key: 'merch', label: 'Merch', icon: '🧣', payee: 'Official Merch Stand' },
  { key: 'pool', label: 'Group Pot', icon: '🤝', payee: 'Bombonera Watch Party' },
]

const U = 1_000_000n // 1 USD₮ (6 decimals)
export const toBase = (n: number) => BigInt(Math.round(n * 1e6))

/** The rules the fan sets before the match — enforced before every payment.
 *  Scaled for a real, lightly-funded matchday wallet so the caps are reachable on-chain. */
export const RULES: PolicyRules = {
  totalBudget: 5n * U,
  perCategoryCaps: { bar: 2n * U, cheers: 1n * U, merch: 1_500_000n, pool: 1_500_000n, wager: 1n * U, unlock: 1n * U },
  perCategoryStakeCaps: { cheers: 500_000n, wager: 500_000n }, // no single cheer/wager over 0.5 USD₮
  cooldownSeconds: { cheers: 30, wager: 30 }, // at most one cheer/wager per 30s
  allowlist: [PAYEE],
  window: { start: 0, end: 4_000_000_000 },
}

/** Friendly P2P wagers — matched against another fan, winner takes the pot. Not a market:
 *  the stake-cap and cooldown above keep it a bit of fun, not tilt-betting. */
export const WAGERS = [
  { id: 'arg-next', emoji: '🇦🇷', label: 'ARG scores next', payout: '1.8×' },
  { id: 'fra-next', emoji: '🇫🇷', label: 'FRA scores next', payout: '2.1×' },
  { id: 'over25', emoji: '⚽', label: 'Over 2.5 goals', payout: '1.6×' },
]

/** Second-screen premium content, unlocked pay-per-view with x402 — a tiny USD₮ tap, no sub. */
export const PREMIUM = [
  { id: 'xg', emoji: '📊', title: 'Live xG & shot map', blurb: 'Expected-goals feed + every shot, live.', price: 0.25, body: 'ARG 2.7 xG · FRA 1.4 xG · 18 shots, 7 on target' },
  { id: 'tac', emoji: '🎥', title: 'Tactical cam', blurb: 'Wide tactical angle, full pitch.', price: 0.5, body: '▶ Tactical cam — full-pitch feed unlocked' },
  { id: 'heat', emoji: '🔥', title: 'Player heatmaps', blurb: 'Live positioning for both XIs.', price: 0.25, body: 'Messi heatmap: right half-space, deep playmaking' },
]

export const fmt = (base: bigint) => {
  const neg = base < 0n
  const v = neg ? -base : base
  const whole = v / U, frac = v % U
  const s = frac === 0n ? whole.toString() : whole + '.' + frac.toString().padStart(6, '0').replace(/0+$/, '')
  return neg ? '-' + s : s
}
