import { describe, expect, test } from 'vitest'
import { evaluate, normalizeAddress } from './evaluate'
import type { PolicyRules, PolicyState } from './types'

const ADDR = '0x000000000000000000000000000000000000dEaD'
const rules: PolicyRules = {
  totalBudget: 100_000_000n,
  perCategoryCaps: { tips: 20_000_000n },
  allowlist: [ADDR],
  window: { start: 100, end: 200 },
}
const fresh: PolicyState = { totalSpent: 0n, spentByCategory: {} }

describe('evaluate', () => {
  test('allows a valid in-budget, in-window, allowlisted, capped spend', () => {
    expect(evaluate(rules, fresh, { amount: 5_000_000n, category: 'tips', to: ADDR, timestamp: 150 }))
      .toEqual({ allowed: true })
  })
  test('rejects zero/negative amount', () => {
    expect(evaluate(rules, fresh, { amount: 0n, category: 'tips', to: ADDR, timestamp: 150 }).reason)
      .toBe('INVALID_AMOUNT')
  })
  test('rejects outside the time window (before and after, inclusive bounds allowed)', () => {
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: ADDR, timestamp: 99 }).reason).toBe('OUTSIDE_WINDOW')
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: ADDR, timestamp: 201 }).reason).toBe('OUTSIDE_WINDOW')
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: ADDR, timestamp: 100 }).allowed).toBe(true)
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: ADDR, timestamp: 200 }).allowed).toBe(true)
  })
  test('rejects a destination not on the allowlist (case-insensitive match)', () => {
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: '0xabc', timestamp: 150 }).reason)
      .toBe('DESTINATION_NOT_ALLOWED')
    expect(evaluate(rules, fresh, { amount: 1n, category: 'tips', to: ADDR.toUpperCase(), timestamp: 150 }).allowed)
      .toBe(true)
  })
  test('rejects exceeding total budget (boundary: equal is allowed)', () => {
    const state = { totalSpent: 99_000_000n, spentByCategory: {} }
    expect(evaluate(rules, state, { amount: 1_000_000n, category: 'tips', to: ADDR, timestamp: 150 }).allowed).toBe(true)
    expect(evaluate(rules, state, { amount: 1_000_001n, category: 'tips', to: ADDR, timestamp: 150 }).reason)
      .toBe('TOTAL_BUDGET_EXCEEDED')
  })
  test('rejects exceeding a category cap (boundary: equal allowed)', () => {
    const state = { totalSpent: 0n, spentByCategory: { tips: 19_000_000n } }
    expect(evaluate(rules, state, { amount: 1_000_000n, category: 'tips', to: ADDR, timestamp: 150 }).allowed).toBe(true)
    expect(evaluate(rules, state, { amount: 1_000_001n, category: 'tips', to: ADDR, timestamp: 150 }).reason)
      .toBe('CATEGORY_CAP_EXCEEDED')
  })
  test('a category with no cap is unconstrained per-category but still bound by total', () => {
    expect(evaluate(rules, fresh, { amount: 50_000_000n, category: 'merch', to: ADDR, timestamp: 150 }).allowed).toBe(true)
  })
  test('precedence: window checked before allowlist before budget', () => {
    expect(evaluate(rules, fresh, { amount: 999_000_000n, category: 'tips', to: '0xabc', timestamp: 99 }).reason)
      .toBe('OUTSIDE_WINDOW')
  })
  test('normalizeAddress trims and lowercases', () => {
    expect(normalizeAddress('  0xAbC ')).toBe('0xabc')
  })
  test('rejects a single spend over the per-category stake cap (boundary: equal allowed)', () => {
    const r = { ...rules, perCategoryStakeCaps: { tips: 2_000_000n } }
    expect(evaluate(r, fresh, { amount: 2_000_000n, category: 'tips', to: ADDR, timestamp: 150 }).allowed).toBe(true)
    expect(evaluate(r, fresh, { amount: 2_000_001n, category: 'tips', to: ADDR, timestamp: 150 }).reason).toBe('STAKE_CAP_EXCEEDED')
  })
  test('enforces cooldown between spends in a category (boundary: equal elapsed allowed)', () => {
    const r = { ...rules, window: { start: 0, end: 2_000_000_000 }, cooldownSeconds: { tips: 60 } }
    const state = { totalSpent: 0n, spentByCategory: {}, lastSpentAt: { tips: 1000 } }
    expect(evaluate(r, state, { amount: 1n, category: 'tips', to: ADDR, timestamp: 1040 }).reason).toBe('COOLDOWN_ACTIVE')
    expect(evaluate(r, state, { amount: 1n, category: 'tips', to: ADDR, timestamp: 1060 }).allowed).toBe(true)
    expect(evaluate(r, state, { amount: 1n, category: 'merch', to: ADDR, timestamp: 1040 }).allowed).toBe(true)
  })
})
