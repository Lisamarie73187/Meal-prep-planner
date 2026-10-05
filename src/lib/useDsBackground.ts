import { useEffect } from 'react'

/** Tints the page behind a redesigned (class="ds") screen with the design-system background while it is mounted. */
export function useDsBackground() {
  useEffect(() => {
    document.body.classList.add('ds-bg')
    return () => document.body.classList.remove('ds-bg')
  }, [])
}
