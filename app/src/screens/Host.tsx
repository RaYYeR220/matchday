import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { contributionProgress, createPool, poolShareUrl, type Pool } from '@matchday/sdk'
import type { Chain } from '@matchday/wallet-multichain'
import { fmt } from '../data'

const CHAINS: Chain[] = ['arbitrum', 'ton', 'tron']
const HOST_ADDR = '0x000000000000000000000000000000000000dEaD'

export function Host({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('Bombonera Watch Party')
  const [chain, setChain] = useState<Chain>('arbitrum')
  const [target, setTarget] = useState(100)
  const [pool, setPool] = useState<Pool | null>(null)
  const [qr, setQr] = useState('')

  const link = pool ? poolShareUrl('https://matchday.app', pool) : ''
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: '#2c2740', light: '#ffffff' } }).then(setQr)
  }, [link])

  function create() {
    setPool(createPool(
      { name, chain, recipient: HOST_ADDR, targetUsdt: BigInt(target) * 1_000_000n },
      { id: () => 'pool_' + Math.random().toString(36).slice(2, 8), now: () => Date.now() },
    ))
  }

  if (pool) {
    const raised = 59_750_000n
    const prog = contributionProgress(pool, raised)
    return (
      <>
        <div className="shead"><button className="back" onClick={onBack}>‹</button><h2>Your pool is live</h2></div>
        <div className="scroll">
          <div className="card pool rise" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fredoka', fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 12 }}>🍻 {pool.name}</div>
            {qr && <img className="qr" src={qr} alt="pool QR code" />}
            <div className="linkbox"><span>{link}</span><button onClick={() => navigator.clipboard?.writeText(link)}>Copy</button></div>
          </div>
          <div className="card rise" style={{ animationDelay: '.08s' }}>
            <div className="ctitle">Contributions</div>
            <div className="track"><div className="fill" style={{ width: prog.pct + '%' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>
              <span><b style={{ color: 'var(--lilac-deep)' }}>{fmt(raised)}</b> raised by 13 fans</span>
              <span>goal {fmt(pool.targetUsdt!)} USD₮ · {prog.pct.toFixed(0)}%</span>
            </div>
            <div className="gasless" style={{ marginTop: 12 }}>⚡ <span>Fans chip in gasless USD₮ on {pool.chain} — each within their own budget</span></div>
          </div>
        </div>
        <div className="paybar"><button className="cta alt" onClick={onBack}>Back to wallet</button></div>
      </>
    )
  }

  return (
    <>
      <div className="shead"><button className="back" onClick={onBack}>‹</button><h2>Host a pool</h2></div>
      <div className="scroll">
        <div className="card rise">
          <div className="ctitle">Create a fan pool</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>
            A shared USD₮ tip-jar your crew chips into — share a link or QR, contributions land in your wallet.
          </p>
          <div className="lbl">Pool name</div>
          <input className="fld" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="lbl">Receiving chain</div>
          <div className="chps">{CHAINS.map((c) => <button key={c} className={chain === c ? 'on' : ''} onClick={() => setChain(c)}>{c}</button>)}</div>
          <div className="lbl">Goal</div>
          <div className="bsel">{[50, 100, 200].map((t) => <button key={t} className={target === t ? 'on' : ''} onClick={() => setTarget(t)}>{t} USD₮</button>)}</div>
        </div>
      </div>
      <div className="paybar"><button className="cta alt" onClick={create}>Create pool →</button></div>
    </>
  )
}
