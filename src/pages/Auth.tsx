import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GUEST_PLAN_ID, hasGuestPlan } from '../lib/api'
import { supabase } from '../lib/supabase'

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const state = useLocation().state as { from?: string; returnTo?: string; category?: string } | null
  const from = state?.from ?? (hasGuestPlan() ? `/plan/${GUEST_PLAN_ID}/results` : '/plan/setup/meals')
  const isUp = mode === 'sign-up'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error: err } = isUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) return setError(err.message)
    if (data.session) navigate(from, { replace: true, state: state?.returnTo ? { returnTo: state.returnTo, category: state.category } : undefined })
    else setNotice('Check your email to confirm your account, then sign in.')
  }

  return (
    <form className="card auth-card stack" onSubmit={submit}>
      <h1>{isUp ? 'Create your account' : 'Welcome back'}</h1>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" className="input" type="password" required minLength={6} autoComplete={isUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : isUp ? 'Sign up' : 'Sign in'}</button>
      <p className="muted small">
        {isUp ? <>Already have an account? <Link to="/sign-in">Sign in</Link></> : <>New here? <Link to="/sign-up">Create an account</Link></>}
      </p>
    </form>
  )
}
