import { Navigate, Route, Routes } from 'react-router-dom'
import Guest from './routes/Guest'
import OwnerFloor from './routes/OwnerFloor'
import OwnerLogin from './routes/OwnerLogin'
import OwnerRunSheet from './routes/OwnerRunSheet'
import { RequireOwner } from './components/OwnerChrome'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest />} />
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route
        path="/owner"
        element={
          <RequireOwner>
            <OwnerRunSheet />
          </RequireOwner>
        }
      />
      <Route
        path="/owner/floor"
        element={
          <RequireOwner>
            <OwnerFloor />
          </RequireOwner>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
