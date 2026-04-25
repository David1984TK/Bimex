# Script de Prueba End-to-End — Mainnet

**Fecha de ejecución:** [Pendiente]  
**Ejecutado por:** [Nombre]  
**Ambiente:** Mainnet (https://bimex-frontend.vercel.app)

---

## Preparación

### Wallets Requeridas

- **Wallet 1 (Dueño del proyecto):**
  - Dirección: `[Agregar]`
  - Balance MXNe: `[Agregar]`

- **Wallet 2 (Admin):**
  - Dirección: `[Agregar]`
  - Balance MXNe: `[Agregar]`

- **Wallet 3 (Contribuidor):**
  - Dirección: `[Agregar]`
  - Balance MXNe inicial: `[Agregar]`

### Información del Contrato

- Dirección del contrato Bimex: `[Agregar]`
- Red: Stellar Mainnet
- Tasa CETES configurada: `[Agregar]`

---

## Paso 1: CREAR PROYECTO

### Acciones
1. Conectar Wallet 1 (dueño del proyecto) en https://bimex-frontend.vercel.app
2. Navegar a "Crear Proyecto"
3. Llenar formulario:
   - **Nombre:** "Proyecto de Prueba E2E Mainnet"
   - **Descripción:** "Proyecto de prueba para validar flujo completo en producción"
   - **Meta:** 100 MXNe
   - **Duración:** 30 días
4. Subir documentos:
   - INE (o documento de identidad)
   - Plan del proyecto
   - Presupuesto
5. Verificar que el hash SHA-256 se calcula correctamente
6. Enviar transacción de creación
7. Confirmar en Freighter

### Resultados Esperados
- ✅ Transacción confirmada en blockchain
- ✅ Estado del proyecto: `EnRevision`
- ✅ Hash de documentos calculado correctamente

### Evidencia
- **Hash de transacción:** `[Agregar]`
- **Link Stellar Expert:** `[Agregar]`
- **Captura de pantalla:** `[Adjuntar]`
- **ID del proyecto:** `[Agregar]`

### Notas
```
[Agregar observaciones]
```

---

## Paso 2: APROBAR PROYECTO (como admin)

### Acciones
1. Desconectar Wallet 1
2. Conectar Wallet 2 (admin)
3. Navegar a "Panel Admin"
4. Localizar el proyecto creado en Paso 1
5. Revisar documentos y detalles
6. Hacer clic en "Aprobar Proyecto"
7. Confirmar transacción en Freighter

### Resultados Esperados
- ✅ Transacción confirmada
- ✅ Estado del proyecto: `EtapaInicial`
- ✅ Proyecto visible en lista pública

### Evidencia
- **Hash de transacción:** `[Agregar]`
- **Link Stellar Expert:** `[Agregar]`
- **Captura de pantalla:** `[Adjuntar]`

### Notas
```
[Agregar observaciones]
```

---

## Paso 3: CONTRIBUIR

### Acciones
1. Desconectar Wallet 2
2. Conectar Wallet 3 (contribuidor)
3. Navegar a "Proyectos" y seleccionar el proyecto aprobado
4. Hacer clic en "Contribuir"
5. Ingresar cantidad: **10 MXNe**
6. Confirmar transacción en Freighter
7. Verificar que el capital se registra en el contrato

### Resultados Esperados
- ✅ Transacción confirmada
- ✅ Balance del contribuidor reducido en 10 MXNe
- ✅ Capital registrado en el proyecto
- ✅ Estado del proyecto: `EtapaInicial` o `EnProgreso` (si se alcanza meta)

### Evidencia
- **Hash de transacción:** `[Agregar]`
- **Link Stellar Expert:** `[Agregar]`
- **Balance antes:** `[Agregar]` MXNe
- **Balance después:** `[Agregar]` MXNe
- **Captura de pantalla:** `[Adjuntar]`

### Notas
```
[Agregar observaciones]
```

---

## Paso 4: VERIFICAR YIELD

### Acciones
1. Esperar **5 minutos** (para que se acumule yield)
2. Refrescar la página del proyecto
3. Verificar sección "Yield Acumulado"
4. Llamar a `calcular_yield_detallado` desde DetalleProyecto.jsx
5. Verificar que el yield se calcula con tasas reales (no demo)

### Cálculo Esperado
```
Capital: 10 MXNe
Tasa anual: 9.45%
Tiempo: 5 minutos = 0.0000095 años
Yield esperado: 10 × 0.0945 × 0.0000095 ≈ 0.0009 MXNe
```

### Resultados Esperados
- ✅ Yield visible en UI
- ✅ Yield calculado ≈ 0.0009 MXNe (±10% tolerancia)
- ✅ Tasas reales aplicadas (no tasas demo)

### Evidencia
- **Yield mostrado:** `[Agregar]` MXNe
- **Tiempo transcurrido:** `[Agregar]` minutos
- **Tasa aplicada:** `[Agregar]`%
- **Captura de pantalla:** `[Adjuntar]`

### Notas
```
[Agregar observaciones]
```

---

## Paso 5: RETIRAR PRINCIPAL

### Acciones
1. Con Wallet 3 (contribuidor) conectada
2. En la página del proyecto, hacer clic en "Retirar Principal"
3. Confirmar transacción en Freighter
4. Verificar balance de la wallet después del retiro
5. Verificar transacción en Stellar Explorer

### Resultados Esperados
- ✅ Transacción confirmada
- ✅ Contribuidor recibe exactamente 10 MXNe (lo que aportó)
- ✅ Balance restaurado (menos fees de red)
- ✅ Capital del proyecto reducido

### Evidencia
- **Hash de transacción:** `[Agregar]`
- **Link Stellar Expert:** `[Agregar]`
- **Balance antes del retiro:** `[Agregar]` MXNe
- **Balance después del retiro:** `[Agregar]` MXNe
- **Cantidad retirada:** `[Agregar]` MXNe
- **Captura de pantalla:** `[Adjuntar]`

### Verificación de Zero-Loss
```
Capital aportado: 10 MXNe
Capital retirado: [Agregar] MXNe
Diferencia: [Agregar] MXNe (debe ser 0)
```

### Notas
```
[Agregar observaciones]
```

---

## Paso 6: RECLAMAR YIELD (solo cuando estado = Liberado)

### Acciones
1. Desconectar Wallet 3
2. Conectar Wallet 1 (dueño del proyecto)
3. Esperar a que el proyecto alcance estado `Liberado`
   - Esto ocurre cuando se alcanza la meta o termina el plazo
4. En la página del proyecto, hacer clic en "Reclamar Yield"
5. Confirmar transacción en Freighter
6. Verificar que el yield llega a la wallet del dueño

### Resultados Esperados
- ✅ Transacción confirmada
- ✅ Yield transferido a wallet del dueño del proyecto
- ✅ Balance del proyecto en yield = 0

### Evidencia
- **Hash de transacción:** `[Agregar]`
- **Link Stellar Expert:** `[Agregar]`
- **Yield reclamado:** `[Agregar]` MXNe
- **Balance antes:** `[Agregar]` MXNe
- **Balance después:** `[Agregar]` MXNe
- **Captura de pantalla:** `[Adjuntar]`

### Notas
```
[Agregar observaciones]
```

---

## Resumen de Resultados

### Transacciones Totales
| Paso | Acción | Hash | Estado |
|------|--------|------|--------|
| 1 | Crear proyecto | `[Hash]` | ✅/❌ |
| 2 | Aprobar proyecto | `[Hash]` | ✅/❌ |
| 3 | Contribuir | `[Hash]` | ✅/❌ |
| 4 | Verificar yield | N/A | ✅/❌ |
| 5 | Retirar principal | `[Hash]` | ✅/❌ |
| 6 | Reclamar yield | `[Hash]` | ✅/❌ |

### Verificación de Zero-Loss
```
Capital inicial del contribuidor: [X] MXNe
Capital después de contribuir: [Y] MXNe
Capital después de retirar: [Z] MXNe

Pérdida/Ganancia: [Z - X] MXNe (debe ser ≈0, solo fees de red)
```

### Yield Generado
```
Yield total acumulado: [X] MXNe
Yield reclamado por proyecto: [Y] MXNe
Diferencia: [X - Y] MXNe (debe ser ≈0)
```

---

## Problemas Encontrados

### Problema 1
- **Descripción:** `[Agregar]`
- **Paso afectado:** `[Agregar]`
- **Severidad:** Alta / Media / Baja
- **Solución:** `[Agregar]`

### Problema 2
- **Descripción:** `[Agregar]`
- **Paso afectado:** `[Agregar]`
- **Severidad:** Alta / Media / Baja
- **Solución:** `[Agregar]`

---

## Conclusión

**Estado general de la prueba:** ✅ Exitosa / ❌ Fallida / ⚠️ Con observaciones

**Comentarios finales:**
```
[Agregar conclusiones y recomendaciones]
```

**Aprobado para producción:** Sí / No

**Firma:**
- Nombre: `[Agregar]`
- Fecha: `[Agregar]`
