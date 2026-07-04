import { useEffect, useMemo, useState } from 'react'
import { InMemoryStateStore, PolicyGuard, PolicyViolationError } from '@matchday/policy-guard'
import { emptyState, type PolicyState, type PolicyViolation } from '@matchday/policy-core'
import { ACTIVE, CATEGORIES, fmt, PAYEE, toBase } from '../data'
import type { WdkBrowserWallet } from '../wallet/wdkWallet'

const AMOUNTS = ACTIVE.amounts
const RING = 289 // 2πr, r=46

type Result = { ok: true; msg: string; sub: string; url: string } | { ok: false; msg: string; sub: string } | null

const FRIENDLY: Record<PolicyViolation, string> = {
  CATEGORY_CAP_EXCEEDED: 'That would blow this category cap',
  STAKE_CAP_EXCEEDED: 'Single payment over your per-tap cap',
  COOLDOWN_ACTIVE: 'Easy — wait a moment between cheers',
  TOTAL_BUDGET_EXCEEDED: 'Over your matchday budget',
  DESTINATION_NOT_ALLOWED: 'Recipient not on your allow-list',
  OUTSIDE_WINDOW: 'Outside the match window',
  INVALID_AMOUNT: 'Enter an amount',
}

const short = (a: string) => a.slice(0, 6) + '…' + a.slice(-4)

