export function Intro({ onNext }: { onNext: () => void }) {
  return (
    <div className="intro">
      <div className="hero">
        <div className="biglogo">⚽</div>
        <h1>Matchday</h1>
        <div className="tag">The gasless USD₮ wallet for the match. Set a budget, tap to pay, keep your keys.</div>
      </div>
      <div className="pillars">
        <div className="pillar">
          <div className="pic" style={{ background: 'var(--mint)' }}>⚡</div>
          <div><b>Gasless</b><span>Pay USD₮ on Arbitrum, TON or TRON — the fee comes out of the USD₮, no gas token.</span></div>
        </div>
        <div className="pillar">
          <div className="pic" style={{ background: 'var(--sky)' }}>🔑</div>
          <div><b>Self-custodial</b><span>One seed, keys never leave your phone.</span></div>
        </div>
        <div className="pillar">
          <div className="pic" style={{ background: 'var(--lilac)' }}>🛡️</div>
          <div><b>Your rules</b><span>Budget, category caps & cooldowns — checked before every payment.</span></div>
        </div>
      </div>
      <button className="cta" onClick={onNext}>Create wallet</button>
    </div>
  )
}
