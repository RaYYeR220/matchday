import { useState } from 'react'
import { clearWallet, hasWallet, newMnemonic, saveMnemonic, unlockMnemonic } from '../wallet/keystore'

type Mode = 'unlock' | 'create' | 'import'

/** A wallet-style numeric keypad for the PIN (up to 6 digits) — dots fill as you tap. */
function PinPad({ pin, setPin, max = 6 }: { pin: string; setPin: (p: string) => void; max?: number }) {
  const press = (d: string) => { if (pin.length < max) setPin(pin + d) }
  const del = () => setPin(pin.slice(0, -1))
  return (
    <div className="pinpad">
      <div className="pindots">
        {Array.from({ length: max }).map((_, i) => <span key={i} className={'pindot' + (i < pin.length ? ' on' : '')} />)}
      </div>
      <div className="pinkeys">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className="pinkey" onClick={() => press(String(n))}>{n}</button>
        ))}
        <span />
        <button type="button" className="pinkey" onClick={() => press('0')}>0</button>
        <button type="button" className="pinkey del" onClick={del} aria-label="delete">⌫</button>
      </div>
    </div>
  )
}

/** Gate that produces the decrypted recovery phrase — created, unlocked, or imported on-device.
 *  The phrase is encrypted under a PIN and never leaves the browser. */
export function WalletGate({ onReady }: { onReady: (mnemonic: string, returning: boolean) => void }) {
  const [mode, setMode] = useState<Mode>(hasWallet() ? 'unlock' : 'create')
  const [pin, setPin] = useState('')
  const [phrase, setPhrase] = useState(() => newMnemonic())
  const [saved, setSaved] = useState(false)
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function unlock() {
    setBusy(true); setErr('')
    try { onReady(await unlockMnemonic(pin), true) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  async function create() {
    if (pin.length < 6) return setErr('Choose a 6-digit PIN')
    if (!saved) return setErr('Please back up your recovery phrase first')
    setBusy(true); setErr('')
    try { await saveMnemonic(phrase, pin); onReady(phrase, false) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  async function importSeed() {
    const words = importText.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) return setErr('Enter a 12 or 24-word phrase')
    if (pin.length < 6) return setErr('Choose a 6-digit PIN')
    setBusy(true); setErr('')
    try { const m = words.join(' '); await saveMnemonic(m, pin); onReady(m, true) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="shead"><div /><h2>{mode === 'unlock' ? 'Open your wallet' : mode === 'import' ? 'Import a wallet' : 'Create your wallet'}</h2></div>
      <div className="scroll">
        <div className="card rise">
          <div className="wgi">🔑</div>
          <p className="wglead">
            {mode === 'unlock'
              ? 'Enter your PIN to unlock the wallet on this device.'
              : 'Your keys are generated here and encrypted with a PIN — they never leave this device.'}
          </p>

          {mode === 'create' && (
            <>
              <div className="lbl">Your recovery phrase — write it down</div>
              <div className="seedbox">{phrase.split(' ').map((w, i) => <span key={i}><b>{i + 1}</b> {w}</span>)}</div>
              <label className="wgcheck"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I've saved my recovery phrase</label>
            </>
          )}

          {mode === 'import' && (
            <>
              <div className="lbl">Recovery phrase (12 or 24 words)</div>
              <textarea className="fld" rows={3} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="word1 word2 …" />
            </>
          )}

          <div className="lbl">{mode === 'unlock' ? 'Enter your 6-digit PIN' : 'Choose a 6-digit PIN'}</div>
          <PinPad pin={pin} setPin={setPin} />

          {err && <div className="wgerr">⚠️ {err}</div>}
        </div>

        <div className="wgalt">
          {mode !== 'unlock' && <button onClick={() => { setMode('unlock'); setErr('') }}>Have a wallet? Unlock</button>}
          {mode !== 'create' && <button onClick={() => { setMode('create'); setErr('') }}>Create new</button>}
          {mode !== 'import' && <button onClick={() => { setMode('import'); setErr('') }}>Import phrase</button>}
          {mode === 'unlock' && hasWallet() && <button onClick={() => { clearWallet(); setMode('create'); setPhrase(newMnemonic()) }}>Reset</button>}
        </div>
      </div>

      <div className="paybar">
        <button className="cta" disabled={busy || pin.length < 6} onClick={mode === 'unlock' ? unlock : mode === 'import' ? importSeed : create}>
          {busy ? 'Working…' : mode === 'unlock' ? 'Unlock →' : mode === 'import' ? 'Import →' : 'Create wallet →'}
        </button>
      </div>
    </>
  )
}
