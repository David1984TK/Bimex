# Decisión de seguridad: credenciales Pinata/IPFS

## Contexto

`bimex-frontend/.env.example` exponía `VITE_PINATA_SECRET`. En Vite, cualquier variable con prefijo `VITE_` se inyecta en el bundle público del frontend; por lo tanto, no debe contener secretos con permisos de escritura, upload o administración.

## Decisión

Se asume el caso de mayor riesgo: el token usado para subir documentos a Pinata puede tener permisos de mutación. Por ello, el frontend ya no llama directamente a `https://api.pinata.cloud/pinning/pinFileToIPFS` ni necesita `VITE_PINATA_API_KEY`/`VITE_PINATA_SECRET`.

El upload se mueve a un proxy backend en `bimex-indexer`:

- `POST /upload-ipfs` recibe `multipart/form-data` con el campo `file`.
- Valida los mismos límites del frontend: PDF, PNG, JPG/JPEG y tamaño máximo de 10 MB.
- Aplica rate limiting: 20 uploads por IP por hora.
- Usa credenciales privadas de backend (`PINATA_JWT` recomendado, o `PINATA_API_KEY` + `PINATA_SECRET` como compatibilidad) para subir a Pinata.
- Devuelve únicamente `{ "IpfsHash": "..." }` al frontend.

## Variables de entorno

Frontend:

- `VITE_API_URL`: URL pública del `bimex-indexer`.
- No configurar secretos de Pinata con prefijo `VITE_`.

Backend (`bimex-indexer`):

- `PINATA_JWT`: token privado de Pinata con permisos mínimos de pin/upload.
- Alternativa legacy: `PINATA_API_KEY` y `PINATA_SECRET`, solo en backend.

## Operación requerida

1. Revisar en Vercel y eliminar cualquier `VITE_PINATA_SECRET` o `VITE_PINATA_API_KEY` configurado para el frontend.
2. Rotar cualquier credencial de Pinata que haya estado expuesta en variables `VITE_` o builds públicos.
3. Crear una credencial nueva con permisos mínimos y guardarla solo en el entorno del backend.
4. Confirmar en el dashboard de Pinata que la credencial nueva no tiene permisos administrativos innecesarios.

## Pruebas

Se agregaron pruebas del flujo proxy:

- El frontend llama a `/upload-ipfs` sin enviar headers de Pinata.
- El backend valida tipo/tamaño antes de llamar a Pinata.
- El backend aplica rate limit IP antes de parsear el archivo.
- El backend envía la credencial privada a Pinata desde servidor.
