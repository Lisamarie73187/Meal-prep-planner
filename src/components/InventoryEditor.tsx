import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { deleteInventory, fetchIngredients, upsertInventory } from '../lib/api'
import type { Ingredient, InventoryItem } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { AmountInput } from './AmountInput'
import { IngredientPicker } from './IngredientPicker'

/** Add, edit and remove what's in the fridge/pantry. The parent owns the list and reloads it via onChanged. */
export function InventoryEditor({ items, loading, onChanged }: { items: InventoryItem[]; loading?: boolean; onChanged: () => void }) {
  const { userId } = useAuth()
  const ings = useAsync(fetchIngredients, [])
  const [extra, setExtra] = useState<Ingredient[]>([])
  const [error, setError] = useState<string | null>(null)

  const guard = async (fn: () => Promise<void>) => {
    setError(null)
    try { await fn(); onChanged() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="stack">
      <IngredientPicker
        ingredients={[...(ings.data ?? []), ...extra]}
        exclude={new Set(items.map((i) => i.ingredient_id))}
        onCreated={(ing) => setExtra([...extra, ing])}
        onPick={(ing) => guard(() => upsertInventory(userId!, ing.id, 0))}
        placeholder="Add an item — e.g. chicken breast"
      />
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="muted">Nothing yet. Search above to add what you have.</p>}
      {items.map((it) => (
        <InventoryRow key={it.id} item={it} onSave={(a) => guard(() => upsertInventory(userId!, it.ingredient_id, a))} onRemove={() => guard(() => deleteInventory(it.id))} />
      ))}
    </div>
  )
}

function InventoryRow({ item, onSave, onRemove }: { item: InventoryItem; onSave: (amount: number) => void; onRemove: () => void }) {
  const [amount, setAmount] = useState(item.amount)
  const dirty = Math.abs(amount - item.amount) > 1e-9
  return (
    <div className="ing-row">
      <div><strong>{item.ingredient.name}</strong></div>
      <AmountInput ingredient={item.ingredient} label={item.ingredient.name} value={amount} onChange={setAmount} />
      <div className="row">
        <button className="btn btn-sm btn-primary" disabled={!dirty} onClick={() => onSave(amount)}>Save</button>
        <button className="btn btn-sm btn-danger" aria-label={`Remove ${item.ingredient.name}`} onClick={onRemove}>✕</button>
      </div>
    </div>
  )
}
