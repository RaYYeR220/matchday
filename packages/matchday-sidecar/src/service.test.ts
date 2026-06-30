import { describe, expect, it } from 'vitest'
import { InMemoryStateStore, PolicyViolationError } from '@matchday/policy-guard'
import type { PolicyRules } from '@matchday/policy-core'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'
import { MatchdaySidecar } from './service'

const U = 1_000_000n

const RULES: PolicyRules = {
  totalBudget: 100n * U,
  perCategoryCaps: { bar: 40n * U, merch: 30n * U },
  perCategoryStakeCaps: { cheers: 5n * U },
  cooldownSeconds: {},
  allowlist: ['0x000000000000000000000000000000000000dEaD'],
  window: { start: 0, end: 4_000_000_000 },
}
const PAYEE = '0x000000000000000000000000000000000000dEaD'

/** Records calls and returns canned receipts — no network. */
class FakeWallet implements MatchdayWalletLike {
  transfers: { chain: Chain; input: TransferInput }[] = []
  balances: Record<Chain, bigint> = { arbitrum: 5n * U, ton: 2n * U, tron: 1n * U }
  async getUsdtBalance(chain: Chain) {
    return this.balances[chain]
  }
  async transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt> {
    this.transfers.push({ chain, input })
    return { chain, submittedHash: '0xsub', settledHash: '0xset', explorerUrl: 'https://x/0xset', feeUsdt: 44_000n }
  }
}

function build(now = () => 1_000_000) {
  const wallet = new FakeWallet()
  const store = new InMemoryStateStore()
  const sc = new MatchdaySidecar({ wallet, store, rules: RULES, userKey: 'me', now })
  return { sc, wallet, store }
}

describe('MatchdaySidecar', () => {
  it('returns balances for all chains', async () => {
    const { sc } = build()
    expect(await sc.balances()).toEqual({ arbitrum: 5n * U, ton: 2n * U, tron: 1n * U })
  })

  it('omits a chain whose balance lookup throws (fault-tolerant)', async () => {
    const wallet = new FakeWallet()
    wallet.getUsdtBalance = async (c: Chain) => {
      if (c === 'tron') throw new Error('provider down')
      return wallet.balances[c]
    }
    const sc = new MatchdaySidecar({ wallet, store: new InMemoryStateStore(), rules: RULES, userKey: 'me' })
    expect(await sc.balances()).toEqual({ arbitrum: 5n * U, ton: 2n * U })
  })

  it('transfer() executes a raw gasless transfer (no policy gate)', async () => {
    const { sc, wallet } = build()
    const r = await sc.transfer({ chain: 'arbitrum', recipient: PAYEE, amount: 2n * U })
    expect(r.feeUsdt).toBe(44_000n)
    expect(wallet.transfers).toHaveLength(1)
  })

  it('pay() within policy succeeds and advances spend state', async () => {
    const { sc, wallet } = build()
    const r = await sc.pay({ chain: 'arbitrum', category: 'bar', recipient: PAYEE, amount: 3n * U })
    expect(r.settledHash).toBe('0xset')
    expect(wallet.transfers).toHaveLength(1)
    const snap = await sc.policy()
    expect(snap.state.totalSpent).toBe(3n * U)
    expect(snap.state.spentByCategory.bar).toBe(3n * U)
  })

  it('pay() over a category cap is blocked and never touches the wallet', async () => {
    const { sc, wallet } = build()
    await expect(
      sc.pay({ chain: 'arbitrum', category: 'merch', recipient: PAYEE, amount: 31n * U }),
    ).rejects.toBeInstanceOf(PolicyViolationError)
    expect(wallet.transfers).toHaveLength(0)
    const snap = await sc.policy()
    expect(snap.state.totalSpent).toBe(0n)
  })

  it('pay() to a non-allowlisted destination is blocked', async () => {
    const { sc } = build()
    await expect(
      sc.pay({ chain: 'arbitrum', category: 'bar', recipient: '0x0000000000000000000000000000000000000001', amount: 1n * U }),
    ).rejects.toBeInstanceOf(PolicyViolationError)
  })

  it('policy() exposes rules, live state and an optional on-chain snapshot', async () => {
    const wallet = new FakeWallet()
    const store = new InMemoryStateStore()
    const onchain = async () => ({ guard: '0xGUARD', owner: '0xOWNER', totalBudget: 100n * U, totalSpent: 1n * U, committed: true })
    const sc = new MatchdaySidecar({ wallet, store, rules: RULES, userKey: 'me', onchain })
    const snap = await sc.policy()
    expect(snap.rules.totalBudget).toBe(100n * U)
    expect(snap.onchain?.guard).toBe('0xGUARD')
    expect(snap.onchain?.committed).toBe(true)
  })
})
