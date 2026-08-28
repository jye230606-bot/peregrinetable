import { tables } from '../data'
import FloorPlan from '../scene/FloorPlan'

export default function Guest() {
  return (
    <div className="app">
      <header className="app__bar">
        <span className="display t-16">The Peacock</span>
        <span className="display t-11 ink-45">South Yarra</span>
      </header>
      <main className="app__body">
        <FloorPlan tables={tables} stateOf={() => 'available'} />
      </main>
    </div>
  )
}
