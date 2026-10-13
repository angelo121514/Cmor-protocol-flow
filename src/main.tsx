import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Sentry: importar ANTES que App para capturar errores de inicialización
import './instrumentation'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider'
import { PanelLangProvider } from './i18n/panelI18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="cmor-ui-theme">
      <PanelLangProvider defaultLang="es">
        <App />
      </PanelLangProvider>
    </ThemeProvider>
  </StrictMode>,
)
