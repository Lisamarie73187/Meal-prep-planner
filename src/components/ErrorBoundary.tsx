import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

// Catches errors thrown while rendering, so one broken page shows a message instead of a blank screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="errscreen center-note stack" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">Sorry about that. Reloading the page usually fixes it. Your saved data is safe.</p>
        <div className="errscreen__actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          <a className="btn" href="/">Go to home</a>
        </div>
      </div>
    )
  }
}
