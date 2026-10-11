import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isConfigured } from '../lib/supabase'
import { BackgroundDebug } from './BackgroundDebug'
import { IconMenu, IconX } from './Icons'

export function Layout() {
  const { session, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()
  const onHome = loc.pathname === '/'
  const debugBackground = new URLSearchParams(loc.search).get('debug') === 'background'
  const link = (to: string, label: string, alsoActiveOn: string[] = []) => (
    <NavLink
      to={to} onClick={() => setOpen(false)}
      className={({ isActive }) => `nav__link${isActive || alsoActiveOn.some((p) => loc.pathname.startsWith(p)) ? ' active' : ''}`}
    >
      {label}
    </NavLink>
  )
  return (
    <>
      {/* Decorative site background. Full strength on the home page; calmer behind the content on every other page. */}
      <div className={`app-backdrop${onHome ? ' app-backdrop--home' : ''}`} aria-hidden="true" />
      {debugBackground && <BackgroundDebug home={onHome} />}
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand">Meal Prep</Link>
          <button
            type="button" className="btn nav__toggle" aria-expanded={open} aria-controls="main-nav"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}
          >
            {open ? <IconX size={24} /> : <IconMenu size={24} />}
          </button>
          <nav id="main-nav" className={`nav__links${open ? ' open' : ''}`} aria-label="Main">
            {link('/recipes', 'Recipes', ['/my-recipes'])}
            {link('/plan/setup/meals', 'Plan meals')}
            {session && link('/targets', 'Targets')}
            {session && link('/plans', 'Past plans')}
            {isAdmin && link('/admin/recipes', 'Admin', ['/admin'])}
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
