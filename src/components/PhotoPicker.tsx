import { useState } from 'react'
import { prepareImage } from '../lib/image'

interface Props {
  hasPhoto: boolean
  /** Called with the shrunken photo. May be async (e.g. uploads it); a thrown error is shown here. */
  onFile: (file: File) => void | Promise<void>
  onRemove: () => void | Promise<void>
}

/** Phones get a camera button too; on a computer "Take photo" would just open the file picker, so it's hidden. */
const hasCamera = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Choose / take / replace / remove a recipe photo. Photos are shrunk in the browser before `onFile` sees them. */
export function PhotoPicker({ hasPhoto, onFile, onRemove }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same picture again still fires
    if (!file) return
    setBusy(true)
    setError(null)
    try { await onFile(await prepareImage(file)) } catch (err) { setError((err as Error).message) }
    setBusy(false)
  }
  const remove = async () => {
    setBusy(true)
    setError(null)
    try { await onRemove() } catch (err) { setError((err as Error).message) }
    setBusy(false)
  }

  return (
    <div className="stack-sm">
      <div className="row">
        <label className={`btn btn-sm photo-btn${busy ? ' is-disabled' : ''}`}>
          {hasPhoto ? 'Replace photo' : 'Choose photo'}
          <input className="visually-hidden" type="file" accept="image/*" disabled={busy} onChange={pick} />
        </label>
        {hasCamera && (
          <label className={`btn btn-sm photo-btn${busy ? ' is-disabled' : ''}`}>
            Take photo
            <input className="visually-hidden" type="file" accept="image/*" capture="environment" disabled={busy} onChange={pick} />
          </label>
        )}
        {hasPhoto && <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={remove}>Remove photo</button>}
        {busy && <span className="muted small" role="status">Working on photo…</span>}
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
    </div>
  )
}
