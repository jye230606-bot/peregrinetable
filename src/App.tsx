import { Navigate, Route, Routes } from 'react-router-dom'
import Guest from './routes/Guest'
import OwnerFloor from './routes/OwnerFloor'
import OwnerLogin from './routes/OwnerLogin'
import OwnerRunSheet from './routes/OwnerRunSheet'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest />} />
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner" element={<OwnerRunSheet />} />
      <Route path="/owner/floor" element={<OwnerFloor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
