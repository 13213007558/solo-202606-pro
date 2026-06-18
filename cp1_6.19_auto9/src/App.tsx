import { useRef } from 'react'
import { GameState } from './data/gameState'
import GameCanvas from './render/GameCanvas'
import UIPanel from './render/UIPanel'

function App() {
  const gameStateRef = useRef<GameState>(new GameState())

  return (
    <div className="app-container">
      <GameCanvas gameState={gameStateRef.current} />
      <UIPanel gameState={gameStateRef.current} />
    </div>
  )
}

export default App
