import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isConfigured } from '../lib/supabase'

export function Layout() {
  const { session, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const onHome = useLocation().pathname === '/'
  const link = (to: string, label: string) => (
    <NavLink to={to} className="nav__link" onClick={() => setOpen(false)}>
      {label}
    </NavLink>
  )
  return (
    <>
      {/* Decorative site background. Full strength on the home page; calmer behind the content on every other page. */}
      <div className={`app-backdrop${onHome ? ' app-backdrop--home' : ''}`} aria-hidden="true" />
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand">Meal Prep</Link>
          <button className="btn btn-sm nav__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
          <nav className={`nav__links${open ? ' open' : ''}`} aria-label="Main">
            {link('/recommended', 'Recommended')}
            {link('/plan/setup/meals', 'Plan meals')}
            {session && link('/my-recipes', 'My recipes')}
            {session && link('/inventory', 'What I have')}
            {session && link('/targets', 'Targets')}
            {session && link('/plans', 'Past plans')}
            {isAdmin && link('/admin/recipes', 'Admin')}
            {session ? (
              <button className="btn btn-sm btn-ghost" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
            ) : (
              <>{link('/sign-in', 'Sign in')}{link('/sign-up', 'Sign up')}</>
            )}
          </nav>
        </div>
      </header>
      {!isConfigured && (
        <div className="container">
          <div className="alert alert-warn">
            Supabase isn't configured. Copy <code>.env.example</code> to <code>.env.local</code> and set
            <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
          </div>
        </div>
      )}
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
