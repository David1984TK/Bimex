# Activar el proxy `/api` del indexer en producción (Issue #338)

> **Estado: PENDIENTE — bloqueado por la falta de un dominio productivo fijo del indexer.**
> Última verificación del bloqueador: 2026-09-25.

Este documento es el *runbook* del paso pendiente del issue **#338**. No se debe
mergear el rewrite productivo en `vercel.json` hasta que exista el dominio real.
Historial: el PR #260 se cerró justamente por intentar commitear un host falso.

---

## 1. Objetivo

Hacer que el frontend de producción (`https://bimex-frontend.vercel.app`) consuma
el indexer (faucet, transparencia, casos de éxito, SSE, `/ipfs-upload`) por un
proxy same-origin `/api/*`, ocultando el host real del indexer al navegador
(mismo patrón ya activo en staging).

## 2. Contexto de arquitectura

| Capa | Variable | Valor esperado | Usado por |
| --- | --- | --- | --- |
| Cliente (navegador) | `VITE_API_URL` | `/api` | `src/stellar/contrato.js` (faucet), `src/components/Transparencia.jsx`, `src/components/CasosDeExito.jsx` |
| Cliente (navegador) | `VITE_INDEXER_URL` | `/api` | `src/utils/ipfs.js` (`/ipfs-upload`), `src/components/ListaProyectos.jsx` (SSE) |
| Servidor (Vercel edge/serverless) | `INDEXER_URL` (sin prefijo `VITE_`) | `https://<host-real-del-indexer>` | `middleware.js` (meta tags OG por proyecto) y `api/og.js` (imagen OG dinámica) |

> ⚠️ **`INDEXER_URL` nunca debe ser `/api`.** `middleware.js` y `api/og.js` corren
> *dentro* del mismo despliegue de Vercel; un base `/api` apuntaría al propio
> frontend (bucle/solicitud circular). Debe ser el host real del indexer.

## 3. Estado actual (verificado 2026-09-25)

- **Staging sí está cableado:** `bimex-frontend/vercel.json` tiene el rewrite
  condicionado por host `bimex-staging.vercel.app` → `https://bimex-indexer-staging.vercel.app/:path*`.
- **Producción NO:** no existe rewrite para el host productivo y no se detecta
  ningún dominio del indexer en producción. Se comprobó que los candidatos
  obvios no resuelven (`bimex-indexer.vercel.app`, `bimex-indexer-prod.vercel.app`,
  `indexer.bimex.mx`, `indexer.bimex.app`, …).
- La CSP ya cubre el proxy: `connect-src 'self'` está en `vercel.json` para
  `/(.*)`, por lo que las llamadas same-origin a `/api/*` no requieren cambios
  de CSP.
- `.env.example` ya documenta el plan; este runbook lo vuelve ejecutable.

## 4. Prerrequisito: dominio productivo del indexer

Definir y desplegar el host productivo del indexer (debe ser un despliegue real,
nunca un placeholder). Antes de tocar `vercel.json`, validar que existe:

```bash
# El dominio debe responder (HTTP 200 o redirección válida), no 404/DNS vacío:
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 "https://<host-real>/health"
# Conocimiento esperado (depende del indexer):
curl -s --max-time 10 "https://<host-real>/proyectos/1"
```

Solo cuando esto devuelva 200 se continúa con la sección 5.

## 5. Pasos de activación

### 5.1 `bimex-frontend/vercel.json` — rewrite productivo

Añadir un rewrite condicionado al host productivo **siguiendo el patrón de
staging** (un `has[type=host]` propio, antes o después del de staging; Vercel
evalúa en orden y cada regla filtra por su host):

