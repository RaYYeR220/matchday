import { expect, test } from 'vitest'
import { keccak256, stringToBytes } from 'viem'
import { categoryId, rulesHash, serializeRules } from './serialize'
import type { PolicyRules } from './types'

const ADDR = '0x000000000000000000000000000000000000dEaD'

test('categoryId is keccak256 of the utf8 string', () => {
  expect(categoryId('tips')).toBe(keccak256(stringToBytes('tips')))
})

test('serialization is deterministic regardless of category insertion order', () => {
  const a: PolicyRules = {
    totalBudget: 100n, perCategoryCaps: { tips: 10n, merch: 20n },
    allowlist: [ADDR], window: { start: 1, end: 2 },
  }
  const b: PolicyRules = {
    totalBudget: 100n, perCategoryCaps: { merch: 20n, tips: 10n },
    allowlist: [ADDR], window: { start: 1, end: 2 },
  }
  expect(serializeRules(a)).toBe(serializeRules(b))
  expect(rulesHash(a)).toBe(rulesHash(b))
})

test('different rules produce different hashes', () => {
  const a: PolicyRules = { totalBudget: 100n, perCategoryCaps: {}, allowlist: [ADDR], window: { start: 1, end: 2 } }
  const b: PolicyRules = { totalBudget: 101n, perCategoryCaps: {}, allowlist: [ADDR], window: { start: 1, end: 2 } }
  expect(rulesHash(a)).not.toBe(rulesHash(b))
})

test('rulesHash equals keccak256 of serializeRules', () => {
  const r: PolicyRules = { totalBudget: 100n, perCategoryCaps: { tips: 10n }, allowlist: [ADDR], window: { start: 1, end: 2 } }
  expect(rulesHash(r)).toBe(keccak256(serializeRules(r)))
})
