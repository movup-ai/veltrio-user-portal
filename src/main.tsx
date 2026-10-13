import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initErrorReporting, rootErrorHandlers } from '@/lib/error-reporting'
import '@/styles/globals.css'

initErrorReporting()

createRoot(document.getElementById('root')!, rootErrorHandlers).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
