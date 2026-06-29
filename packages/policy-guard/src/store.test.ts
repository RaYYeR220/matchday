import { expect, test } from 'vitest'
import { InMemoryStateStore } from './store'
import { emptyState } from '@matchday/policy-core'

test('InMemoryStateStore returns emptyState for unknown key, persists writes', async () => {
  const s = new InMemoryStateStore()
  expect(await s.get('alice')).toEqual(emptyState())
  await s.set('alice', { totalSpent: 5n, spentByCategory: { tips: 5n } })
  expect(await s.get('alice')).toEqual({ totalSpent: 5n, spentByCategory: { tips: 5n } })
})
