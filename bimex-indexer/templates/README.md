# Templates de Email - Bimex

Este directorio contiene los templates de email para las notificaciones de Bimex.

## Estructura

### Templates HTML Profesionales (Nuevos)

Ubicados en archivos `.html` individuales con diseño responsive y branding completo:

- **bienvenida.html** - Email de bienvenida para nuevos usuarios
- **contribucion.html** - Notificación de nueva contribución recibida
- **aprobacion.html** - Notificación de proyecto aprobado
- **yield-disponible.html** - Notificación de yield disponible para reclamar

### Templates Legacy (Existentes)

Ubicados en `emails.js` con diseño simple:

- `tmplAprobado` - Proyecto aprobado (versión simple)
- `tmplRechazado` - Proyecto rechazado
- `tmplFinanciado` - Meta de financiamiento alcanzada
- `tmplYield` - Yield disponible (versión simple)
- `tmplRetiro` - Retiro de principal

## Características de los Templates HTML

### Diseño

- **Responsive**: Funciona en desktop y móvil
- **Compatible**: Probado para Gmail, Outlook, Apple Mail
- **Inline CSS**: Todo el CSS está inline para máxima compatibilidad
- **Branding**: Usa la paleta de colores de Bimex (navy, green, amber)

### Colores Principales

```css
Navy:   #1E3A5F (primary brand color)
Green:  #16A34A (success, yield)
Amber:  #D97706 (warnings, highlights)
Gray:   #6B7280 (text secondary)
```

### Variables Soportadas

Todos los templates soportan estas variables mediante sintaxis `{{variable}}`:

- `{{nombreProyecto}}` - Nombre del proyecto
- `{{monto}}` - Monto en MXNe
- `{{proyectoUrl}}` - URL completa al proyecto
- `{{progreso}}` - Porcentaje de progreso (0-100)
- `{{tasaCetes}}` - Tasa de CETES (default: 10.5)
- `{{baseUrl}}` - URL base de Bimex (default: https://bimex.fi)
- `{{unsubscribeUrl}}` - URL para desuscribirse

## Uso

### Desde notifications.js

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

// Proyecto aprobado (versión HTML)
await enviarNotificacion("proyecto_aprobado_html", "creador@example.com", {
  nombreProyecto: "Mi Proyecto",
  idProyecto: "123",
});

// Yield disponible (versión HTML)
await enviarNotificacion("yield_disponible_html", "usuario@example.com", {
  nombreProyecto: "Mi Proyecto",
  monto: "250",
  tasaCetes: "11.2",
  idProyecto: "123",
});
```

### Directamente desde htmlTemplates.js

```javascript
import { tmplBienvenida, tmplContribucion } from "./templates/htmlTemplates.js";

const html = tmplBienvenida({
  nombreProyecto: "Mi Proyecto",
  monto: "5000",
  proyectoUrl: "https://bimex.fi/?proyecto=123",
});
```

## Testing

Para probar los templates localmente:

1. Abre los archivos `.html` en un navegador
2. Usa servicios como [Litmus](https://litmus.com/) o [Email on Acid](https://www.emailonacid.com/) para testing profesional
3. Envía emails de prueba a diferentes clientes (Gmail, Outlook, etc.)

## Footer de Emails

Todos los templates incluyen un footer con:

- Link a Términos de Servicio
- Link a Política de Privacidad
- Link de Desuscripción (apunta a `/mi-cuenta` por defecto)

## Mantenimiento

### Agregar un Nuevo Template

1. Crea un archivo `.html` en este directorio
2. Usa la estructura de los templates existentes como base
3. Agrega una función en `htmlTemplates.js`:

```javascript
export function tmplNuevoTemplate(data) {
  return loadTemplate("nuevo-template", data);
}
```

4. Exporta la función en `index.js`
5. Agrega el template a `TEMPLATES` en `notifications.js`

### Actualizar Colores

Los colores están definidos inline en cada template. Para cambiar el branding:

1. Busca y reemplaza los valores hexadecimales
2. Mantén consistencia con `bimex-frontend/src/index.css`

## Compatibilidad

✅ Gmail (web, iOS, Android)
✅ Outlook (2016+, web, iOS, Android)
✅ Apple Mail (macOS, iOS)
✅ Yahoo Mail
✅ ProtonMail
✅ Thunderbird

⚠️ Limitaciones conocidas:
- Outlook 2007-2013 tiene soporte limitado de CSS
- Algunos clientes no soportan web fonts (se usa fallback a system fonts)
