import React from 'react'
import { Buffer } from 'buffer'
import { registerSW } from 'virtual:pwa-register'
import * as Sentry from '@sentry/react'

globalThis.Buffer = Buffer

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

registerSW({ immediate: true })

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_NETWORK || 'testnet',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.id;
        delete event.user.username;
        delete event.user.email;
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (!bc.data) return bc;
          const sanitized = { ...bc.data };
          Object.keys(sanitized).forEach(key => {
            if (/address|wallet|direccion/i.test(key)) sanitized[key] = '[REDACTED]';
          });
          return { ...bc, data: sanitized };
        });
      }
      return event;
    },
  });
}

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
