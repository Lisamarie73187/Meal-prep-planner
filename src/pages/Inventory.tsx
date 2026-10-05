import { InventoryEditor } from '../components/InventoryEditor'
import { fetchInventory } from '../lib/api'
import { useAsync } from '../lib/useAsync'

export function Inventory() {
  const inv = useAsync(fetchInventory, [])
  return (
    <div className="stack">
      <h1>What I have</h1>
      <p className="muted">Fridge and pantry items. Plans subtract these from your grocery list. This step is optional.</p>
      {inv.error && <div className="alert alert-error">{inv.error}</div>}
      <div className="card">
        <InventoryEditor items={inv.data ?? []} loading={inv.loading} onChanged={inv.reload} />
      </div>
    </div>
  )
}
