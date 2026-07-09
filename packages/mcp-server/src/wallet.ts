import type { AgentWallet } from './engine'

/**
 * Live mode: a real WDK wallet on Arbitrum. Loaded lazily (dynamic import) so the demo mode
 * never pulls in the WDK runtime. Payments are gasless — the fee is taken from the USDT itself.
 */
export async function createLiveWallet(seed: string): Promise<AgentWallet> {
  const { MatchdayWallet } = await import('@matchday/wallet-multichain')
  const w = new MatchdayWallet({ seed })
  return {
    address: () => w.getAddress('arbitrum'),
    getUsdtBalance: () => w.getUsdtBalance('arbitrum'),
    transfer: async (recipient, amountBase) => {
      const r = await w.transfer('arbitrum', { recipient, amount: amountBase })
      return { explorerUrl: r.explorerUrl, feeUsdt: r.feeUsdt, settledHash: r.settledHash }
    },
  }
}
