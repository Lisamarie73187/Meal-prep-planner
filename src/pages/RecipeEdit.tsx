import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RecipeForm } from '../components/RecipeForm'
import { RecipeTextImport } from '../components/RecipeTextImport'
import { fetchRecipe } from '../lib/api'
import type { RecipeDraft } from '../lib/parseRecipe'
import { useAsync } from '../lib/useAsync'

export function RecipeEdit({ mode, isNew }: { mode: 'user' | 'admin'; isNew?: boolean }) {
  const { id } = useParams()
  const { data, error, loading } = useAsync(() => (isNew ? Promise.resolve(null) : fetchRecipe(id!)), [id, isNew])
  // Each read of pasted text restarts the form with that text's details, so the count `n` is part of the form's key.
  const [read, setRead] = useState<{ draft: RecipeDraft; n: number } | null>(null)
  const formTop = useRef<HTMLDivElement>(null)
  if (loading) return <p className="muted">Loading…</p>
  if (error) return <div className="alert alert-error">{error}</div>
  return (
    <div className="stack">
      <h1>{isNew ? 'Add a recipe' : 'Edit recipe'}{mode === 'admin' && ' (recommended)'}</h1>
      {isNew && mode === 'user' && (
        <RecipeTextImport
          onDraft={(draft) => {
            setRead({ draft, n: (read?.n ?? 0) + 1 })
            requestAnimationFrame(() => formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
          }}
        />
      )}
      <div ref={formTop}>
        <RecipeForm key={read?.n ?? 0} mode={mode} existing={data ?? undefined} draft={read?.draft} />
      </div>
    </div>
  )
}
