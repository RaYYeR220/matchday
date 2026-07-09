import { describe, expect, it } from 'vitest'
import { MatchdayAgentEngine } from './engine'
import { PAYEE, usdt } from './rules'

const mk = (now = () => 1_000_000) => new MatchdayAgentEngine({ demoBalanceUsdt: 5, now })

describe('MatchdayAgentEngine — an agent is bound by the fan policy', () => {
  it('allows a payment within the rules and advances the budget', async () => {
    const e = mk()
    const r = await e.pay('bar', 1)
    expect(r.ok).toBe(true)
    expect(await e.getBalance()).toBe(usdt(4)) // 5 - 1
    const p = await e.getPolicy()
    expect(p.remaining).toBe(usdt(4))
  })

  it('blocks a payment over a category cap', async () => {
    const e = mk()
    const r = await e.pay('bar', 3) // bar cap is 2
    expect(r).toMatchObject({ ok: false, blocked: true, reason: 'CATEGORY_CAP_EXCEEDED' })
    expect(await e.getBalance()).toBe(usdt(5)) // unchanged
  })

  it('blocks a single cheer over the per-tap stake cap (tilt protection)', async () => {
    const e = mk()
    const r = await e.pay('cheers', 0.8) // stake cap 0.5
    expect(r).toMatchObject({ ok: false, reason: 'STAKE_CAP_EXCEEDED' })
  })

  it('blocks a payment to a non-allowlisted recipient', async () => {
    const e = mk()
    const r = await e.pay('bar', 1, '0x1111111111111111111111111111111111111111')
    expect(r).toMatchObject({ ok: false, reason: 'DESTINATION_NOT_ALLOWED' })
  })

  it('blocks once the total matchday budget is exhausted', async () => {
    const e = mk()
    expect((await e.pay('bar', 2)).ok).toBe(true) // 2 (bar cap)
    expect((await e.pay('merch', 1.5)).ok).toBe(true) // 3.5
    expect((await e.pay('pool', 1.5)).ok).toBe(true) // 5.0 — budget exactly spent
    const over = await e.pay('bar', 0.5) // would be 5.5 > budget 5
    expect(over).toMatchObject({ ok: false, reason: 'TOTAL_BUDGET_EXCEEDED' })
  })

  it('enforces the cooldown between cheers', async () => {
    let t = 1_000_000
    const e = mk(() => t)
    expect((await e.pay('cheers', 0.3)).ok).toBe(true)
    const tooSoon = await e.pay('cheers', 0.3) // same second, cooldown 30s
    expect(tooSoon).toMatchObject({ ok: false, reason: 'COOLDOWN_ACTIVE' })
    t += 31
    expect((await e.pay('cheers', 0.3)).ok).toBe(true) // after the cooldown
  })

  it('quote previews without spending', async () => {
    const e = mk()
    const q = await e.quote('bar', 3)
    expect(q).toMatchObject({ allowed: false, reason: 'CATEGORY_CAP_EXCEEDED' })
    expect(await e.getBalance()).toBe(usdt(5)) // quote did not touch state
    const ok = await e.quote('bar', 1)
    expect(ok.allowed).toBe(true)
    expect(ok.to).toBe(PAYEE)
  })

  it('exposes the policy with the on-chain rules hash', async () => {
    const p = await mk().getPolicy()
    expect(p.rulesHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(p.totalBudget).toBe(usdt(5))
    expect(p.live).toBe(false)
  })
})
