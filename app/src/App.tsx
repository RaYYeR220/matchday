import { useState } from 'react'
import { Home } from './screens/Home'
import { Intro } from './screens/Intro'
import { Setup } from './screens/Setup'
import { Host } from './screens/Host'
import { Wager } from './screens/Wager'
import { SecondScreen } from './screens/SecondScreen'

type Screen = 'intro' | 'setup' | 'home' | 'host' | 'wager' | 'second'

export function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [budget, setBudget] = useState(100)
  return (
    <div className="app">
      {screen === 'intro' && <Intro onNext={() => setScreen('setup')} />}
      {screen === 'setup' && <Setup budget={budget} setBudget={setBudget} onNext={() => setScreen('home')} onBack={() => setScreen('intro')} />}
      {screen === 'home' && <Home budget={budget} onHost={() => setScreen('host')} onWager={() => setScreen('wager')} onSecond={() => setScreen('second')} />}
      {screen === 'host' && <Host onBack={() => setScreen('home')} />}
      {screen === 'wager' && <Wager onBack={() => setScreen('home')} />}
      {screen === 'second' && <SecondScreen onBack={() => setScreen('home')} />}
    </div>
  )
}
