import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <p className="muted center-note">Loading…</p>
  if (!session) return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search }} />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin, loading } = useAuth()
  if (loading) return <p className="muted center-note">Loading…</p>
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
