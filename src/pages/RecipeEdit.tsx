import { useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecipeForm } from '../components/RecipeForm'
import { RecipeTextImport } from '../components/RecipeTextImport'
import { fetchRecipe } from '../lib/api'
import type { RecipeDraft } from '../lib/parseRecipe'
import { useAsync } from '../lib/useAsync'

/** `copy`: the signed-in person is editing a shared recipe they don't own; it saves as their own copy. */
export function RecipeEdit({ mode, isNew, copy }: { mode: 'user' | 'admin'; isNew?: boolean; copy?: boolean }) {
  const { id } = useParams()
  const { userId, isAdmin } = useAuth()
  const { data, error, loading } = useAsync(() => (isNew ? Promise.resolve(null) : fetchRecipe(id!)), [id, isNew])
  // Each read of pasted text restarts the form with that text's details, so the count `n` is part of the form's key.
  const [read, setRead] = useState<{ draft: RecipeDraft; n: number } | null>(null)
  const formTop = useRef<HTMLDivElement>(null)
  if (loading) return <p className="muted">Loading…</p>
  if (error) return <div className="alert alert-error">{error}</div>
  if (copy && data) {
    // Your own recipe edits in place; admins edit the shared one in place; everyone else gets a copy.
    if (data.owner_id !== null && data.owner_id === userId) return <Navigate to={`/my-recipes/${data.id}/edit`} replace />
    if (data.owner_id === null && isAdmin) return <Navigate to={`/admin/recipes/${data.id}/edit`} replace />
  }
  return (
    <div className="stack">
      <h1>{isNew ? 'Add a recipe' : 'Edit recipe'}{mode === 'admin' && ' (recommended)'}</h1>
      {isNew && (
        <RecipeTextImport
          onDraft={(draft) => {
            setRead({ draft, n: (read?.n ?? 0) + 1 })
            requestAnimationFrame(() => formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
          }}
        />
      )}
      <div ref={formTop}>
        <RecipeForm key={read?.n ?? 0} mode={mode} existing={data ?? undefined} asCopy={copy} draft={read?.draft} />
      </div>
    </div>
  )
}
