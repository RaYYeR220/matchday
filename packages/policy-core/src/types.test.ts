import { expect, test } from 'vitest'
import type { PolicyRules, SpendRequest } from './types'

test('a PolicyRules object is well-formed and amounts are bigint', () => {
  const rules: PolicyRules = {
    totalBudget: 100_000_000n, // 100 USDT
    perCategoryCaps: { tips: 20_000_000n },
    allowlist: ['0x000000000000000000000000000000000000dEaD'],
    window: { start: 1, end: 9_999_999_999 },
  }
  const req: SpendRequest = { amount: 1n, category: 'tips', to: rules.allowlist[0], timestamp: 2 }
  expect(typeof rules.totalBudget).toBe('bigint')
  expect(typeof req.amount).toBe('bigint')
})
