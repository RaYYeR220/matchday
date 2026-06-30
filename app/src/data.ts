import type { PolicyRules, PolicyState } from '@matchday/policy-core'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'

/** Allowlisted demo recipient (a vendor/host we set up before the match). */
export const PAYEE = '0x000000000000000000000000000000000000dEaD'

export interface Category { key: string; label: string; icon: string; payee: string; coinClass: string }

export const CATEGORIES: Category[] = [
  { key: 'bar', label: 'Bar & Food', icon: '🍺', payee: 'Stadium Beer Stand #7', coinClass: '' },
  { key: 'cheers', label: 'Cheers', icon: '📣', payee: 'Stream · ElTrincheraTV', coinClass: '' },
  { key: 'merch', label: 'Merch', icon: '🧣', payee: 'Official Merch Stand', coinClass: '' },
  { key: 'pool', label: 'Group Pot', icon: '🤝', payee: 'Bombonera Watch Party', coinClass: '' },
]

const U = 1_000_000n // 1 USD₮ (6 decimals)

/** The rules the fan sets before the match — enforced before every payment. */
export const RULES: PolicyRules = {
  totalBudget: 100n * U,
  perCategoryCaps: { bar: 40n * U, cheers: 20n * U, merch: 30n * U, pool: 30n * U, wager: 20n * U, unlock: 10n * U },
  perCategoryStakeCaps: { cheers: 5n * U, wager: 5n * U }, // no single cheer/wager over 5 USD₮ (anti tilt)
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
  { id: 'xg', emoji: '📊', title: 'Live xG & shot map', blurb: 'Expected-goals feed + every shot, live.', price: 0.5, body: 'ARG 2.7 xG · FRA 1.4 xG · 18 shots, 7 on target' },
  { id: 'tac', emoji: '🎥', title: 'Tactical cam', blurb: 'Wide tactical angle, full pitch.', price: 1, body: '▶ Tactical cam — full-pitch feed unlocked' },
  { id: 'heat', emoji: '🔥', title: 'Player heatmaps', blurb: 'Live positioning for both XIs.', price: 0.5, body: 'Messi heatmap: right half-space, deep playmaking' },
]

/** Seeded mid-match state: 62 spent, Merch near its 30 cap. */
export const SEED_STATE: PolicyState = {
  totalSpent: 62n * U,
  spentByCategory: { bar: 30n * U, cheers: 4n * U, merch: 28n * U },
  lastSpentAt: {},
}

export const CHAINS: { key: Chain; label: string; coin: string; cls: string; addr: string }[] = [
  { key: 'arbitrum', label: 'Arbitrum', coin: 'AR', cls: 'arb', addr: '0x0A…cd24' },
  { key: 'ton', label: 'TON', coin: 'TON', cls: 'ton', addr: 'UQDG…pfSk' },
  { key: 'tron', label: 'TRON', coin: 'TR', cls: 'trx', addr: 'TLnt…28ird' },
]

export const BALANCES: Record<Chain, bigint> = { arbitrum: 38_200_000n, ton: 12_500_000n, tron: 9_000_000n }

const FEE: Record<Chain, bigint> = { arbitrum: 44_000n, ton: 6_600n, tron: 1_500_000n }
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')

/** Demo wallet: real policy engine runs on top; transfers are simulated with realistic receipts.
 *  (The same MatchdayWalletLike interface the real WDK-backed wallet implements — see spec §12 for the
 *   verified mainnet gasless transactions this stands in for.) */
export class DemoWallet implements MatchdayWalletLike {
  async getUsdtBalance(chain: Chain) { return BALANCES[chain] }
  async transfer(chain: Chain, _input: TransferInput): Promise<TransferReceipt> {
    await new Promise((r) => setTimeout(r, 600))
    const h = '0x' + hex(64)
    const id = chain === 'arbitrum' ? h : h.slice(2)
    const explorerUrl =
      chain === 'arbitrum' ? `https://arbiscan.io/tx/${id}`
      : chain === 'ton' ? `https://tonviewer.com/transaction/${id}`
      : `https://tronscan.org/#/transaction/${id}`
    return { chain, submittedHash: h, settledHash: id, explorerUrl, feeUsdt: FEE[chain] }
  }
}

export const fmt = (base: bigint) => {
  const whole = base / U, frac = base % U
  return frac === 0n ? whole.toString() : (whole + '.' + frac.toString().padStart(6, '0').replace(/0+$/, ''))
}
