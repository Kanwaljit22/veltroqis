import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './index.css'
import App from './App.tsx'
import { syncDocumentTheme } from './store/themeStore'

// Avoid light flash on refresh when theme is persisted
try {
  const raw = localStorage.getItem('veltroqis-theme')
  if (raw) {
    const parsed = JSON.parse(raw) as { state?: { colorMode?: string } }
    const mode = parsed.state?.colorMode
    if (mode === 'dark' || mode === 'light') syncDocumentTheme(mode)
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(<App />)
