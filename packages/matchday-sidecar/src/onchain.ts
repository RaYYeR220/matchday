import { createPublicClient, http, type Address } from 'viem'
import { arbitrum } from 'viem/chains'
import type { OnchainSnapshot } from './service'

/** Deployed MatchdayPolicyGuard on Arbitrum One (see contracts/README.md). */
export const GUARD_ADDRESS = '0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e' as const

const GUARD_ABI = [
  { type: 'function', name: 'totalBudget', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSpent', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

export interface OnchainReaderOpts {
  rpc?: string
  guard?: string
  owner: string
}

/**
 * Returns a reader that fetches the live on-chain guard state for `owner` — what the
 * deployed contract believes the budget is and how much has been spent. `committed` is
 * true once the owner has called `commit(...)` (budget > 0).
 */
export function makeOnchainReader(opts: OnchainReaderOpts): () => Promise<OnchainSnapshot> {
  const guard = (opts.guard ?? GUARD_ADDRESS) as Address
  const owner = opts.owner as Address
  const client = createPublicClient({ chain: arbitrum, transport: http(opts.rpc) })

  return async () => {
    const [totalBudget, totalSpent] = await Promise.all([
      client.readContract({ address: guard, abi: GUARD_ABI, functionName: 'totalBudget', args: [owner] }),
      client.readContract({ address: guard, abi: GUARD_ABI, functionName: 'totalSpent', args: [owner] }),
    ])
    return { guard, owner, totalBudget, totalSpent, committed: totalBudget > 0n }
  }
}
