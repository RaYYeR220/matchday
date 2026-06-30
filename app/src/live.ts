// Thin client for the optional Matchday sidecar (the real WDK-backed backend).
// When the sidecar is running, the app can show live on-chain balances + guard state and
// fire a real, gasless, policy-checked payment on Arbitrum mainnet. When it is not running
// (e.g. the deployed PWA with no backend), the app falls back to its simulated demo.

export const SIDECAR_URL = (import.meta.env.VITE_SIDECAR_URL as string) || 'http://127.0.0.1:8787'

export interface OnchainSnap {
  guard: string
  owner: string
  totalBudget: string
  totalSpent: string
  committed: boolean
}
export interface PolicySnap {
  state: { totalSpent: string; spentByCategory: Record<string, string> }
  onchain: OnchainSnap | null
}
export interface LiveReceipt {
  chain: string
  settledHash: string | null
  explorerUrl: string
  feeUsdt: string
}

async function timed(path: string, init?: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(SIDECAR_URL + path, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/** Is the sidecar reachable? Short timeout so the UI never hangs. */
export async function ping(): Promise<boolean> {
  try {
    const r = await timed('/health', undefined, 2500)
    return r.ok
  } catch {
    return false
  }
}

export async function getPolicy(): Promise<PolicySnap> {
  const r = await timed('/policy', undefined, 12000)
  if (!r.ok) throw new Error('policy fetch failed')
  return (await r.json()) as PolicySnap
}

export async function getBalances(): Promise<Record<string, string>> {
  const r = await timed('/balances', undefined, 60000)
  if (!r.ok) throw new Error('balances fetch failed')
  return ((await r.json()) as { balances: Record<string, string> }).balances
}

export interface PayBody {
  chain: string
  category: string
  recipient: string
  amount: string
}

/** Fire a real gasless, policy-gated payment. Throws { reason } on a 409 policy block. */
export async function payLive(body: PayBody): Promise<LiveReceipt> {
  const r = await timed('/pay', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, 90000)
  const data = await r.json()
  if (r.status === 409) throw Object.assign(new Error('policy'), { reason: data.reason as string })
  if (!r.ok) throw new Error(data.message || 'payment failed')
  return (data as { receipt: LiveReceipt }).receipt
}
