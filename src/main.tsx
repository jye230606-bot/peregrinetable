import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { restoreSession } from './data'
import './index.css'

// With the API live the session lives in a cookie script cannot read, so the
// guard has to ask the server before it can decide anything.
await restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
