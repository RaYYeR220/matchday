import type { Chain } from './chains'

export type { Chain }

export interface TransferInput {
  recipient: string
  amount: bigint
}

export interface TransferReceipt {
  chain: Chain
  submittedHash: string
  settledHash: string | null
  explorerUrl: string
  feeUsdt: bigint
}

/** Minimal surface the SDK depends on — lets tests inject a fake wallet (no network). */
export interface MatchdayWalletLike {
  getUsdtBalance(chain: Chain): Promise<bigint>
  transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt>
}
