import { describe, expect, test } from 'vitest'
import { PolicyGuard, InMemoryStateStore, PolicyViolationError } from '@matchday/policy-guard'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'
import type { PolicyRules } from '@matchday/policy-core'
import { Matchday } from './matchday'

const ADDR = '0x000000000000000000000000000000000000dEaD'
const rules: PolicyRules = {
  totalBudget: 10_000_000n,
  perCategoryCaps: { tips: 3_000_000n },
  allowlist: [ADDR],
  window: { start: 0, end: 2_000_000_000 },
}

class FakeWallet implements MatchdayWalletLike {
  calls: Array<{ chain: Chain; input: TransferInput }> = []
  async getUsdtBalance(chain: Chain): Promise<bigint> {
    return chain === 'arbitrum' ? 5_000_000n : 0n
  }
  async transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt> {
    this.calls.push({ chain, input })
    return { chain, submittedHash: '0xfake', settledHash: '0xfake', explorerUrl: 'https://x/tx/0xfake', feeUsdt: 1000n }
  }
}

function sut() {
  const wallet = new FakeWallet()
  const guard = new PolicyGuard(new InMemoryStateStore())
  const md = new Matchday({ wallet, guard, rules, userKey: 'u', now: () => 1000 })
  return { wallet, md }
}

describe('Matchday.payGated', () => {
  test('within budget: transfers once and returns the receipt', async () => {
    const { wallet, md } = sut()
    const r = await md.payGated('arbitrum', { recipient: ADDR, amount: 2_000_000n, category: 'tips' })
    expect(r.settledHash).toBe('0xfake')
    expect(wallet.calls).toHaveLength(1)
    expect(wallet.calls[0]).toEqual({ chain: 'arbitrum', input: { recipient: ADDR, amount: 2_000_000n } })
  })

  test('over a category cap: rejects and never calls the wallet', async () => {
    const { wallet, md } = sut()
    await expect(md.payGated('arbitrum', { recipient: ADDR, amount: 5_000_000n, category: 'tips' }))
      .rejects.toBeInstanceOf(PolicyViolationError)
    expect(wallet.calls).toHaveLength(0)
  })

  test('balances aggregates per chain', async () => {
    const { md } = sut()
    expect(await md.balances(['arbitrum', 'ton'])).toEqual({ arbitrum: 5_000_000n, ton: 0n })
  })
})
