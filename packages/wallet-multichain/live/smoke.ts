import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
config({ path: fileURLToPath(new URL('../../../spikes/.env', import.meta.url)) })
import { MatchdayWallet, formatUsdt, type Chain } from '../src/index'

// Gated integration smoke: real gasless self-transfers via MatchdayWallet.
// Run from repo root: RUN_LIVE=1 pnpm exec tsx packages/wallet-multichain/live/smoke.ts
if (!process.env.RUN_LIVE) {
  console.log('set RUN_LIVE=1 to run live (spends a few cents of USDT)')
  process.exit(0)
}

const wallet = new MatchdayWallet({
  seed: process.env.SPIKE_SEED_PHRASE!,
  arbitrumRpc: process.env.ARBITRUM_RPC,
  ton: { tonCenterKey: process.env.TON_TONCENTER_KEY },
})

for (const chain of ['arbitrum', 'ton'] as Chain[]) {
  try {
    const addr = await wallet.getAddress(chain)
    const bal = await wallet.getUsdtBalance(chain)
    console.log(`\n[${chain}] ${addr}  balance=${formatUsdt(bal)} USDT`)
    const r = await wallet.transfer(chain, { recipient: addr, amount: 100000n })
    console.log(`[${chain}] submitted=${r.submittedHash}`)
    console.log(`[${chain}] settled=${r.settledHash}  fee=${formatUsdt(r.feeUsdt)} USDT`)
    console.log(`[${chain}] ${r.explorerUrl}`)
  } catch (e) {
    console.error(`[${chain}] FAILED:`, (e as Error).message)
  }
}
