import { describe, expect, test } from 'vitest'
import { PolicyGuard } from './guard'
import { InMemoryStateStore } from './store'
import { PolicyViolationError } from './errors'
import type { PolicyRules, SpendRequest } from '@matchday/policy-core'

const ADDR = '0x000000000000000000000000000000000000dEaD'
const rules: PolicyRules = {
  totalBudget: 10_000_000n,
  perCategoryCaps: { tips: 3_000_000n },
  allowlist: [ADDR],
  window: { start: 0, end: 2_000_000_000 },
}
const req = (amount: bigint, category = 'tips'): SpendRequest => ({ amount, category, to: ADDR, timestamp: 1000 })

describe('PolicyGuard', () => {
  test('check throws PolicyViolationError with the reason on a denied spend', async () => {
    const g = new PolicyGuard(new InMemoryStateStore())
    await expect(g.check('u', rules, req(5_000_000n))).rejects.toMatchObject({ reason: 'CATEGORY_CAP_EXCEEDED' })
    await expect(g.check('u', rules, req(5_000_000n))).rejects.toBeInstanceOf(PolicyViolationError)
  })
  test('run executes and advances state only on success', async () => {
    const store = new InMemoryStateStore()
    const g = new PolicyGuard(store)
    const out = await g.run('u', rules, req(2_000_000n), async () => 'tx1')
    expect(out).toBe('tx1')
    expect((await store.get('u')).totalSpent).toBe(2_000_000n)
  })
  test('run does NOT advance state if exec throws', async () => {
    const store = new InMemoryStateStore()
    const g = new PolicyGuard(store)
    await expect(g.run('u', rules, req(2_000_000n), async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect((await store.get('u')).totalSpent).toBe(0n)
  })
  test('run blocks before exec on violation (exec never called)', async () => {
    const store = new InMemoryStateStore()
    const g = new PolicyGuard(store)
    let called = false
    await expect(
      g.run('u', rules, req(99_000_000n), async () => { called = true; return 'x' }),
    ).rejects.toBeInstanceOf(PolicyViolationError)
    expect(called).toBe(false)
  })
})
