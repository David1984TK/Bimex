# Notificaciones por hitos de fondeo

Estado respecto al issue #350: **antes no se notificaban** los hitos de fondeo
(30/50/75/100%). Existía la plantilla de email `meta_alcanzada` en
`notifications.js` y la tabla `project_events`, pero ninguna se disparaba desde
el indexer. Este cambio agrega la detección y la notificación.

## Qué hace ahora

Al procesar un evento `contribuir` (una aportación), `processor.js`:

1. Lee el proyecto y su total recaudado (`obtenerProyecto`), ya con la
   aportación recién persistida.
2. Calcula los hitos cruzados entre `total_antes` y `total_despues`
   (`milestones.js::hitosCruzados`).
3. Por cada hito cruzado:
   - emite un evento **SSE** `hito_fondeo` con
     `{ proyectoId, hito, porcentaje, totalAportado, meta }` (notificación
     in-app para los clientes conectados), y
   - encola una fila en **`project_events`** para el pipeline de email (Resend):
     `event_type = 'hito_fondeo'` y `'meta_alcanzada'` cuando el hito es 100.

## Reglas de detección

- Un hito cuenta cuando `pctAntes < hito <= pctDespues`; es decir, se notifica
  exactamente al cruzar el umbral y **no** se repite en aportes posteriores.
- Un salto grande (p.ej. 20% → 80%) notifica todos los hitos intermedios.
- Aportes que no cruzan ningún umbral no notifican nada.
- Si `meta <= 0` o `obtenerProyecto` no está inyectado, no se notifica (y el
  procesamiento continúa sin romperse).

## Requisitos de despliegue

Para la parte de email, la tabla `project_events` debe existir:
ejecutar `supabase/migration_notifications.sql` (idempotente). El worker de email
marca `notified_at` al enviar.

## Reproducir / probar

```bash
cd bimex-indexer
npm test            # incluye tests/milestones.test.js y los tests de hitos en processor.test.js
```

## Configuración

No requiere variables de entorno nuevas. Los límites viven en
`milestones.js` (`HITOS_FONDEO = [30, 50, 75, 100]`).
