import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchHiddenRecipeIds, hideRecipeRemote, unhideRecipeRemote } from './api'

const KEY = 'meal-prep:hidden'

function readLocal(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
function writeLocal(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* not remembered across visits */ }
}

/**
 * Recipes the person never wants suggested ("not for me"). Signed in: stored on their account.
 * Signed out: stored in this browser, then moved into the account when they sign in or up.
 */
export function useHidden() {
  const { userId, loading: authLoading } = useAuth()
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readLocal()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!userId) { setHidden(new Set(readLocal())); return }
    let cancelled = false
    ;(async () => {
      try {
        const local = readLocal()
        if (local.length) {
          // Carry choices made while signed out into the account. A recipe that no longer exists just fails to save.
          await Promise.allSettled(local.map((id) => hideRecipeRemote(userId, id)))
          writeLocal([])
        }
        const ids = await fetchHiddenRecipeIds()
        if (!cancelled) setHidden(new Set(ids))
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [userId, authLoading])

  const hide = useCallback(async (id: string) => {
    setHidden((prev) => new Set(prev).add(id))
    setError(null)
    try {
      if (userId) await hideRecipeRemote(userId, id)
      else writeLocal([...new Set([...readLocal(), id])])
    } catch (e) {
      setHidden((prev) => { const n = new Set(prev); n.delete(id); return n })
      setError((e as Error).message)
    }
  }, [userId])

  const unhide = useCallback(async (id: string) => {
    setHidden((prev) => { const n = new Set(prev); n.delete(id); return n })
    setError(null)
    try {
      if (userId) await unhideRecipeRemote(id)
      else writeLocal(readLocal().filter((x) => x !== id))
    } catch (e) {
      setHidden((prev) => new Set(prev).add(id))
      setError((e as Error).message)
    }
  }, [userId])

  return { hidden, hide, unhide, error }
}
