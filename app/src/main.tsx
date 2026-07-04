import { Buffer } from 'buffer'
// Holepunch-family libs inside WDK expect Node globals — provide them for the browser.
;(globalThis as unknown as { Buffer?: typeof Buffer; global?: unknown }).Buffer ||= Buffer
;(globalThis as unknown as { global?: unknown }).global ||= globalThis

import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './theme.css'

// Telegram Mini-App: if launched inside Telegram, go full-height and match the theme.
const tg = (window as unknown as { Telegram?: { WebApp?: { ready(): void; expand(): void } } }).Telegram?.WebApp
if (tg) {
  try {
    tg.ready()
    tg.expand()
  } catch {
    /* not in Telegram */
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
