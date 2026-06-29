import type { Chain } from '@matchday/wallet-multichain'

export interface Pool {
  id: string
  name: string
  chain: Chain
  recipient: string
  targetUsdt?: bigint
  createdAt: number
}

export interface CreatePoolInput {
  name: string
  chain: Chain
  recipient: string
  targetUsdt?: bigint
}

/** Host side: create a fan-pool / watch-party tip-jar. `id`/`now` injected for determinism + testability. */
export function createPool(input: CreatePoolInput, deps: { id: () => string; now: () => number }): Pool {
  return {
    id: deps.id(),
    name: input.name,
    chain: input.chain,
    recipient: input.recipient,
    targetUsdt: input.targetUsdt,
    createdAt: deps.now(),
  }
}

export function poolShareUrl(baseUrl: string, pool: Pool): string {
  return `${baseUrl.replace(/\/$/, '')}/p/${pool.id}`
}

export function contributionProgress(pool: Pool, receivedBase: bigint): { pct: number; reached: boolean } {
  if (!pool.targetUsdt || pool.targetUsdt <= 0n) return { pct: 0, reached: false }
  const pctRaw = Number((receivedBase * 10_000n) / pool.targetUsdt) / 100
  return { pct: Math.max(0, Math.min(100, pctRaw)), reached: receivedBase >= pool.targetUsdt }
}
