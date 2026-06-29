import { encodeAbiParameters, keccak256, stringToBytes } from 'viem'
import type { PolicyRules } from './types'

export function categoryId(category: string): `0x${string}` {
  return keccak256(stringToBytes(category))
}

/** Sort a per-category map into (categoryId, value) pairs ascending by id, for deterministic encoding. */
function sortedPairs(rec: Record<string, bigint | number> | undefined): Array<[`0x${string}`, bigint]> {
  return Object.entries(rec ?? {})
    .map(([k, v]) => [categoryId(k), BigInt(v)] as [`0x${string}`, bigint])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

export function serializeRules(rules: PolicyRules): `0x${string}` {
  const caps = sortedPairs(rules.perCategoryCaps)
  const stakes = sortedPairs(rules.perCategoryStakeCaps)
  const cools = sortedPairs(rules.cooldownSeconds)
  return encodeAbiParameters(
    [
      { type: 'uint256' }, // totalBudget
      { type: 'uint64' }, // window.start
      { type: 'uint64' }, // window.end
      { type: 'address[]' }, // allowlist (normalized)
      { type: 'bytes32[]' }, // cap category ids
      { type: 'uint256[]' }, // caps
      { type: 'bytes32[]' }, // stake-cap category ids
      { type: 'uint256[]' }, // stake caps
      { type: 'bytes32[]' }, // cooldown category ids
      { type: 'uint64[]' }, // cooldown seconds
    ],
    [
      rules.totalBudget,
      BigInt(rules.window.start),
      BigInt(rules.window.end),
      rules.allowlist.map((a) => a.toLowerCase()) as `0x${string}`[],
      caps.map((e) => e[0]),
      caps.map((e) => e[1]),
      stakes.map((e) => e[0]),
      stakes.map((e) => e[1]),
      cools.map((e) => e[0]),
      cools.map((e) => e[1]),
    ],
  )
}

export function rulesHash(rules: PolicyRules): `0x${string}` {
  return keccak256(serializeRules(rules))
}
