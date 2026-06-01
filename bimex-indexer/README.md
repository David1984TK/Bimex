# Bimex Indexer

El indexer es un servicio en Node.js que realiza polling del RPC de Stellar para detectar eventos del contrato inteligente Bimex on-chain, sincroniza esta información con Supabase y proporciona APIs REST y de eventos Server-Sent Events (SSE) para el frontend.

## Instalación y Configuración

1. Ingresa a la carpeta del indexer:
   ```bash
   cd bimex-indexer
   ```

2. Copia el archivo `.env.example` a `.env` y configura tus variables de entorno:
   ```bash
   cp .env.example .env
   ```

3. Instala las dependencias y arranca el servicio:
   ```bash
   npm install
   npm start
   ```

## Endpoint de Salud (`GET /health`)

El indexer expone un endpoint de salud HTTP básico en el puerto configurado por la variable de entorno `HEALTH_PORT` (por defecto `3001`).

### Ejemplo de uso:

```bash
curl http://localhost:3001/health
```

### Respuesta de ejemplo (JSON):

```json
{
  "status": "ok",
  "ultimoLedger": 158432,
  "txProcesadas": 42,
  "ultimaActualizacion": "2026-05-30T11:20:00.000Z",
  "supabaseOk": true,
  "rpcLatencyMs: 145
}
```

### Campos:
- `status`: Estado general del indexer (`"ok"`).
- `ultimoLedger`: El número del último ledger indexado procesado de Stellar.
- `txProcesadas`: Total de transacciones exitosas del contrato parseadas y registradas por el indexer desde que se inició.
- `ultimaActualizacion`: Timestamp ISO de la última vez que se completó un ciclo de polling.
- `supabaseOk`: Estado de salud de la conexión con la base de datos Supabase. Cambia a `false` si el último intento de guardado (upsert/rpc) falló tras todos sus reintentos.
- `rpcLatencyMs`: Tiempo de latencia en milisegundos de la última llamada RPC realizada al nodo de Stellar.

## Robustez y Mecanismo de Reintento

Para garantizar la tolerancia a fallos ante caídas de red o cortes temporales de Supabase:
- Todas las operaciones de escritura (upserts/rpc) en la base de datos se ejecutan a través de un mecanismo de **reintento automático con Backoff Exponencial**.
- Se realizan hasta **3 intentos** de manera automática.
- El retraso entre intentos aumenta exponencialmente (`500ms`, `1000ms`, `2000ms`), previniendo saturación y permitiendo la recuperación del servicio base.
