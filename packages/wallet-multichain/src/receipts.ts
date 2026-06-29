export interface EvmUserOpResult {
  txHash: string | null
  success: boolean
}

/** Parse a bundler `eth_getUserOperationReceipt` JSON-RPC response into the settled tx. */
export function parseEvmUserOpReceipt(rpc: any): EvmUserOpResult {
  const r = rpc?.result
  if (!r) return { txHash: null, success: false }
  return { txHash: r.receipt?.transactionHash ?? null, success: !!r.success }
}

export interface TonEventResult {
  eventId: string | null
  gasless: boolean
  settled: boolean
}

/** Find the gasless jetton transfer (a GasRelay + JettonTransfer event) in a tonapi events list. */
export function parseTonEvents(json: any): TonEventResult {
  const events = json?.events ?? []
  for (const e of events) {
    const types: string[] = (e.actions ?? []).map((a: any) => a.type)
    if (types.includes('JettonTransfer') && types.includes('GasRelay')) {
      return { eventId: e.event_id, gasless: true, settled: !e.in_progress }
    }
  }
  return { eventId: null, gasless: false, settled: false }
}

/** Live fetcher: resolve a userOp hash to its settled tx via the bundler, polling until included. */
export async function fetchEvmUserOpReceipt(
  bundlerUrl: string,
  userOpHash: string,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<EvmUserOpResult> {
  const retries = opts.retries ?? 15
  const delayMs = opts.delayMs ?? 2000
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getUserOperationReceipt', params: [userOpHash] }),
    })
    const parsed = parseEvmUserOpReceipt(await res.json())
    if (parsed.txHash) return parsed
    if (i < retries) await new Promise((r) => setTimeout(r, delayMs))
  }
  return { txHash: null, success: false }
}

/** Thin live fetcher: resolve a TON account's latest gasless jetton transfer via tonapi. */
export async function fetchTonAccountEvents(address: string, limit = 5): Promise<TonEventResult> {
  const res = await fetch(`https://tonapi.io/v2/accounts/${address}/events?limit=${limit}`)
  return parseTonEvents(await res.json())
}
