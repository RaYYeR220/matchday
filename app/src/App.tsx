import { useState } from 'react'
import { Home } from './screens/Home'
import { Intro } from './screens/Intro'
import { Setup } from './screens/Setup'
import { Host } from './screens/Host'
import { Wager } from './screens/Wager'
import { SecondScreen } from './screens/SecondScreen'
import { WalletGate } from './screens/WalletGate'
import { WdkBrowserWallet } from './wallet/wdkWallet'
import { ACTIVE } from './data'

type Screen = 'intro' | 'wallet' | 'setup' | 'home' | 'host' | 'wager' | 'second'

export function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [budget, setBudget] = useState(ACTIVE.defaultBudget)
  const [wallet, setWallet] = useState<WdkBrowserWallet | null>(null)

  function onReady(mnemonic: string, returning: boolean) {
    setWallet(new WdkBrowserWallet(mnemonic))
    setScreen(returning ? 'home' : 'setup')
  }

  return (
    <div className="app">
      {screen === 'intro' && <Intro onNext={() => setScreen('wallet')} />}
      {screen === 'wallet' && <WalletGate onReady={onReady} />}
      {screen === 'setup' && <Setup budget={budget} setBudget={setBudget} onNext={() => setScreen('home')} onBack={() => setScreen('intro')} />}
      {screen === 'home' && wallet && <Home budget={budget} wallet={wallet} onHost={() => setScreen('host')} onWager={() => setScreen('wager')} onSecond={() => setScreen('second')} />}
      {screen === 'host' && <Host onBack={() => setScreen('home')} />}
      {screen === 'wager' && wallet && <Wager wallet={wallet} onBack={() => setScreen('home')} />}
      {screen === 'second' && wallet && <SecondScreen wallet={wallet} onBack={() => setScreen('home')} />}
    </div>
  )
}
