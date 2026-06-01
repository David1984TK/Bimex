# Guía de Integración - Notificaciones Email

Esta guía muestra cómo integrar las notificaciones email en el flujo del indexer.

## Escenarios de Uso

### 1. Email de Bienvenida (Primera Contribución)

Enviar cuando un usuario hace su primera contribución a cualquier proyecto.

```javascript
// En eventParser.js o donde proceses el evento 'nueva_aportacion'
import { enviarNotificacion } from "./notifications.js";

async function procesarNuevaAportacion(evento) {
  const { proyecto_id, contribuidor, monto } = evento;
  
  // Verificar si es la primera contribución del usuario
  const { data: contribuciones } = await supabase
    .from("aportaciones")
    .select("id")
    .eq("contribuidor", contribuidor);
  
  const esPrimeraContribucion = contribuciones.length === 1;
  
  if (esPrimeraContribucion) {
    // Obtener email del usuario (desde tu tabla de usuarios)
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("email, notificaciones_activas")
      .eq("wallet_address", contribuidor)
      .single();
    
    if (usuario?.email && usuario.notificaciones_activas) {
      // Obtener nombre del proyecto
      const { data: proyecto } = await supabase
        .from("proyectos")
        .select("nombre")
        .eq("id", proyecto_id)
        .single();
      
      await enviarNotificacion("bienvenida", usuario.email, {
        nombreProyecto: proyecto.nombre,
        monto: monto.toString(),
        idProyecto: proyecto_id,
      });
    }
  }
}
```

### 2. Notificación de Nueva Contribución (Para Creador)

Enviar al creador del proyecto cuando recibe una nueva contribución.

```javascript
async function notificarCreadorContribucion(evento) {
  const { proyecto_id, monto } = evento;
  
  // Obtener datos del proyecto y creador
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("nombre, creador, meta, total_recaudado")
    .eq("id", proyecto_id)
    .single();
  
  // Obtener email del creador
  const { data: creador } = await supabase
    .from("usuarios")
    .select("email, notificaciones_activas")
    .eq("wallet_address", proyecto.creador)
    .single();
  
  if (creador?.email && creador.notificaciones_activas) {
    const progreso = Math.round((proyecto.total_recaudado / proyecto.meta) * 100);
    
    await enviarNotificacion("nueva_contribucion", creador.email, {
      nombreProyecto: proyecto.nombre,
      monto: monto.toString(),
      progreso: progreso.toString(),
      idProyecto: proyecto_id,
    });
  }
}
```

### 3. Proyecto Aprobado

Enviar cuando un admin aprueba un proyecto.

```javascript
async function notificarProyectoAprobado(proyecto_id) {
  // Obtener datos del proyecto
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("nombre, creador")
    .eq("id", proyecto_id)
    .single();
  
  // Obtener email del creador
  const { data: creador } = await supabase
    .from("usuarios")
    .select("email, notificaciones_activas")
    .eq("wallet_address", proyecto.creador)
    .single();
  
  if (creador?.email && creador.notificaciones_activas) {
    await enviarNotificacion("proyecto_aprobado_html", creador.email, {
      nombreProyecto: proyecto.nombre,
      idProyecto: proyecto_id,
    });
  }
}
```

### 4. Yield Disponible

Enviar cuando el yield acumulado supera un umbral (ej: 100 MXNe).

