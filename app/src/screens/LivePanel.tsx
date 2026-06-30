import { useEffect, useState } from 'react'
import { fmt, PAYEE } from '../data'
import { getBalances, getPolicy, payLive, ping, type OnchainSnap } from '../live'

const short = (a: string) => a.slice(0, 6) + '…' + a.slice(-4)

type Pay = { ok: true; url: string; fee: string } | { ok: false; msg: string } | null

/** Shown only when the real WDK-backed sidecar is reachable. Surfaces live on-chain balances
 *  and guard state, and fires a real gasless, policy-checked payment on Arbitrum mainnet. */
export function LivePanel() {
  const [up, setUp] = useState<boolean | null>(null)
  const [bal, setBal] = useState<Record<string, string>>({})
  const [chain, setChain] = useState<OnchainSnap | null>(null)
  const [busy, setBusy] = useState(false)
  const [pay, setPay] = useState<Pay>(null)

  async function refresh() {
    try {
      const [b, p] = await Promise.all([getBalances().catch(() => ({})), getPolicy()])
      setBal(b)
      setChain(p.onchain)
    } catch {
      /* leave as-is */
    }
  }

  useEffect(() => {
    let alive = true
    ping().then((ok) => {
      if (!alive) return
      setUp(ok)
      if (ok) void refresh()
    })
    return () => {
      alive = false
    }
  }, [])

  if (up !== true) return null // hidden when no backend (e.g. deployed PWA)

  async function send() {
    if (busy) return
    setBusy(true)
    setPay(null)
    try {
      const r = await payLive({ chain: 'arbitrum', category: 'bar', recipient: PAYEE, amount: '100000' })
      setPay({ ok: true, url: r.explorerUrl, fee: r.feeUsdt })
      void refresh()
    } catch (e) {
      const reason = (e as { reason?: string }).reason
      setPay({ ok: false, msg: reason ? `Blocked by policy · ${reason}` : (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card live rise" style={{ animationDelay: '.04s' }}>
      <div className="livetop">
        <span className="livedot" /> LIVE · real WDK wallet on mainnet
      </div>
      <p className="livesub">This panel talks to the running backend — real balances, real on-chain enforcement, real gasless transactions.</p>

      <div className="livegrid">
        <div className="lcell"><span>Arbitrum USD₮</span><b>{bal.arbitrum ? fmt(BigInt(bal.arbitrum)) : '—'}</b></div>
        <div className="lcell"><span>TON USD₮</span><b>{bal.ton ? fmt(BigInt(bal.ton)) : '—'}</b></div>
      </div>

      {chain && (
        <div className="livechain">
          🛡️ On-chain guard{' '}
          <a href={`https://arbiscan.io/address/${chain.guard}`} target="_blank" rel="noreferrer">{short(chain.guard)}</a>
          {' '}· enforced {fmt(BigInt(chain.totalSpent))}/{fmt(BigInt(chain.totalBudget))} USD₮ spent {chain.committed ? '✓' : ''}
        </div>
      )}

      {pay && (
        <div className={'liveresult ' + (pay.ok ? 'ok' : 'bad')}>
          {pay.ok ? (
            <>✅ Paid 0.1 USD₮ gasless · fee {fmt(BigInt(pay.fee))} USD₮ <a href={pay.url} target="_blank" rel="noreferrer">view on Arbiscan ↗</a></>
          ) : (
            <>🛡️ {pay.msg}</>
          )}
        </div>
      )}

      <button className="livebtn" onClick={send} disabled={busy}>
        {busy ? 'Sending on mainnet…' : '⚡ Send a real 0.1 USD₮ gasless payment'}
      </button>
    </div>
  )
}
