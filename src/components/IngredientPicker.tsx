import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Ingredient } from '../lib/types'
import { IngredientModal } from './IngredientModal'

interface Props {
  ingredients: Ingredient[]
  onPick: (ing: Ingredient) => void
  /** Called after a new ingredient is created so the parent can refresh its list. */
  onCreated: (ing: Ingredient) => void
  /** 'recommended' creates public ingredients (admin only). */
  scope?: 'user' | 'recommended'
  exclude?: Set<string>
  placeholder?: string
}

export function IngredientPicker({ ingredients, onPick, onCreated, scope = 'user', exclude, placeholder = 'Search ingredients…' }: Props) {
  const listId = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const term = q.trim().toLowerCase()
  const matches = ingredients
    .filter((i) => !exclude?.has(i.id) && (!term || i.name.toLowerCase().includes(term)))
    .slice(0, 8)
  const exact = ingredients.some((i) => i.name.toLowerCase() === term)

  const pick = (ing: Ingredient) => {
    onPick(ing)
    setQ('')
    setOpen(false)
  }

  return (
    <div className="ac">
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        aria-label="Ingredient"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (matches[0]) pick(matches[0])
          }
        }}
      />
      {open && (matches.length > 0 || (term && !exact)) && (
        <ul id={listId} className="ac__list" role="listbox">
          {matches.map((i) => (
            <li key={i.id} className="ac__opt" role="option" aria-selected="false" onMouseDown={() => pick(i)}>
              <span>{i.name}</span>
              {i.owner_id && <span className="badge">mine</span>}
            </li>
          ))}
          {term && !exact && (
            <li className="ac__opt" role="option" aria-selected="false" onMouseDown={() => setCreating(true)}>
              <strong>+ Create “{q.trim()}”</strong>
            </li>
          )}
        </ul>
      )}
      {creating && createPortal(
        // Rendered outside the page's own <form> (this picker lives inside the recipe form), so its submit is its own.
        <IngredientModal
          initialName={q.trim()}
          scope={scope}
          onClose={() => setCreating(false)}
          onSaved={(ing) => {
            setCreating(false)
            onCreated(ing)
            pick(ing)
          }}
        />,
        document.body,
      )}
    </div>
  )
}