```javascript
async function verificarYNotificarYield() {
  const UMBRAL_YIELD = 100; // MXNe
  
  // Obtener proyectos con yield acumulado > umbral
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, nombre, creador, yield_acumulado")
    .eq("estado", "financiado")
    .gte("yield_acumulado", UMBRAL_YIELD);
  
  for (const proyecto of proyectos) {
    // Verificar si ya se notificó recientemente
    const { data: ultimaNotif } = await supabase
      .from("notificaciones_enviadas")
      .select("created_at")
      .eq("proyecto_id", proyecto.id)
      .eq("tipo", "yield_disponible")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    // No notificar si se envió hace menos de 7 días
    const diasDesdeUltima = ultimaNotif 
      ? (Date.now() - new Date(ultimaNotif.created_at)) / (1000 * 60 * 60 * 24)
      : 999;
    
    if (diasDesdeUltima < 7) continue;
    
    // Obtener email del creador
    const { data: creador } = await supabase
      .from("usuarios")
      .select("email, notificaciones_activas")
      .eq("wallet_address", proyecto.creador)
      .single();
    
    if (creador?.email && creador.notificaciones_activas) {
      await enviarNotificacion("yield_disponible_html", creador.email, {
        nombreProyecto: proyecto.nombre,
        monto: proyecto.yield_acumulado.toFixed(2),
        tasaCetes: "11.2", // Obtener de tu fuente de datos
        idProyecto: proyecto.id,
      });
      
      // Registrar notificación enviada
      await supabase
        .from("notificaciones_enviadas")
        .insert({
          proyecto_id: proyecto.id,
          tipo: "yield_disponible",
          email: creador.email,
        });
    }
  }
}

// Ejecutar cada 24 horas
setInterval(verificarYNotificarYield, 24 * 60 * 60 * 1000);
```

## Tabla de Notificaciones (Opcional)

Para trackear qué notificaciones se han enviado y evitar duplicados:

```sql
CREATE TABLE notificaciones_enviadas (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'bienvenida', 'nueva_contribucion', 'yield_disponible', etc.
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_proyecto_tipo ON notificaciones_enviadas(proyecto_id, tipo);
CREATE INDEX idx_notif_created ON notificaciones_enviadas(created_at);
```

## Tabla de Preferencias de Usuario

Para permitir que los usuarios gestionen sus notificaciones:

```sql
CREATE TABLE usuarios (
  wallet_address TEXT PRIMARY KEY,
  email TEXT,
  notificaciones_activas BOOLEAN DEFAULT true,
  notif_contribuciones BOOLEAN DEFAULT true,
  notif_yield BOOLEAN DEFAULT true,
  notif_aprobaciones BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Manejo de Errores

```javascript
async function enviarNotificacionSegura(tipo, email, data) {
  try {
    await enviarNotificacion(tipo, email, data);
    console.log(`✅ Email ${tipo} enviado a ${email}`);
  } catch (error) {
    console.error(`❌ Error enviando email ${tipo} a ${email}:`, error);
    
    // Opcional: guardar en cola de reintentos
    await supabase
      .from("cola_notificaciones")
      .insert({
        tipo,
        email,
        data: JSON.stringify(data),
        intentos: 0,
        error: error.message,
      });
  }
}
```

## Rate Limiting

Resend tiene límites de envío. Para producción, considera:

```javascript
import pLimit from "p-limit";

// Limitar a 10 emails concurrentes
const limit = pLimit(10);

async function enviarNotificacionesEnLote(notificaciones) {
  const promises = notificaciones.map(({ tipo, email, data }) =>
    limit(() => enviarNotificacionSegura(tipo, email, data))
  );
  
  await Promise.all(promises);
}
```

## Testing

Antes de enviar a usuarios reales, prueba con emails de desarrollo:

```javascript
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TEST_EMAIL = "test@bimex.fi";

async function enviarNotificacionConTest(tipo, email, data) {
  const destinatario = IS_PRODUCTION ? email : TEST_EMAIL;
  await enviarNotificacion(tipo, destinatario, data);
}
```

## Monitoreo

Agrega logs para monitorear el sistema de notificaciones:

```javascript
async function enviarNotificacionConLog(tipo, email, data) {
  const inicio = Date.now();
  
  try {
    await enviarNotificacion(tipo, email, data);
    const duracion = Date.now() - inicio;
    
    console.log({
      evento: "email_enviado",
      tipo,
      email: email.replace(/(.{3}).*(@.*)/, "$1***$2"), // Ofuscar email
      duracion_ms: duracion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error({
      evento: "email_error",
      tipo,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
```

## Recursos Adicionales

- [Documentación de Resend](https://resend.com/docs)
- [Templates README](./templates/README.md)
- [Testing de Templates](./test-templates.js)
