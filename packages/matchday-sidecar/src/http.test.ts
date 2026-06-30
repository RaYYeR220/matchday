import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { InMemoryStateStore } from '@matchday/policy-guard'
import type { PolicyRules } from '@matchday/policy-core'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'
import { MatchdaySidecar } from './service'
import { createServer } from './http'

const U = 1_000_000n
const PAYEE = '0x000000000000000000000000000000000000dEaD'
const RULES: PolicyRules = {
  totalBudget: 100n * U,
  perCategoryCaps: { bar: 40n * U, merch: 30n * U },
  perCategoryStakeCaps: {},
  cooldownSeconds: {},
  allowlist: [PAYEE],
  window: { start: 0, end: 4_000_000_000 },
}

class FakeWallet implements MatchdayWalletLike {
  async getUsdtBalance(chain: Chain) {
    return ({ arbitrum: 5n * U, ton: 2n * U, tron: 1n * U })[chain]
  }
  async transfer(chain: Chain, _input: TransferInput): Promise<TransferReceipt> {
    return { chain, submittedHash: '0xsub', settledHash: '0xset', explorerUrl: 'https://arbiscan.io/tx/0xset', feeUsdt: 44_000n }
  }
}

let server: Server
let base: string

const PREMIUM = { xg: { title: 'Live xG', price: 500_000n, content: 'secret-xg-feed' } }

beforeAll(async () => {
  const sc = new MatchdaySidecar({
    wallet: new FakeWallet(),
    store: new InMemoryStateStore(),
    rules: RULES,
    userKey: 'me',
    now: () => 1_000_000,
    premium: PREMIUM,
    payTo: PAYEE,
    usdt: '0xUSDT',
  })
  server = createServer(sc)
  await new Promise<void>((r) => server.listen(0, r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

describe('sidecar http', () => {
  it('GET /health', async () => {
    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('sets permissive CORS headers', async () => {
    const res = await fetch(`${base}/health`)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('GET /balances serializes bigints as strings', async () => {
    const res = await fetch(`${base}/balances`)
    const body = await res.json()
    expect(body.balances.arbitrum).toBe('5000000')
    expect(body.balances.ton).toBe('2000000')
  })

  it('POST /pay within policy returns a receipt', async () => {
    const res = await fetch(`${base}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'arbitrum', category: 'bar', recipient: PAYEE, amount: '3000000' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.receipt.explorerUrl).toBe('https://arbiscan.io/tx/0xset')
    expect(body.receipt.feeUsdt).toBe('44000')
  })

  it('POST /pay over a cap returns 409 with the violation reason', async () => {
    const res = await fetch(`${base}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'arbitrum', category: 'merch', recipient: PAYEE, amount: '31000000' }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('policy')
    expect(body.reason).toBe('CATEGORY_CAP_EXCEEDED')
  })

  it('GET /policy returns rules + state with bigints as strings', async () => {
    const res = await fetch(`${base}/policy`)
    const body = await res.json()
    expect(body.rules.totalBudget).toBe('100000000')
    expect(typeof body.state.totalSpent).toBe('string')
  })

  it('unknown route is 404', async () => {
    const res = await fetch(`${base}/nope`)
    expect(res.status).toBe(404)
  })
})

describe('sidecar x402 second-screen', () => {
  it('GET /premium lists items', async () => {
    const res = await fetch(`${base}/premium`)
    const body = await res.json()
    expect(body.items[0]).toMatchObject({ id: 'xg', unlocked: false, price: '500000' })
  })

  it('GET a locked resource answers 402 with x402 payment requirements', async () => {
    const res = await fetch(`${base}/premium/xg`)
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.x402Version).toBe(1)
    expect(body.accepts[0]).toMatchObject({ scheme: 'exact', network: 'arbitrum', maxAmountRequired: '500000', payTo: PAYEE })
  })

  it('POST unlock pays (policy-gated) and returns the content', async () => {
    const res = await fetch(`${base}/premium/xg/unlock`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content).toBe('secret-xg-feed')
    expect(body.receipt.explorerUrl).toContain('arbiscan')
  })

  it('GET the resource after unlocking returns 200 with the content', async () => {
    const res = await fetch(`${base}/premium/xg`)
    expect(res.status).toBe(200)
    expect((await res.json()).content).toBe('secret-xg-feed')
  })

  it('GET an unknown resource is 404', async () => {
    const res = await fetch(`${base}/premium/nope`)
    expect(res.status).toBe(404)
  })
})
