import { expect, test } from 'vitest'
import { contributionProgress, createPool, poolShareUrl, type Pool } from './pools'

test('createPool fills id/createdAt from injected generators', () => {
  const p = createPool(
    { name: 'Final watch party', chain: 'arbitrum', recipient: '0xabc', targetUsdt: 100_000_000n },
    { id: () => 'pool_1', now: () => 1700 },
  )
  expect(p).toEqual({ id: 'pool_1', name: 'Final watch party', chain: 'arbitrum', recipient: '0xabc', targetUsdt: 100_000_000n, createdAt: 1700 })
})

test('poolShareUrl builds a stable link, trimming a trailing slash', () => {
  const p = { id: 'pool_1' } as Pool
  expect(poolShareUrl('https://matchday.app/', p)).toBe('https://matchday.app/p/pool_1')
  expect(poolShareUrl('https://matchday.app', p)).toBe('https://matchday.app/p/pool_1')
})

test('contributionProgress clamps pct 0..100 and flags reached at/over target', () => {
  const p = { targetUsdt: 100_000_000n } as Pool
  expect(contributionProgress(p, 0n)).toEqual({ pct: 0, reached: false })
  expect(contributionProgress(p, 25_000_000n)).toEqual({ pct: 25, reached: false })
  expect(contributionProgress(p, 100_000_000n)).toEqual({ pct: 100, reached: true })
  expect(contributionProgress(p, 150_000_000n)).toEqual({ pct: 100, reached: true })
})

test('contributionProgress with no target is inert', () => {
  expect(contributionProgress({} as Pool, 50n)).toEqual({ pct: 0, reached: false })
})
