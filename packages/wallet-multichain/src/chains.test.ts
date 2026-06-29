import { expect, test } from 'vitest'
import { CHAINS, explorerUrl, formatUsdt } from './chains'

test('chain configs carry the confirmed mainnet USDT addresses', () => {
  expect(CHAINS.arbitrum.usdt).toBe('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9')
  expect(CHAINS.tron.usdt).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
  expect(CHAINS.ton.usdt).toBe('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
})

test('explorerUrl builds per-chain links', () => {
  expect(explorerUrl('arbitrum', '0xabc')).toBe('https://arbiscan.io/tx/0xabc')
  expect(explorerUrl('tron', 'T123')).toBe('https://tronscan.org/#/transaction/T123')
  expect(explorerUrl('ton', 'ev1')).toBe('https://tonviewer.com/transaction/ev1')
})

test('formatUsdt renders 6-decimal base units', () => {
  expect(formatUsdt(43971n)).toBe('0.043971')
  expect(formatUsdt(1_500_000n)).toBe('1.5')
  expect(formatUsdt(0n)).toBe('0')
  expect(formatUsdt(1_000_000n)).toBe('1')
})
