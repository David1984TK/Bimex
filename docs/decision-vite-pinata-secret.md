# Decisión: `VITE_PINATA_SECRET` → proxy server-side (#145)

## Contexto

En `.env.example` aparecía históricamente `VITE_PINATA_SECRET`. Todo lo prefijado con `VITE_` se bundlea en el JS público del frontend y queda visible a cualquier usuario.

Un JWT de Pinata puede ser:

| Tipo | ¿Seguro en el cliente? |
| --- | --- |
| Gateway-only (solo lectura de gateway) | Sí, con un nombre menos confuso |
| API secret / JWT con permiso de `pinFileToIPFS` | **No** — cualquiera puede subir archivos o quemar cuota |

## Auditoría

1. **Código actual:** el frontend (`bimex-frontend/src/utils/ipfs.js`) ya **no** llama a Pinata. Sube vía `POST ${VITE_INDEXER_URL}/ipfs-upload`.
2. **Backend:** `bimex-indexer/ipfsProxy.js` usa `PINATA_API_KEY` + `PINATA_SECRET` (sin prefijo `VITE_`) contra `https://api.pinata.cloud/pinning/pinFileToIPFS` — es decir, secretos con permiso de **upload**.
3. **Ejemplos de entorno:** `bimex-frontend/.env.example` y `.env.staging.example` documentan que Pinata vive solo en el indexer. Ver también `docs/api.md` (`POST /ipfs-upload`).

No se pudo inspeccionar el dashboard de Vercel/Pinata desde este cambio de código. La decisión se basa en el uso real en el repositorio: las keys del servidor llaman a `pinFileToIPFS`, por lo que **no** son un JWT público de gateway.

## Decisión

**Mover (y mantener) el secret en el backend.** No renombrar a `VITE_PINATA_GATEWAY_TOKEN`.

| Acción | Estado |
| --- | --- |
| Endpoint proxy `POST /ipfs-upload` en `bimex-indexer` | Implementado (`ipfsProxy.js` + rate limit) |
| Frontend llama al proxy (no a Pinata) | Implementado (`subirAIPFS` → `/ipfs-upload`) |
| Validación de tipo/tamaño | Cliente (`validarArchivo`) + servidor (`handleIpfsUpload`) |
| Fallback SHA-256 si el proxy falla | Implementado (`subirConFallback`) |
| Variables `VITE_PINATA_*` en el frontend | Eliminadas de ejemplos; no deben existir en Vercel |

## Operaciones pendientes (fuera del repo)

Mantenedores con acceso a Vercel / Pinata deben:

1. Confirmar que **no** queda `VITE_PINATA_SECRET` (ni `VITE_PINATA_API_KEY`) en el proyecto frontend de Vercel.
2. Configurar `PINATA_API_KEY` y `PINATA_SECRET` solo en el entorno del **indexer**.
3. Si alguna key con upload estuvo alguna vez en un env `VITE_*` o en un bundle público: **rotar** la key en el dashboard de Pinata y actualizar el indexer.

## Referencias

- Issue: [#145](https://github.com/David1984TK/Bimex/issues/145)
- API: [`docs/api.md`](api.md) — sección Upload IPFS
- Código: `bimex-indexer/ipfsProxy.js`, `bimex-frontend/src/utils/ipfs.js`
