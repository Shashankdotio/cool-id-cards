import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/special-elite'
import '@fontsource/gaegu'
import '@fontsource/patrick-hand'
import '@fontsource/gochi-hand'
import '@fontsource/schoolbell'
import '@fontsource/short-stack'
import '@fontsource/caveat'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