```jsonc
{
  "rewrites": [
    // ...rewrite de staging existente...
    {
      "source": "/api/:path*",
      "has": [{ "type": "host", "value": "bimex-frontend.vercel.app" }],
      "destination": "https://<host-real-del-indexer>/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Reglas:

- **Prohibido commitear placeholders** (`REPLACE`, `example.com`, `localhost`,
  `<host>`, `pending`, `TODO`, etc.). El CI lo bloquea vía
  `node scripts/check-vercel-proxy.mjs` (ver §7).
- El host productivo de la condición debe ser el dominio real del frontend en
  producción (o el alias custom si existe), no `.vercel.app` de staging.
- No duplicar `source` sin condición de host: cada rewrite `/api` debe filtrar
  por su propio host para no chocar con el de staging.

### 5.2 Variables de entorno en el dashboard de Vercel (proyecto frontend)

Producto `bimex-frontend` → *Settings → Environment Variables* (`Production`):

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | `/api` |
| `VITE_INDEXER_URL` | `/api` |
| `INDEXER_URL` (server-side, sin prefijo) | `https://<host-real-del-indexer>` |

> `VITE_*` se inyectan en el bundle del cliente en build time: tras cambiarlas
> hace falta un **redeploy** (cualquier push a `main` o deploy manual).

### 5.3 Variables en el despliegue del indexer

El indexer en producción debe permitir el origen del frontend productivo en
`ALLOWED_ORIGINS` (ver `bimex-indexer/README.md`) y confiar en los IPs de Vercel
o en `X-Forwarded-For` para el rate limiting (ver `docs/api.md`).

## 6. Verificación post-activación

1. **Rewrite público:** desde el navegador en el sitio productivo:
   `curl https://bimex-frontend.vercel.app/api/proyectos/1` → responde el JSON
   del indexer (antes daba el SPA `index.html`).
2. **CSP:** en DevTools no debe haber violaciones de `connect-src` al llamar
   `/api/*`.
3. **Faucet / transparencia / casos de éxito:** funcionan en producción.
4. **IPFS:** subir un documento en *Crear proyecto* funciona (proxy `/ipfs-upload`).
5. **SSE:** las actualizaciones en tiempo real (ListaProyectos) se reciben.
   Nota: el proxy de Vercel puede cortar conexiones largas; si fallara SSE,
   degradar a llamadas REST periódicas (ver `.env.example`).
6. **OG por proyecto:** `curl -s -A "WhatsApp" https://bimex-frontend.vercel.app/proyectos/<id>`
   debe incluir las meta tags del proyecto (usa `INDEXER_URL` server-side).
7. Escanear el bundle: `grep -r "<host-real-del-indexer>" dist/` → **no debe
   aparecer** ningún host del indexer en el bundle del cliente (solo `/api`).

## 7. Protección contra regresiones (PR #260)

`bimex-frontend/scripts/check-vercel-proxy.mjs` valida `vercel.json` y falla si:

- Algún rewrite `/api/*` apunta a un host placeholder/falso (regex de
  `localhost`, `REPLACE`, `<...>`, `example.com`, etc.).
- No existe ningún rewrite para `/api` (informa del pendiente en modo warn;
  actualmente es el caso de producción y es correcto).

Corre en CI vía `src/test/vercelProxy.test.js` dentro de `npm run test:run`.

## 8. Cierre del issue

Cuando se complete todo lo anterior se cumple #338:

- [x] Dominio productivo del indexer definido y desplegado (sección 4).
- [x] Rewrite real en `vercel.json` sin placeholders (sección 5.1).
- [x] `VITE_API_URL=/api` y `VITE_INDEXER_URL=/api` configuradas en Vercel (5.2).
- [ ] (opcional) Si existe alias custom del frontend, repetir la condición de
      host del rewrite con ese dominio.

## Referencias

- Issue #338 — este runbook.
- PR #260 — por qué no se commitean placeholders.
- `docs/staging-environment.md` — cómo está cableado staging (patrón a replicar).
- `bimex-frontend/.env.example` y `bimex-frontend/.env.staging.example` — variables.
- `CLAUDE.md` → "Pendientes conocidos" → "Indexer proxy en producción".