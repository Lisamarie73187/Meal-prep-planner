import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'))

// Placeholders keep the app rendering (with a setup notice) when env vars are missing.
export const supabase = createClient(
  isConfigured ? url! : 'http://localhost:54321',
  isConfigured ? key! : 'missing-anon-key',
)

export function photoUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('recipe-photos').getPublicUrl(path).data.publicUrl
}
