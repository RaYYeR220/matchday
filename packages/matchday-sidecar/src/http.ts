import { createServer as nodeCreateServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { PolicyViolationError } from '@matchday/policy-guard'
import type { Chain } from '@matchday/wallet-multichain'
import type { MatchdaySidecar } from './service'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
}

/** JSON stringify that renders bigints (USDT base units) as decimal strings. */
function toJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = toJson(body)
  res.writeHead(status, { 'content-type': 'application/json', ...CORS })
  res.end(json)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
}

/** Builds an HTTP server that exposes the MatchdaySidecar engine. */
export function createServer(sc: MatchdaySidecar): Server {
  return nodeCreateServer((req, res) => {
    void handle(sc, req, res).catch((e) => {
      if (e instanceof PolicyViolationError) return send(res, 409, { error: 'policy', reason: e.reason })
      send(res, 500, { error: 'internal', message: (e as Error).message })
    })
  })
}

async function handle(sc: MatchdaySidecar, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { method = 'GET' } = req
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return void res.end()
  }

  if (method === 'GET' && path === '/health') return send(res, 200, { ok: true })

  if (method === 'GET' && path === '/balances') {
    return send(res, 200, { balances: await sc.balances() })
  }

  if (method === 'GET' && path === '/policy') {
    return send(res, 200, await sc.policy())
  }

  if (method === 'POST' && path === '/transfer') {
    const b = await readJson(req)
    const receipt = await sc.transfer({ chain: b.chain as Chain, recipient: String(b.recipient), amount: BigInt(String(b.amount)) })
    return send(res, 200, { receipt })
  }

  if (method === 'POST' && path === '/pay') {
    const b = await readJson(req)
    const receipt = await sc.pay({
      chain: b.chain as Chain,
      category: String(b.category),
      recipient: String(b.recipient),
      amount: BigInt(String(b.amount)),
    })
    return send(res, 200, { receipt })
  }

  // x402 second-screen
  if (method === 'GET' && path === '/premium') return send(res, 200, { items: sc.premiumList() })

  const seg = path.split('/').filter(Boolean) // ['premium', id, 'unlock'?]
  if (seg[0] === 'premium' && seg[1]) {
    const id = seg[1]
    if (method === 'POST' && seg[2] === 'unlock') {
      return send(res, 200, await sc.unlock(id)) // PolicyViolationError -> 409 via createServer
    }
    if (method === 'GET' && !seg[2]) {
      if (sc.isUnlocked(id)) return send(res, 200, { unlocked: true, content: sc.unlockedContent(id) })
      const reqs = sc.requirements(id)
      if (!reqs) return send(res, 404, { error: 'not_found' })
      return send(res, 402, reqs) // HTTP 402 Payment Required
    }
  }

  send(res, 404, { error: 'not_found' })
}
