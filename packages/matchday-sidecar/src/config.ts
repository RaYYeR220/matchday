import type { PolicyRules } from '@matchday/policy-core'
import { InMemoryStateStore } from '@matchday/policy-guard'
import { CHAINS, MatchdayWallet, type WalletOpts } from '@matchday/wallet-multichain'
import { MatchdaySidecar, type PremiumItem } from './service'
import { GUARD_ADDRESS, makeOnchainReader } from './onchain'

const U = 1_000_000n
const PAYEE = '0x000000000000000000000000000000000000dEaD'

/** The demo matchday policy (mirrors the rules the app ships and the on-chain commit). */
export const DEMO_RULES: PolicyRules = {
  totalBudget: 100n * U,
  perCategoryCaps: { bar: 40n * U, cheers: 20n * U, merch: 30n * U, pool: 30n * U, wager: 20n * U, unlock: 10n * U },
  perCategoryStakeCaps: { cheers: 5n * U, wager: 5n * U },
  cooldownSeconds: { cheers: 30, wager: 30 },
  allowlist: [PAYEE],
  window: { start: 0, end: 4_000_000_000 },
}

/** Second-screen premium catalog unlocked pay-per-view via x402. */
export const DEMO_PREMIUM: Record<string, PremiumItem> = {
  xg: { title: 'Live xG & shot map', price: 500_000n, content: 'ARG 2.7 xG · FRA 1.4 xG · 18 shots, 7 on target' },
  tac: { title: 'Tactical cam', price: 1_000_000n, content: 'Tactical cam — full-pitch feed unlocked' },
  heat: { title: 'Player heatmaps', price: 500_000n, content: 'Messi heatmap: right half-space, deep playmaking' },
}

function req(name: string, ...fallbacks: string[]): string {
  for (const n of [name, ...fallbacks]) {
    const v = process.env[n]
    if (v) return v
  }
  throw new Error(`missing env ${name}`)
}

/** Builds a live, WDK-backed sidecar from environment variables. */
export function buildFromEnv(env: NodeJS.ProcessEnv = process.env): MatchdaySidecar {
  const seed = req('MATCHDAY_SEED', 'SPIKE_SEED_PHRASE')
  const opts: WalletOpts = {
    seed,
    arbitrumRpc: env.ARBITRUM_RPC,
    ton: { tonCenterKey: env.TON_TONCENTER_KEY, tonApiKey: env.TON_TONAPI_KEY },
  }
  const gfKey = env.GASFREE_API_KEY ?? env.GASFREE_MAINNET_API_KEY
  const gfSecret = env.GASFREE_API_SECRET ?? env.GASFREE_MAINNET_API_SECRET
  if (gfKey && gfSecret) opts.tron = { apiKey: gfKey, apiSecret: gfSecret }

  const owner = env.GUARD_OWNER ?? '0xa5a35C55aE15934a7476C3c9BDbdBB7a2d56f261'
  return new MatchdaySidecar({
    wallet: new MatchdayWallet(opts),
    store: new InMemoryStateStore(),
    rules: DEMO_RULES,
    userKey: 'me',
    onchain: makeOnchainReader({ rpc: env.ARBITRUM_RPC, guard: env.GUARD_ADDRESS ?? GUARD_ADDRESS, owner }),
    premium: DEMO_PREMIUM,
    payTo: PAYEE,
    usdt: CHAINS.arbitrum.usdt,
  })
}
