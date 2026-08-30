import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../data'

export default function OwnerLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(false)
    const session = await signIn(username, password)
    setBusy(false)
    if (session) navigate('/owner', { replace: true })
    else setError(true)
  }

  return (
    <div className="app">
      <header className="app__bar">
        <span className="display t-16">The Peacock</span>
        <span className="display t-11 ink-45">Owner</span>
      </header>

      <main className="app__body gate-wrap">
        <form className="panel gate enter login" onSubmit={submit}>
          <h1 className="display t-22 gate__title">Sign in</h1>

          <hr className="rule" />

          <label className="stack-8">
            <span className="label">Username</span>
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label className="stack-8">
            <span className="label">Password</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="t-13 dock__error">That is not right. Try again.</p> : null}

          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
