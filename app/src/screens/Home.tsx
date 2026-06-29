import { useMemo, useState } from 'react'
import { InMemoryStateStore, PolicyGuard, PolicyViolationError } from '@matchday/policy-guard'
import type { PolicyState, PolicyViolation } from '@matchday/policy-core'
import type { Chain } from '@matchday/wallet-multichain'
import { BALANCES, CATEGORIES, CHAINS, DemoWallet, fmt, PAYEE, RULES, SEED_STATE } from '../data'

const U = 1_000_000n
const AMOUNTS = [1, 5, 10, 25]
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

export function Home({ budget }: { budget: number }) {
  const rules = useMemo(() => ({ ...RULES, totalBudget: BigInt(budget) * U }), [budget])
  const { guard, wallet } = useMemo(() => {
    const store = new InMemoryStateStore()
    void store.set('me', SEED_STATE)
    return { guard: new PolicyGuard(store), wallet: new DemoWallet(), store }
  }, [])

  const [amount, setAmount] = useState(5)
  const [catKey, setCatKey] = useState('bar')
  const [chain, setChain] = useState<Chain>('arbitrum')
  const [st, setSt] = useState<PolicyState>(SEED_STATE)
  const [result, setResult] = useState<Result>(null)
  const [busy, setBusy] = useState(false)
  const [poolFill, setPoolFill] = useState(0)
  useMemo(() => setTimeout(() => setPoolFill(59.75), 300), [])

  const cat = CATEGORIES.find((c) => c.key === catKey)!
  const rem = rules.totalBudget - st.totalSpent
  const remaining = rem > 0n ? rem : 0n
  const spentPct = Math.min(100, Number((st.totalSpent * 1000n) / rules.totalBudget) / 10)
  const catCap = rules.perCategoryCaps[catKey]
  const catUsed = st.spentByCategory[catKey] ?? 0n
  const merchNear = (rules.perCategoryCaps.merch - (st.spentByCategory.merch ?? 0n)) <= 5n * U

  async function pay() {
    if (busy) return
    setBusy(true)
    setResult(null)
    const base = BigInt(amount) * U
    const req = { amount: base, category: catKey, to: PAYEE, timestamp: Math.floor(Date.now() / 1000) }
    try {
      const receipt = await guard.run('me', rules, req, () => wallet.transfer(chain, { recipient: PAYEE, amount: base }))
      // reflect the advanced state
      setSt((s) => ({
        totalSpent: s.totalSpent + base,
        spentByCategory: { ...s.spentByCategory, [catKey]: (s.spentByCategory[catKey] ?? 0n) + base },
        lastSpentAt: { ...(s.lastSpentAt ?? {}), [catKey]: req.timestamp },
      }))
      setResult({ ok: true, msg: `Paid ${amount} USD₮ to ${cat.payee}`, sub: `gasless · fee ${fmt(receipt.feeUsdt)} USD₮ on ${chain}`, url: receipt.explorerUrl })
    } catch (e) {
      if (e instanceof PolicyViolationError) {
        setResult({ ok: false, msg: FRIENDLY[e.reason], sub: `${cat.icon} ${cat.label} · ${fmt(catUsed)}/${fmt(catCap)} used` })
      } else {
        setResult({ ok: false, msg: 'Payment failed', sub: String((e as Error).message) })
      }
    } finally {
      setBusy(false)
    }
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
          <div className="ctitle">Pay from · multi-chain USD₮</div>
          {CHAINS.map((c) => (
            <div key={c.key} className={'bal' + (chain === c.key ? ' sel' : '')} onClick={() => setChain(c.key)} style={{ cursor: 'pointer' }}>
              <div className={'coin ' + c.cls}>{c.coin}</div>
              <div className="nm"><b>{c.label}</b><span>{c.addr}</span></div>
              <div className="amt">{fmt(BALANCES[c.key])}<small> USD₮</small></div>
            </div>
          ))}
          <div className="gasless">⚡ Gasless <span>· fee paid in USD₮ · no native gas token needed</span></div>
        </div>

        <div className="card rise" style={{ animationDelay: '.19s' }}>
          <div className="ctitle">Tap to pay</div>
          <div className="amountrow"><span className="a">{amount}.00</span><span className="u">USD₮</span></div>
          <div className="amts">
            {AMOUNTS.map((a) => (
              <button key={a} className={amount === a ? 'on' : ''} onClick={() => setAmount(a)}>{a}</button>
            ))}
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
          <div className="guard">🛡️ <span>Your rules keep spending safe — <b>{cat.label}</b> {fmt(catUsed)}/{fmt(catCap)} used{catKey === 'cheers' ? ' · max 5/ tap · 30s cooldown' : ''}</span></div>
        </div>

        <div className="card pool rise" style={{ animationDelay: '.26s' }}>
          <div className="top"><b>🍻 Bombonera Watch Party</b><span className="tip">Group pot</span></div>
          <div className="track"><div className="fill" style={{ width: poolFill + '%' }} /></div>
          <div className="stat"><span><b>59.75</b> raised by 13 fans</span><span>goal 100 USD₮</span></div>
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
        <button className="pay" onClick={pay}>
          {busy ? 'Paying…' : <>Pay {amount}.00 USD₮ <span className="f">· {cat.icon} {cat.label} · gasless ⚡</span></>}
        </button>
      </div>
    </>
  )
}