export function Home({ budget, wallet, onHost, onWager, onSecond }: { budget: number; wallet: WdkBrowserWallet; onHost: () => void; onWager: () => void; onSecond: () => void }) {
  const rules = useMemo(() => ({ ...ACTIVE.rules, totalBudget: toBase(budget) }), [budget])
  const guard = useMemo(() => new PolicyGuard(new InMemoryStateStore()), [])

  const [amount, setAmount] = useState(ACTIVE.amounts[1])
  const [catKey, setCatKey] = useState('bar')
  const [st, setSt] = useState<PolicyState>(emptyState())
  const [result, setResult] = useState<Result>(null)
  const [busy, setBusy] = useState(false)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState<bigint | null>(null)
  const [copied, setCopied] = useState(false)
  const [goodOn, setGoodOn] = useState(true)
  const [perGoal, setPerGoal] = useState(ACTIVE.goalAmounts[1])

  async function refreshBalance() {
    try { setBalance(await wallet.getUsdtBalance('arbitrum')) } catch { /* keep */ }
  }
  useEffect(() => {
    wallet.address().then(setAddress).catch(() => {})
    void refreshBalance()
  }, [wallet])

  const cat = CATEGORIES.find((c) => c.key === catKey)!
  const rem = rules.totalBudget - st.totalSpent
  const remaining = rem > 0n ? rem : 0n
  const spentPct = Math.min(100, Number((st.totalSpent * 1000n) / rules.totalBudget) / 10)
  const catCap = rules.perCategoryCaps[catKey]
  const catUsed = st.spentByCategory[catKey] ?? 0n
  const merchNear = rules.perCategoryCaps.merch - (st.spentByCategory.merch ?? 0n) <= rules.perCategoryCaps.merch / 6n

  async function payReal(base: bigint, category: string, onOk: (url: string, fee: bigint) => void) {
    const req = { amount: base, category, to: PAYEE, timestamp: Math.floor(Date.now() / 1000) }
    const receipt = await guard.run('me', rules, req, () => wallet.transfer('arbitrum', { recipient: PAYEE, amount: base }))
    setSt((s) => ({
      totalSpent: s.totalSpent + base,
      spentByCategory: { ...s.spentByCategory, [category]: (s.spentByCategory[category] ?? 0n) + base },
      lastSpentAt: { ...(s.lastSpentAt ?? {}), [category]: req.timestamp },
    }))
    void refreshBalance()
    onOk(receipt.explorerUrl, receipt.feeUsdt)
  }

  async function pay() {
    if (busy) return
    setBusy(true); setResult(null)
    try {
      await payReal(toBase(amount), catKey, (url, fee) =>
        setResult({ ok: true, msg: `Paid ${amount} USD₮ to ${cat.payee}`, sub: `gasless · fee ${fmt(fee)} USD₮ on Arbitrum`, url }))
    } catch (e) {
      if (e instanceof PolicyViolationError) setResult({ ok: false, msg: FRIENDLY[e.reason], sub: `${cat.icon} ${cat.label} · ${fmt(catUsed)}/${fmt(catCap)} used` })
      else setResult({ ok: false, msg: 'Payment failed', sub: String((e as Error).message) })
    } finally { setBusy(false) }
  }

  async function goal() {
    if (busy) return
    if (!goodOn) return setResult({ ok: false, msg: 'Goal-for-good is off', sub: 'Toggle it on to auto-donate when your team scores' })
    setBusy(true); setResult(null)
    try {
      await payReal(toBase(perGoal), 'good', (url, fee) =>
        setResult({ ok: true, msg: `⚽ GOAL! Donated ${perGoal} USD₮ to Football for Good`, sub: `auto-rule · gasless · fee ${fmt(fee)} USD₮`, url }))
    } catch (e) {
      if (e instanceof PolicyViolationError) setResult({ ok: false, msg: 'Goal donation blocked', sub: FRIENDLY[e.reason] })
      else setResult({ ok: false, msg: 'Failed', sub: String((e as Error).message) })
    } finally { setBusy(false) }
  }

  return (
    <>
      <header>
        <div className="brandrow">
          <div className="brand"><div className="logo">⚽</div><h1>Matchday</h1></div>
          <div className="keychip">🔑 Keys on device</div>
        </div>
        <div className="matchpill">
          <span>ARG</span><span className="vs">vs</span><span>FRA</span>
          <span className="live"><span className="dot" />FINAL · 78′</span>
        </div>
      </header>

      <div className="scroll">
        <div className="card budget rise" style={{ animationDelay: '.05s' }}>
          <div className="ring">
            <svg width="104" height="104" viewBox="0 0 104 104">
              <circle cx="52" cy="52" r="46" fill="none" stroke="#f0e7dd" strokeWidth="11" />
              <circle cx="52" cy="52" r="46" fill="none" stroke="url(#g)" strokeWidth="11" strokeLinecap="round"
                strokeDasharray={RING} strokeDashoffset={RING * (1 - spentPct / 100)} style={{ transition: 'stroke-dashoffset .8s' }} />
              <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff9a5b" /><stop offset="1" stopColor="#ff7a45" /></linearGradient></defs>
            </svg>
            <div className="center"><div><div className="big">{fmt(remaining)}</div><div className="small">USD₮ LEFT</div></div></div>
          </div>
          <div className="meta">
            <h2>Matchday budget</h2>
            <p>Your spend cap for this match — rules enforced before every payment.</p>
            <div className="chips"><span className="pchip spent">{fmt(st.totalSpent)} spent</span><span className="pchip left">{fmt(rules.totalBudget)} cap</span></div>
          </div>
        </div>

        <div className="card rise" style={{ animationDelay: '.12s' }}>
          <div className="ctitle">Your wallet · self-custodial on Arbitrum</div>
          <div className="bal sel">
            <div className="coin arb">AR</div>
            <div className="nm"><b>Arbitrum USD₮</b><span onClick={() => { navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1200) }} style={{ cursor: 'pointer' }}>{copied ? 'copied ✓' : (address ? short(address) : '…')}</span></div>
            <div className="amt">{balance === null ? '…' : fmt(balance)}<small> USD₮</small></div>
          </div>
          <div className="gasless">⚡ Gasless <span>· fee paid in USD₮ · WDK signs on this device · no gas token</span></div>
        </div>

        <div className="card rise" style={{ animationDelay: '.19s' }}>
          <div className="ctitle">Tap to pay</div>
          <div className="amountrow"><span className="a">{amount}</span><span className="u">USD₮</span></div>
          <div className="amts">
            {AMOUNTS.map((a) => <button key={a} className={amount === a ? 'on' : ''} onClick={() => setAmount(a)}>{a}</button>)}
          </div>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <button key={c.key} className={'cat' + (c.key === 'merch' ? ' warn' : '') + (catKey === c.key ? ' on' : '')} onClick={() => setCatKey(c.key)}>
                <span className="ic">{c.icon}</span>{c.label}
                {c.key === 'merch' && merchNear && <span className="pip">⚠️</span>}
              </button>
            ))}
          </div>
          <div className="recip"><span>To</span><b>{cat.payee}</b></div>
          <div className="guard">🛡️ <span>Your rules keep spending safe — <b>{cat.label}</b> {fmt(catUsed)}/{fmt(catCap)} used{catKey === 'cheers' ? ` · max ${fmt(rules.perCategoryStakeCaps!.cheers)}/tap · 30s cooldown` : ''}</span></div>
        </div>

        <div className="card pool rise" style={{ animationDelay: '.26s' }}>
          <div className="top"><b>🍻 Bombonera Watch Party</b><button className="tip" onClick={onHost}>Host a pool ›</button></div>
          <div className="track"><div className="fill" style={{ width: '59.75%' }} /></div>
          <div className="stat"><span><b>59.75</b> raised by 13 fans</span><span>goal 100 USD₮</span></div>
        </div>

        <div className="card more rise" style={{ animationDelay: '.29s' }}>
          <div className="ctitle">More ways to play</div>
          <div className="morerow">
            <button className="morebtn wager" onClick={onWager}><span className="moreic">🎯</span><b>Friendly Wager</b><span>bet a mate · tilt-capped</span></button>
            <button className="morebtn second" onClick={onSecond}><span className="moreic">🔓</span><b>Second Screen</b><span>x402 pay-per-view</span></button>
          </div>
        </div>

        <div className="card g4g rise" style={{ animationDelay: '.32s' }}>
          <div className="top">
            <b>❤️ Goal-for-good</b>
            <button className={'toggle ' + (goodOn ? 'on' : 'off')} onClick={() => setGoodOn((v) => !v)}>{goodOn ? 'On' : 'Off'}</button>
          </div>
          <p>Auto-donate to <b>Football for Good</b> every time ARG scores — counted against your budget.</p>
          <div className="amts">
            {ACTIVE.goalAmounts.map((a) => <button key={a} className={perGoal === a ? 'on' : ''} onClick={() => setPerGoal(a)}>{a} USD₮ / goal</button>)}
          </div>
          <button className="simgoal" onClick={goal}>⚽ Simulate a goal</button>
        </div>
      </div>

      <div className="paybar">
        {result && (
          <div className={'result ' + (result.ok ? 'ok' : 'bad')}>
            <span>{result.ok ? '✅' : '🛡️'}</span>
            <span>{result.msg}<span className="sub">{result.sub}</span></span>
            {result.ok && <a href={result.url} target="_blank" rel="noreferrer">view ↗</a>}
          </div>
        )}
        <button className="pay" onClick={pay} disabled={busy}>
          {busy ? 'Paying on Arbitrum…' : <>Pay {amount} USD₮ <span className="f">· {cat.icon} {cat.label} · gasless ⚡</span></>}
        </button>
      </div>
    </>
  )
}
