import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { fetchProfile } from '../lib/api'
import type { Profile } from '../lib/types'

interface AuthValue {
  session: Session | null
  userId: string | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    setProfile(await fetchProfile(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    refreshProfile()
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [userId, refreshProfile])

  const value = useMemo<AuthValue>(
    () => ({
      session, userId, profile, isAdmin: profile?.is_admin ?? false, loading, refreshProfile,
      signOut: async () => void (await supabase.auth.signOut()),
    }),
    [session, userId, profile, loading, refreshProfile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
