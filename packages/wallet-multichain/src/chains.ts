export type Chain = 'arbitrum' | 'ton' | 'tron'

export interface ChainConfig {
  usdt: string
  decimals: number
  explorerTx: (id: string) => string
}

/** Confirmed mainnet config from the Plan-1 spikes (spec §12). */
export const CHAINS: Record<Chain, ChainConfig> = {
  arbitrum: {
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    explorerTx: (id) => `https://arbiscan.io/tx/${id}`,
  },
  ton: {
    usdt: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    decimals: 6,
    explorerTx: (id) => `https://tonviewer.com/transaction/${id}`,
  },
  tron: {
    usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    explorerTx: (id) => `https://tronscan.org/#/transaction/${id}`,
  },
}

export function explorerUrl(chain: Chain, id: string): string {
  return CHAINS[chain].explorerTx(id)
}

/** Render USDT base units (6 decimals) as a trimmed decimal string. */
export function formatUsdt(base: bigint): string {
  const neg = base < 0n
  const v = neg ? -base : base
  const whole = v / 1_000_000n
  const frac = v % 1_000_000n
  let s = whole.toString()
  if (frac > 0n) s += '.' + frac.toString().padStart(6, '0').replace(/0+$/, '')
  return neg ? '-' + s : s
}
