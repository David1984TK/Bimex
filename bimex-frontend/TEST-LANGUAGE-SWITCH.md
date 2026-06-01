# Manual Test: Language Switching for Dates and Numbers

## Objetivo
Verificar que las fechas y números cambian de formato cuando el usuario cambia el idioma de español a inglés.

## Pasos para Probar

### 1. Iniciar la aplicación
```bash
npm run dev
```

### 2. Probar en DetalleProyecto
1. Navegar a cualquier proyecto con fecha de vencimiento
2. **En Español:**
   - Verificar fecha: `24 may 2026` (formato corto español)
   - Verificar números en calculadora: `$1,234 MXN`
3. Cambiar idioma a inglés (botón en la interfaz)
4. **En Inglés:**
   - Verificar fecha: `May 24, 2026` (formato inglés)
   - Verificar números en calculadora: `$1,234 MXN`

### 3. Probar en ListaProyectos
1. Ver la lista de proyectos
2. **En Español:**
   - Stats strip: `1,234.56 MXNe`
3. Cambiar a inglés
4. **En Inglés:**
   - Stats strip: `1,234.56 MXNe`

### 4. Probar en MiCuenta
1. Ir a "Mi Cuenta"
2. **En Español:**
   - Total invertido: `1,234.56 MXNe`
   - Rendimiento: `123.45 MXNe`
3. Cambiar a inglés
4. **En Inglés:**
   - Total invertido: `1,234.56 MXNe`
   - Rendimiento: `123.45 MXNe`

### 5. Probar en CrearProyecto
1. Abrir modal de crear proyecto
2. Ingresar meta: `10000`
3. **En Español:**
   - Ver meta formateada: `10,000`
   - Yield estimado: `500`
4. Cambiar a inglés
5. **En Inglés:**
   - Ver meta formateada: `10,000`
   - Yield estimado: `500`

### 6. Probar en Recompensas
1. Abrir panel de recompensas
2. **En Español:**
   - Total invertido: `1,234.56 MXNe`
   - Progreso: `1,235 / 10,000 MXNe`
3. Cambiar a inglés
4. **En Inglés:**
   - Total invertido: `1,234.56 MXNe`
   - Progreso: `1,235 / 10,000 MXNe`

## Resultados Esperados

### Fechas
- **Español:** `24 may 2026`, `15 jun 2025`
- **Inglés:** `May 24, 2026`, `Jun 15, 2025`

### Números
- Ambos idiomas usan el mismo formato numérico (separador de miles: coma, separador decimal: punto)
- Ejemplo: `1,234.56`

### Comportamiento
- ✅ El cambio debe ser **inmediato** al cambiar el idioma
- ✅ No debe requerir recargar la página
- ✅ Todos los componentes deben actualizarse simultáneamente

## Verificación Técnica

### Consola del navegador
```javascript
// Verificar el locale actual
console.log(i18n.language); // 'es' o 'en'

// Probar formateo manual
import { formatearFecha, formatearMXNe } from './src/utils/formato.js';
console.log(formatearFecha(1716940800)); // Debe cambiar con el idioma
console.log(formatearMXNe(12345670000)); // "1,234.57"
```

## Casos Edge

### 1. Números muy grandes
- Probar con: `1000000000` (mil millones)
- Debe formatear: `1,000,000,000`

### 2. Números muy pequeños
- Probar con: `0.01`
- Debe formatear: `0.01`

### 3. Fechas futuras
- Probar con timestamps futuros
- Debe formatear correctamente en ambos idiomas

### 4. Cambio rápido de idioma
- Cambiar español → inglés → español rápidamente
- No debe haber errores ni formatos incorrectos

## Checklist de Aceptación

- [ ] Fechas cambian de formato al cambiar idioma
- [ ] Números mantienen formato consistente
- [ ] No hay errores en consola
- [ ] Cambio es inmediato (sin recargar)
- [ ] Todos los componentes se actualizan
- [ ] No quedan formatos hardcodeados en español
- [ ] Tests pasan correctamente

## Notas

- Los números usan el mismo formato en español e inglés (estándar internacional)
- Las fechas SÍ cambian: mes abreviado en español vs inglés
- El formato de MXNe siempre incluye 2 decimales
