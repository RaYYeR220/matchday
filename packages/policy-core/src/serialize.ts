import { encodeAbiParameters, keccak256, stringToBytes } from 'viem'
import type { PolicyRules } from './types'

export function categoryId(category: string): `0x${string}` {
  return keccak256(stringToBytes(category))
}

export function serializeRules(rules: PolicyRules): `0x${string}` {
  const entries = Object.entries(rules.perCategoryCaps)
    .map(([k, v]) => [categoryId(k), v] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return encodeAbiParameters(
    [
      { type: 'uint256' }, // totalBudget
      { type: 'uint64' }, // window.start
      { type: 'uint64' }, // window.end
      { type: 'address[]' }, // allowlist (normalized)
      { type: 'bytes32[]' }, // category ids (sorted)
      { type: 'uint256[]' }, // caps (aligned with ids)
    ],
    [
      rules.totalBudget,
      BigInt(rules.window.start),
      BigInt(rules.window.end),
      rules.allowlist.map((a) => a.toLowerCase()) as `0x${string}`[],
      entries.map((e) => e[0]),
      entries.map((e) => e[1]),
    ],
  )
}

export function rulesHash(rules: PolicyRules): `0x${string}` {
  return keccak256(serializeRules(rules))
}
