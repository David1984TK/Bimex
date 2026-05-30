import React from 'react'
import { Buffer } from 'buffer'
import { registerSW } from 'virtual:pwa-register'

globalThis.Buffer = Buffer

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)

if (import.meta.env.DEV && typeof window !== 'undefined') {
  Promise.all([import('@axe-core/react'), import('react-dom')])
    .then(([axeModule, ReactDOM]) => {
      const reactDom = ReactDOM?.default ?? ReactDOM;
      axeModule.default(React, reactDom, 1000);
    })
    .catch(() => {
      // axe dev helper is optional in development
    });
}
