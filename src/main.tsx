import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { config } from './config'
import { applyBrandTheme } from './theme'

applyBrandTheme(config.brand.primaryColor)
document.title = config.seo.title || config.brand.name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
