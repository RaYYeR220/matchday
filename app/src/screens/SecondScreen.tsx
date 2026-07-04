import { useMemo, useState } from 'react'
import { InMemoryStateStore, PolicyGuard, PolicyViolationError } from '@matchday/policy-guard'
import { emptyState, type PolicyState } from '@matchday/policy-core'
import { ACTIVE, fmt, PAYEE, toBase } from '../data'
import type { WdkBrowserWallet } from '../wallet/wdkWallet'

const UNLOCK_CAP = ACTIVE.rules.perCategoryCaps.unlock

export function SecondScreen({ wallet, onBack }: { wallet: WdkBrowserWallet; onBack: () => void }) {
  const guard = useMemo(() => new PolicyGuard(new InMemoryStateStore()), [])
  const [unlocked, setUnlocked] = useState<Record<string, string>>({}) // id -> explorer url
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [st, setSt] = useState<PolicyState>(emptyState())

  const used = st.spentByCategory.unlock ?? 0n

  async function unlock(id: string, p: number) {
    if (busy) return
    setBusy(id); setErr(null)
    const base = toBase(p)
    const req = { amount: base, category: 'unlock', to: PAYEE, timestamp: Math.floor(Date.now() / 1000) }
    try {
      // x402: the resource answers 402 Payment Required, we pay (gasless, policy-checked), then it opens.
      const receipt = await guard.run('me', ACTIVE.rules, req, () => wallet.transfer('arbitrum', { recipient: PAYEE, amount: base }))
      setSt((s) => ({ totalSpent: s.totalSpent + base, spentByCategory: { ...s.spentByCategory, unlock: (s.spentByCategory.unlock ?? 0n) + base }, lastSpentAt: s.lastSpentAt ?? {} }))
      setUnlocked((u) => ({ ...u, [id]: receipt.explorerUrl }))
    } catch (e) {
      if (e instanceof PolicyViolationError) setErr(e.reason === 'CATEGORY_CAP_EXCEEDED' ? `That blows your ${fmt(UNLOCK_CAP)} USD₮ unlock cap` : 'Blocked by your rules')
      else setErr('Unlock failed')
    } finally { setBusy(null) }
  }

  return (
    <>
      <div className="shead"><button className="back" onClick={onBack}>‹</button><h2>Second Screen</h2></div>
      <div className="scroll">
        <div className="card rise">
          <div className="ctitle">Pay-per-view · x402</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            Unlock premium match content with a tiny USD₮ tap — powered by <b>x402</b> (HTTP 402 Payment Required). Each unlock is a gasless payment your rules check first. No subscription, pay only for what you open.
          </p>
          <div className="guard" style={{ marginTop: 12 }}>🛡️ <span>Unlocks capped at <b>{fmt(UNLOCK_CAP)} USD₮</b> for the match · {fmt(used)}/{fmt(UNLOCK_CAP)} used</span></div>
        </div>

        {err && <div className="result bad" style={{ position: 'static', margin: '0 0 4px' }}><span>🛡️</span><span>{err}</span></div>}

        {ACTIVE.premium.map((p, i) => {
          const open = unlocked[p.id]
          return (
            <div key={p.id} className={'card prem rise' + (open ? ' open' : '')} style={{ animationDelay: 0.06 * (i + 1) + 's' }}>
              <div className="premtop">
                <span className="premic">{p.emoji}</span>
                <div className="premmeta"><b>{p.title}</b><span>{p.blurb}</span></div>
                {open ? <span className="premok">✓</span> : <span className="premprice">{p.price} USD₮</span>}
              </div>
              {open ? (
                <div className="prembody">🔓 {p.body}<a href={open} target="_blank" rel="noreferrer">receipt ↗</a></div>
              ) : (
                <button className="prembtn" onClick={() => unlock(p.id, p.price)} disabled={busy === p.id}>
                  {busy === p.id ? '402 · paying…' : `🔒 Unlock · ${p.price} USD₮ gasless`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
