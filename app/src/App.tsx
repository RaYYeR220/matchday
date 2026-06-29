import { useState } from 'react'
import { Home } from './screens/Home'
import { Intro } from './screens/Intro'
import { Setup } from './screens/Setup'
import { Host } from './screens/Host'

type Screen = 'intro' | 'setup' | 'home' | 'host'

export function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [budget, setBudget] = useState(100)
  return (
    <div className="app">
      {screen === 'intro' && <Intro onNext={() => setScreen('setup')} />}
      {screen === 'setup' && <Setup budget={budget} setBudget={setBudget} onNext={() => setScreen('home')} onBack={() => setScreen('intro')} />}
      {screen === 'home' && <Home budget={budget} onHost={() => setScreen('host')} />}
      {screen === 'host' && <Host onBack={() => setScreen('home')} />}
    </div>
  )
}
