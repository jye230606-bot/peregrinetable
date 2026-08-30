import BookingFlow from '../components/BookingFlow'

export default function Guest() {
  return (
    <div className="app">
      <header className="app__bar">
        <span className="display t-16">The Peacock</span>
        <span className="display t-11 ink-45">South Yarra</span>
      </header>
      <BookingFlow />
    </div>
  )
}
