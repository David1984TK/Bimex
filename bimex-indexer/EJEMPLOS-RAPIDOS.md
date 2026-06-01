# Ejemplos Rápidos - Notificaciones Email

Ejemplos copy-paste para empezar a usar las notificaciones rápidamente.

## Setup Inicial

```bash
# 1. Instalar dependencias (si no están)
npm install resend

# 2. Configurar .env
echo 'RESEND_API_KEY=re_tu_api_key_aqui' >> .env
echo 'RESEND_FROM="Bimex <notificaciones@bimex.fi>"' >> .env
echo 'FRONTEND_URL=https://bimex.fi' >> .env
```

## Ejemplo 1: Email de Bienvenida

```javascript
import { enviarNotificacion } from "./notifications.js";

// Enviar cuando un usuario hace su primera contribución
await enviarNotificacion("bienvenida", "usuario@example.com", {
  nombreProyecto: "Cafetería Sustentable CDMX",
  monto: "5000",
  idProyecto: "abc123",
});
```

## Ejemplo 2: Nueva Contribución (Para Creador)

```javascript
// Notificar al creador cuando recibe una contribución
await enviarNotificacion("nueva_contribucion", "creador@example.com", {
  nombreProyecto: "Cafetería Sustentable CDMX",
  monto: "1000",
  progreso: "45", // Porcentaje (0-100)
  idProyecto: "abc123",
});
```

## Ejemplo 3: Proyecto Aprobado

```javascript
// Notificar cuando admin aprueba un proyecto
await enviarNotificacion("proyecto_aprobado_html", "creador@example.com", {
  nombreProyecto: "Cafetería Sustentable CDMX",
  idProyecto: "abc123",
});
```

## Ejemplo 4: Yield Disponible

```javascript
// Notificar cuando hay yield para reclamar
await enviarNotificacion("yield_disponible_html", "usuario@example.com", {
  nombreProyecto: "Cafetería Sustentable CDMX",
  monto: "250.50",
  tasaCetes: "11.2", // Opcional, default: 10.5
  idProyecto: "abc123",
});
```

## Ejemplo 5: Envío con Manejo de Errores

```javascript
async function enviarEmailSeguro(tipo, email, data) {
  try {
    await enviarNotificacion(tipo, email, data);
    console.log(`✅ Email ${tipo} enviado a ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error enviando email:`, error);
    return { success: false, error: error.message };
  }
}

// Uso
const resultado = await enviarEmailSeguro("bienvenida", "test@example.com", {
  nombreProyecto: "Test",
  monto: "1000",
  idProyecto: "test-123",
});
```

## Ejemplo 6: Envío en Lote

```javascript
import pLimit from "p-limit";

// Limitar a 10 emails concurrentes
const limit = pLimit(10);

async function enviarNotificacionesEnLote(notificaciones) {
  const promises = notificaciones.map(({ tipo, email, data }) =>
    limit(async () => {
      try {
        await enviarNotificacion(tipo, email, data);
        return { email, success: true };
      } catch (error) {
        return { email, success: false, error: error.message };
      }
    })
  );
  
  const resultados = await Promise.all(promises);
  
  const exitosos = resultados.filter(r => r.success).length;
  const fallidos = resultados.filter(r => !r.success).length;
  
  console.log(`✅ ${exitosos} emails enviados, ❌ ${fallidos} fallidos`);
  return resultados;
}

// Uso
const notificaciones = [
  {
    tipo: "bienvenida",
    email: "user1@example.com",
    data: { nombreProyecto: "Proyecto 1", monto: "1000", idProyecto: "1" },
  },
  {
    tipo: "nueva_contribucion",
    email: "creator@example.com",
    data: { nombreProyecto: "Proyecto 1", monto: "500", progreso: "30", idProyecto: "1" },
  },
];

await enviarNotificacionesEnLote(notificaciones);
```

## Ejemplo 7: Testing Local (Sin Enviar)

```javascript
// Generar HTML sin enviar
import { tmplBienvenida } from "./templates/htmlTemplates.js";
import { writeFileSync } from "fs";

const html = tmplBienvenida({
  nombreProyecto: "Test Project",
  monto: "1000",
  proyectoUrl: "https://bimex.fi/?proyecto=test",
});

// Guardar para visualizar en navegador
writeFileSync("test-email.html", html);
console.log("✅ HTML generado en test-email.html");
```

## Ejemplo 8: Integración con Supabase

