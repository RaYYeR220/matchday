import { expect, test } from 'vitest'
import { applySpend, emptyState } from './state'

test('emptyState starts at zero', () => {
  expect(emptyState()).toEqual({ totalSpent: 0n, spentByCategory: {} })
})

test('applySpend accumulates total and per-category, immutably', () => {
  const s0 = emptyState()
  const s1 = applySpend(s0, { amount: 5n, category: 'tips', to: '0x1', timestamp: 1 })
  const s2 = applySpend(s1, { amount: 3n, category: 'tips', to: '0x1', timestamp: 2 })
  const s3 = applySpend(s2, { amount: 7n, category: 'merch', to: '0x1', timestamp: 3 })
  expect(s3.totalSpent).toBe(15n)
  expect(s3.spentByCategory).toEqual({ tips: 8n, merch: 7n })
  expect(s0).toEqual({ totalSpent: 0n, spentByCategory: {} }) // unchanged
})
