import { useRef, useState } from 'react'
import { addTerms, splitList } from '../lib/setupDraft'
import { IconPlus, IconX } from './Icons'

interface Props {
  id: string
  /** Accessible name for the text box, e.g. "Ingredients you have". */
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}

/**
 * A text box that turns entries into removable chips. Enter or a comma adds what you typed (pasting
 * "a, b, c" adds three), the × on a chip removes it, and Backspace in an empty box removes the last one.
 */
export function ChipInput({ id, label, values, onChange, placeholder }: Props) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const commit = (raw: string) => {
    const added = splitList(raw).filter((t) => !values.some((v) => v.toLowerCase() === t.toLowerCase()))
    if (added.length) {
      onChange(addTerms(values, raw))
      setStatus(`Added ${added.join(', ')}.`)
    }
  }
  const remove = (v: string) => {
    onChange(values.filter((x) => x !== v))
    setStatus(`Removed ${v}.`)
    input.current?.focus()
  }

  const handleChange = (v: string) => {
    if (/[,;\n]/.test(v)) {
      // A comma finishes an item; anything after the last comma stays in the box.
      const parts = v.split(/[,;\n]/)
      const rest = parts.pop() ?? ''
      commit(parts.join(','))
      setText(rest)
    } else {
      setText(v)
    }
  }

  return (
    <div className="chips" onClick={() => input.current?.focus()}>
      {values.length > 0 && (
        <ul className="chips__list" aria-label={`${label}: ${values.length} added`}>
          {values.map((v) => (
            <li key={v.toLowerCase()} className="chip">
              <span>{v}</span>
              <button type="button" className="chip__remove" aria-label={`Remove ${v}`} onClick={(e) => { e.stopPropagation(); remove(v) }}>
                <IconX size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="chips__field">
        <label htmlFor={id} className="visually-hidden">{label}</label>
        <input
          id={id} ref={input} className="chips__input" type="text" value={text} placeholder={placeholder}
          autoComplete="off" autoCapitalize="none" enterKeyHint="done"
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => { if (text.trim()) { commit(text); setText('') } }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault() // don't submit a surrounding form
              if (text.trim()) { commit(text); setText('') }
            } else if (e.key === 'Backspace' && text === '' && values.length > 0) {
              remove(values[values.length - 1])
            }
          }}
        />
        {text.trim() && (
          <button
            type="button" className="chips__add" aria-label={`Add ${text.trim()}`}
            onMouseDown={(e) => e.preventDefault() /* keep focus so blur doesn't add it twice */}
            onClick={() => { commit(text); setText(''); input.current?.focus() }}
          >
            <IconPlus size={18} /> Add
          </button>
        )}
      </div>
      <div className="visually-hidden" role="status" aria-live="polite">{status}</div>
    </div>
  )
}
