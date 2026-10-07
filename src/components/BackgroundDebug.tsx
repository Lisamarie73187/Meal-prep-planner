import { useEffect, useState } from 'react'

const read = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))

/**
 * A tuning aid, shown by adding ?debug=background to any address. It tints the zones where the cream wash covers the
 * photo and prints the live numbers, which come from the --bg-wash-* tokens in tokens.css.
 */
export function BackgroundDebug({ home }: { home: boolean }) {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const on = () => setWidth(window.innerWidth)
    window.addEventListener('resize', on)
    document.body.classList.add('bg-debug')
    return () => { window.removeEventListener('resize', on); document.body.classList.remove('bg-debug') }
  }, [])

  const edge = read('--bg-wash-edge')
  const column = read('--bg-wash-column')
  const half = read('--bg-column-half')
  const panel = read('--home-panel-opacity')
  const side = Math.max(0, Math.round(width / 2 - half)) // each fade band; 0 when the screen is narrower than the column

  return (
    <>
      {!home && side > 0 && (
        <>
          <div className="bg-debug-zone bg-debug-zone--edge" style={{ left: 0, width: side }} />
          <div className="bg-debug-zone bg-debug-zone--column" style={{ left: side, right: side }} />
          <div className="bg-debug-zone bg-debug-zone--edge" style={{ right: 0, width: side }} />
        </>
      )}
      {!home && side === 0 && <div className="bg-debug-zone bg-debug-zone--column" style={{ left: 0, right: 0 }} />}

      <aside className="bg-debug-legend" aria-label="Background transparency map">
        <p><strong>Background map</strong> · screen is {width}px wide</p>
        {home ? (
          <ul>
            <li><span className="bg-debug-swatch" style={{ background: '#ccc' }} />Photo: shown at <strong>100%</strong> everywhere outside the panel.</li>
            <li><span className="bg-debug-swatch" style={{ background: 'rgb(190,18,60)' }} />Red outline: the white text panel is <strong>{panel}% opaque</strong>, so the photo shows through at {100 - panel}%.</li>
          </ul>
        ) : (
          <ul>
            <li>
              <span className="bg-debug-swatch" style={{ background: 'rgb(34,160,90)' }} />
              <strong>Green</strong> (screen edges, {side}px each): photo shows through at {100 - edge}% at the very edge, fading to {100 - column}%.
              {side === 0 && ' None at this width.'}
            </li>
            <li>
              <span className="bg-debug-swatch" style={{ background: 'rgb(225,29,72)' }} />
              <strong>Red</strong> (content column{side === 0 ? ', the whole screen at this width' : ''}): photo shows through at only <strong>{100 - column}%</strong>.
            </li>
          </ul>
        )}
        <p>To change it, edit <code>--bg-wash-edge</code>, <code>--bg-wash-column</code> and <code>--home-panel-opacity</code> in <code>src/styles/tokens.css</code> (lower = more photo).</p>
      </aside>
    </>
  )
}
