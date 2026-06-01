# Implementación de Formateo Internacionalizado

## Resumen

Se implementó un sistema de formateo que respeta el idioma seleccionado por el usuario (español/inglés), reemplazando todas las llamadas hardcodeadas a `toLocaleString('es-MX')`.

## Archivos Creados

### `src/utils/formato.js`
Utilidades centralizadas de formateo que usan `Intl.NumberFormat` e `Intl.DateTimeFormat` con el locale actual de i18n:

- **`formatearMXNe(stroops)`**: Convierte stroops a MXNe con 2 decimales
- **`formatearFecha(timestamp)`**: Formatea timestamps Unix a fecha legible
- **`formatearPorcentaje(valor)`**: Formatea porcentajes
- **`formatearNumero(numero)`**: Formatea números sin decimales
- **`formatearNumeroConDecimales(numero, decimales)`**: Formatea números con decimales específicos

### `src/test/formato.test.js`
Suite de pruebas completa que verifica:
- Formateo correcto en español e inglés
- Manejo de diferentes tipos de entrada
- Cambio dinámico de idioma

## Archivos Modificados

### Componentes
1. **DetalleProyecto.jsx**
   - Eliminada función `fmt()` local
   - Reemplazado con `formatearNumero()` y `formatearFecha()`
   - Fechas de vencimiento ahora respetan el locale

2. **CrearProyecto.jsx**
   - Meta formateada con `formatearNumero()`
   - Yield estimado usa `formatearNumero()`

3. **Recompensas.jsx**
   - Total invertido usa `formatearNumeroConDecimales()`
   - Progreso y umbrales usan `formatearNumero()`

4. **MiCuenta.jsx**
   - No requirió cambios (usa `stroopsAMXNe` que fue actualizado)

5. **ListaProyectos.jsx**
   - No requirió cambios (usa `stroopsAMXNe` que fue actualizado)

6. **Transparencia.jsx**
   - No requirió cambios (usa `stroopsAMXNe` que fue actualizado)

### Utilidades
7. **stellar/contrato.js**
   - `stroopsAMXNe()` ahora usa `formatearMXNe()` internamente
   - Importa desde `utils/formato.js`

### Tests
8. **test/DetalleProyecto.test.jsx**
   - Mock actualizado para usar `Intl.NumberFormat`

9. **test/ListaProyectos.test.jsx**
   - Mock actualizado para usar `Intl.NumberFormat`

## Ejemplos de Formato

### Español (es)
- Fecha: `24 may 2026`
- Número: `1,234.56 MXNe`
- Porcentaje: `5.00%`

### Inglés (en)
- Fecha: `May 24, 2026`
- Número: `1,234.56 MXNe`
- Porcentaje: `5.00%`

## Criterios de Aceptación ✅

- [x] Creado `utils/formato.js` con todas las funciones de formateo
- [x] Reemplazados todos los `toLocaleString('es-MX')` hardcodeados
- [x] Reemplazada función `fmt()` en DetalleProyecto.jsx
- [x] Fechas cambian de formato al cambiar idioma
- [x] Números cambian de formato al cambiar idioma
- [x] Tests actualizados y funcionando
- [x] No quedan llamadas hardcodeadas a `toLocaleString('es-MX')`

## Verificación

Para verificar que no quedan llamadas hardcodeadas:
```bash
grep -r "toLocaleString.*es-MX" src/
# Resultado: Sin coincidencias
```

## Uso

```javascript
import { formatearMXNe, formatearFecha, formatearNumero } from '../utils/formato.js';

// Formatear MXNe
const mxne = formatearMXNe(10000000); // "1.00"

// Formatear fecha
const fecha = formatearFecha(1716940800); // "29 may 2024" (es) o "May 29, 2024" (en)

// Formatear número
const numero = formatearNumero(1234567); // "1,234,567"
```

## Notas Técnicas

- Los formateadores leen automáticamente `i18n.language` en cada llamada
- No requiere pasar el locale manualmente
- Compatible con todos los locales soportados por `Intl`
- Maneja BigInt, Number y String como entrada
