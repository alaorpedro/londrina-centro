import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/*
  Service worker só em produção. Em dev ele serviria o bundle antigo do cache e
  faria a gente perseguir bug que já tinha sido corrigido.
*/
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sem service worker o app continua funcionando, só não fica instalável
    })
  })
}
