import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/archivo-black'
import '@fontsource/special-elite'
import '@fontsource/gaegu'
import '@fontsource/patrick-hand'
import '@fontsource/gochi-hand'
import '@fontsource/schoolbell'
import '@fontsource/short-stack'
import '@fontsource/caveat'
import '@fontsource/anton/400.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import { SITE_NAME } from './config/site'
import './index.css'
import App from './App.tsx'

document.title = SITE_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
