import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Catches render-time crashes so the game shows a readable panel (with the error
 * and a recover button) instead of a blank white screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // surface it in the console for debugging
    console.error('Board crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen" role="alert">
          <div className="crash-card">
            <h2>Something broke on the board</h2>
            <p className="crash-msg">{this.state.error.message}</p>
            <pre className="crash-stack">{this.state.error.stack}</pre>
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Try to recover
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
