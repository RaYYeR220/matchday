import { expect, test } from 'vitest'
import * as api from './index'

test('public API surface is complete', () => {
  for (const name of ['evaluate', 'normalizeAddress', 'emptyState', 'applySpend', 'categoryId', 'serializeRules', 'rulesHash']) {
    expect(typeof (api as Record<string, unknown>)[name]).toBe('function')
  }
})