```javascript
import { createClient } from "@supabase/supabase-js";
import { enviarNotificacion } from "./notifications.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function notificarNuevaContribucion(proyectoId, contribuidorAddress, monto) {
  // Obtener datos del proyecto
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("nombre, creador, meta, total_recaudado")
    .eq("id", proyectoId)
    .single();
  
  // Obtener email del creador
  const { data: creador } = await supabase
    .from("usuarios")
    .select("email, notificaciones_activas")
    .eq("wallet_address", proyecto.creador)
    .single();
  
  // Solo enviar si tiene email y notificaciones activas
  if (!creador?.email || !creador.notificaciones_activas) {
    console.log("⏭️ Usuario sin email o notificaciones desactivadas");
    return;
  }
  
  // Calcular progreso
  const progreso = Math.round((proyecto.total_recaudado / proyecto.meta) * 100);
  
  // Enviar notificación
  await enviarNotificacion("nueva_contribucion", creador.email, {
    nombreProyecto: proyecto.nombre,
    monto: monto.toString(),
    progreso: progreso.toString(),
    idProyecto: proyectoId,
  });
  
  // Registrar notificación enviada
  await supabase.from("notificaciones_enviadas").insert({
    proyecto_id: proyectoId,
    tipo: "nueva_contribucion",
    email: creador.email,
  });
}
```

## Ejemplo 9: Verificar Primera Contribución

```javascript
async function verificarYEnviarBienvenida(contribuidorAddress, proyectoId, monto) {
  // Contar contribuciones del usuario
  const { count } = await supabase
    .from("aportaciones")
    .select("*", { count: "exact", head: true })
    .eq("contribuidor", contribuidorAddress);
  
  // Si es su primera contribución
  if (count === 1) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("email, notificaciones_activas")
      .eq("wallet_address", contribuidorAddress)
      .single();
    
    if (usuario?.email && usuario.notificaciones_activas) {
      const { data: proyecto } = await supabase
        .from("proyectos")
        .select("nombre")
        .eq("id", proyectoId)
        .single();
      
      await enviarNotificacion("bienvenida", usuario.email, {
        nombreProyecto: proyecto.nombre,
        monto: monto.toString(),
        idProyecto: proyectoId,
      });
      
      console.log(`🎉 Email de bienvenida enviado a ${usuario.email}`);
    }
  }
}
```

## Ejemplo 10: Cron Job para Yield

```javascript
// Ejecutar cada 24 horas para notificar yield disponible
import cron from "node-cron";

cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Verificando yield disponible...");
  
  const UMBRAL_YIELD = 100; // MXNe
  
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, nombre, creador, yield_acumulado")
    .eq("estado", "financiado")
    .gte("yield_acumulado", UMBRAL_YIELD);
  
  for (const proyecto of proyectos) {
    // Verificar si ya se notificó en los últimos 7 días
    const { data: ultimaNotif } = await supabase
      .from("notificaciones_enviadas")
      .select("created_at")
      .eq("proyecto_id", proyecto.id)
      .eq("tipo", "yield_disponible")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (ultimaNotif) {
      const diasDesdeUltima = 
        (Date.now() - new Date(ultimaNotif.created_at)) / (1000 * 60 * 60 * 24);
      
      if (diasDesdeUltima < 7) continue;
    }
    
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
        idProyecto: proyecto.id,
      });
      
      await supabase.from("notificaciones_enviadas").insert({
        proyecto_id: proyecto.id,
        tipo: "yield_disponible",
        email: creador.email,
      });
      
      console.log(`💰 Notificación de yield enviada para ${proyecto.nombre}`);
    }
  }
});
```

## Testing Rápido

```bash
# Generar templates HTML para visualizar
node test-templates.js

# Abrir en navegador
open test-output/bienvenida.html
open test-output/contribucion.html
open test-output/aprobacion.html
open test-output/yield-disponible.html
```

## Variables de Entorno Requeridas

```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM="Bimex <notificaciones@bimex.fi>"
FRONTEND_URL=https://bimex.fi
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
```

## Troubleshooting

### Error: "Resend error: Invalid API key"
```bash
# Verificar que la API key esté configurada
echo $RESEND_API_KEY
# Obtener nueva key en https://resend.com/api-keys
```

### Error: "Template not found"
```bash
# Verificar que los archivos HTML existan
ls bimex-indexer/templates/*.html
```

### Email no llega
1. Verificar spam folder
2. Verificar dominio verificado en Resend
3. Revisar logs de Resend dashboard
4. Verificar que el email sea válido

## Recursos

- 📄 [Documentación completa](./templates/README.md)
- 🔗 [Guía de integración](./INTEGRACION-NOTIFICACIONES.md)
- ✅ [Checklist de validación](./CHECKLIST-TEMPLATES.md)
- 🌐 [Resend Docs](https://resend.com/docs)
