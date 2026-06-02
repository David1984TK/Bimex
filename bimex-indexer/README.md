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

## Sistema de Notificaciones por Email

El indexer incluye un sistema de notificaciones por email usando [Resend](https://resend.com/) con templates HTML profesionales.

### Templates Disponibles

#### Templates HTML Profesionales (Nuevos)

- **bienvenida** - Email de bienvenida para nuevos usuarios (primera contribución)
- **nueva_contribucion** - Notificación cuando un proyecto recibe una contribución
- **proyecto_aprobado_html** - Notificación de proyecto aprobado con diseño profesional
- **yield_disponible_html** - Notificación de yield disponible con diseño profesional

#### Templates Legacy (Simples)

- **proyecto_aprobado** - Proyecto aprobado (versión simple)
- **proyecto_rechazado** - Proyecto rechazado
- **meta_alcanzada** - Meta de financiamiento alcanzada
- **yield_disponible** - Yield disponible (versión simple)
- **retiro_principal** - Retiro de principal

### Características de los Templates HTML

✅ **Diseño responsive** - Funciona en desktop y móvil
✅ **Compatible con clientes principales** - Gmail, Outlook, Apple Mail
✅ **Inline CSS** - Máxima compatibilidad con clientes de email
✅ **Branding de Bimex** - Usa la paleta de colores oficial (navy, green, amber)
✅ **Link de desuscripción** - Incluido en el footer de cada email

### Configuración

Agrega estas variables a tu archivo `.env`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM="Bimex <notificaciones@bimex.fi>"
FRONTEND_URL=https://bimex.fi
```

### Uso Programático

```javascript
import { enviarNotificacion } from "./notifications.js";

// Email de bienvenida
await enviarNotificacion("bienvenida", "usuario@example.com", {
  nombreProyecto: "Mi Proyecto",
  monto: "5000",
  idProyecto: "123",
});

// Nueva contribución
await enviarNotificacion("nueva_contribucion", "creador@example.com", {
  nombreProyecto: "Mi Proyecto",
  monto: "1000",
  progreso: "45",
  idProyecto: "123",
});

// Yield disponible
await enviarNotificacion("yield_disponible_html", "usuario@example.com", {
  nombreProyecto: "Mi Proyecto",
  monto: "250.50",
  tasaCetes: "11.2",
  idProyecto: "123",
});
```

### Testing de Templates

Para generar archivos HTML de prueba y visualizarlos en el navegador:

```bash
node test-templates.js
```

Esto generará archivos HTML en `./test-output/` que puedes abrir en tu navegador para verificar el diseño.

### Documentación Completa

Para más detalles sobre los templates, variables soportadas y cómo crear nuevos templates, consulta:

📄 [templates/README.md](./templates/README.md)
