import { useState } from 'react'
import { clearWallet, hasWallet, newMnemonic, saveMnemonic, unlockMnemonic } from '../wallet/keystore'

type Mode = 'unlock' | 'create' | 'import'

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
    if (pin.length < 4) return setErr('Choose a PIN of at least 4 digits')
    if (!saved) return setErr('Please back up your recovery phrase first')
    setBusy(true); setErr('')
    try { await saveMnemonic(phrase, pin); onReady(phrase, false) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  async function importSeed() {
    const words = importText.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) return setErr('Enter a 12 or 24-word phrase')
    if (pin.length < 4) return setErr('Choose a PIN of at least 4 digits')
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

          <div className="lbl">PIN</div>
          <input className="fld" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />

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
        <button className="cta" disabled={busy} onClick={mode === 'unlock' ? unlock : mode === 'import' ? importSeed : create}>
          {busy ? 'Working…' : mode === 'unlock' ? 'Unlock →' : mode === 'import' ? 'Import →' : 'Create wallet →'}
        </button>
      </div>
    </>
  )
}
