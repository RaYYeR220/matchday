import { useMemo, useState } from 'react'
import { InMemoryStateStore, PolicyGuard, PolicyViolationError } from '@matchday/policy-guard'
import type { PolicyState, PolicyViolation } from '@matchday/policy-core'
import { DemoWallet, fmt, PAYEE, RULES, WAGERS } from '../data'

const U = 1_000_000n
const STAKES = [1, 3, 5, 8] // 8 trips the 5 USD₮ tilt-cap on purpose

const FRIENDLY: Record<PolicyViolation, string> = {
  CATEGORY_CAP_EXCEEDED: 'That blows your 20 USD₮ wager cap for the match',
  STAKE_CAP_EXCEEDED: 'Over your 5 USD₮ per-wager tilt-cap',
  COOLDOWN_ACTIVE: 'Cooling down — no tilt-betting, wait a moment',
  TOTAL_BUDGET_EXCEEDED: 'Over your matchday budget',
  DESTINATION_NOT_ALLOWED: 'Pot not on your allow-list',
  OUTSIDE_WINDOW: 'Outside the match window',
  INVALID_AMOUNT: 'Pick a stake',
}

type Result =
  | { ok: true; msg: string; sub: string; url: string }
  | { ok: false; msg: string; sub: string }
  | null

export function Wager({ onBack }: { onBack: () => void }) {
  const { guard, wallet } = useMemo(() => ({ guard: new PolicyGuard(new InMemoryStateStore()), wallet: new DemoWallet() }), [])
  const [pick, setPick] = useState(WAGERS[0].id)
  const [stake, setStake] = useState(3)
  const [st, setSt] = useState<PolicyState>({ totalSpent: 0n, spentByCategory: {}, lastSpentAt: {} })
  const [result, setResult] = useState<Result>(null)
  const [busy, setBusy] = useState(false)

  const w = WAGERS.find((x) => x.id === pick)!
  const wagered = st.spentByCategory.wager ?? 0n

  async function place() {
    if (busy) return
    setBusy(true)
    setResult(null)
    const base = BigInt(stake) * U
    const req = { amount: base, category: 'wager', to: PAYEE, timestamp: Math.floor(Date.now() / 1000) }
    try {
      const receipt = await guard.run('me', RULES, req, () => wallet.transfer('arbitrum', { recipient: PAYEE, amount: base }))
      setSt((s) => ({
        totalSpent: s.totalSpent + base,
        spentByCategory: { ...s.spentByCategory, wager: (s.spentByCategory.wager ?? 0n) + base },
        lastSpentAt: { ...(s.lastSpentAt ?? {}), wager: req.timestamp },
      }))
      setResult({
        ok: true,
        msg: `Matched! ${w.emoji} ${w.label}`,
        sub: `staked ${stake} USD₮ vs a fan · pot ${stake * 2} USD₮ · gasless · fee ${fmt(receipt.feeUsdt)} USD₮`,
        url: receipt.explorerUrl,
      })
    } catch (e) {
      if (e instanceof PolicyViolationError) setResult({ ok: false, msg: FRIENDLY[e.reason], sub: `🎯 Wager ${fmt(wagered)}/20 used · 5 USD₮ per tap · 30s cooldown` })
      else setResult({ ok: false, msg: 'Wager failed', sub: String((e as Error).message) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="shead"><button className="back" onClick={onBack}>‹</button><h2>Friendly Wager</h2></div>
      <div className="scroll">
        <div className="card rise">
          <div className="ctitle">A bit of fun with a mate</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            Take a side, get matched with a fan on the other — winner takes the pot. Not a market: your rules cap each stake at <b>5 USD₮</b> and add a <b>30s cooldown</b> so a bad call can't spiral.
          </p>
        </div>

        <div className="card rise" style={{ animationDelay: '.08s' }}>
          <div className="ctitle">Pick your side</div>
          <div className="wlist">
            {WAGERS.map((x) => (
              <button key={x.id} className={'wopt' + (pick === x.id ? ' on' : '')} onClick={() => setPick(x.id)}>
                <span className="we">{x.emoji}</span>
                <span className="wl">{x.label}</span>
                <span className="wp">{x.payout}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card rise" style={{ animationDelay: '.14s' }}>
          <div className="ctitle">Your stake</div>
          <div className="amountrow"><span className="a">{stake}.00</span><span className="u">USD₮</span></div>
          <div className="amts">
            {STAKES.map((a) => (
              <button key={a} className={(stake === a ? 'on' : '') + (a > 5 ? ' over' : '')} onClick={() => setStake(a)}>{a}</button>
            ))}
          </div>
          <div className="guard">🎯 <span>Wager rules — <b>5 USD₮</b> max per tap · 30s cooldown · {fmt(wagered)}/20 USD₮ wagered</span></div>
        </div>
      </div>

      <div className="paybar">
        {result && (
          <div className={'result ' + (result.ok ? 'ok' : 'bad')}>
            <span>{result.ok ? '🎉' : '🛡️'}</span>
            <span>{result.msg}<span className="sub">{result.sub}</span></span>
            {result.ok && <a href={result.url} target="_blank" rel="noreferrer">view ↗</a>}
          </div>
        )}
        <button className="pay" onClick={place} disabled={busy}>
          {busy ? 'Matching…' : <>Place {stake}.00 USD₮ wager <span className="f">· {w.emoji} {w.label} · gasless ⚡</span></>}
        </button>
      </div>
    </>
  )
}
