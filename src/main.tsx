import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import { App } from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'

// Separate, lazy-loaded AI single-player mode at #/ai. Additive only: when the hash
// is not #/ai the app renders exactly as before, and the AI bundle is never loaded.
// AiTableMode reuses the REAL board and drives the AI's seat via store actions.
const AiApp = lazy(() => import('./ai/integration/AiTableMode'))

function Root() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  if (hash.startsWith('#/ai')) {
    return (
      <Suspense fallback={<div style={{ color: '#ece3cf', padding: 24 }}>Loading AI mode…</div>}>
        <AiApp />
      </Suspense>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
