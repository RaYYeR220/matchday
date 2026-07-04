// Self-custodial keystore: the recovery phrase is generated in the browser, encrypted with the
// user's PIN (Web Crypto, PBKDF2 + AES-GCM) and kept in localStorage. It never leaves the device.
import { generateMnemonic } from 'bip39'

const KEY = 'matchday.keystore.v1'

interface Stored {
  salt: string
  iv: string
  ct: string
}

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const ub64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', bs(new TextEncoder().encode(pin)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations: 150_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Is a wallet already stored on this device? */
export function hasWallet(): boolean {
  return localStorage.getItem(KEY) !== null
}

/** A fresh 12-word recovery phrase (show once for backup, then it lives encrypted). */
export function newMnemonic(): string {
  return generateMnemonic()
}

/** Encrypt a mnemonic under a PIN and persist it locally. */
export async function saveMnemonic(mnemonic: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(new TextEncoder().encode(mnemonic)))
  const stored: Stored = { salt: b64(salt), iv: b64(iv), ct: b64(ct) }
  localStorage.setItem(KEY, JSON.stringify(stored))
}

/** Decrypt the stored mnemonic with the PIN. Throws if the PIN is wrong or nothing is stored. */
export async function unlockMnemonic(pin: string): Promise<string> {
  const raw = localStorage.getItem(KEY)
  if (!raw) throw new Error('no wallet on this device')
  const { salt, iv, ct } = JSON.parse(raw) as Stored
  const key = await deriveKey(pin, ub64(salt))
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(ub64(iv)) }, key, bs(ub64(ct)))
    return new TextDecoder().decode(pt)
  } catch {
    throw new Error('wrong PIN')
  }
}

/** Forget the wallet on this device (the phrase is the only way back). */
export function clearWallet(): void {
  localStorage.removeItem(KEY)
}
