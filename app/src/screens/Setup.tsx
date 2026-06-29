import { CATEGORIES, RULES, fmt } from '../data'

const CAP_OF: Record<string, bigint> = RULES.perCategoryCaps

export function Setup({ budget, setBudget, onNext, onBack }: {
  budget: number; setBudget: (n: number) => void; onNext: () => void; onBack: () => void
}) {
  return (
    <>
      <div className="shead">
        <button className="back" onClick={onBack}>‹</button>
        <h2>Your matchday rules</h2>
      </div>
      <div className="scroll">
        <div className="card rise">
          <div className="ctitle">Matchday budget</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10 }}>
            Your total spend cap for ARG vs FRA. Spend resets after the final whistle.
          </p>
          <div className="bsel">
            {[50, 100, 200].map((b) => (
              <button key={b} className={budget === b ? 'on' : ''} onClick={() => setBudget(b)}>{b} USD₮</button>
            ))}
          </div>
        </div>

        <div className="card rise" style={{ animationDelay: '.08s' }}>
          <div className="ctitle">Category caps · enforced on every tap</div>
          {CATEGORIES.map((c) => (
            <div className="caprow" key={c.key}>
              <div className="ic2">{c.icon}</div>
              <div className="nm">{c.label}<small>{c.payee}</small></div>
              <div className="cv">{fmt(CAP_OF[c.key])} USD₮</div>
            </div>
          ))}
          <div className="guard" style={{ marginTop: 12 }}>
            📣 <span><b>Cheers</b> also limited to 5 USD₮ per tap, one every 30s — no tilt-tipping.</span>
          </div>
        </div>

        <div className="card rise" style={{ animationDelay: '.16s' }}>
          <div className="ctitle">Safety</div>
          <div className="caprow"><div className="ic2">🔑</div><div className="nm">Self-custodial<small>Keys stay on this device</small></div><div className="cv">✓</div></div>
          <div className="caprow"><div className="ic2">⚡</div><div className="nm">Gasless USD₮<small>Arbitrum · TON · TRON</small></div><div className="cv">✓</div></div>
          <div className="caprow"><div className="ic2">📋</div><div className="nm">Allow-list<small>Only pre-approved vendors</small></div><div className="cv">✓</div></div>
        </div>
      </div>
      <div className="paybar">
        <button className="cta" onClick={onNext}>Enter matchday →</button>
      </div>
    </>
  )
}
