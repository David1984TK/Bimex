# Auditoría de Esquema de Eventos: Contrato Soroban ↔ Indexer Node.js

## 1. Resumen Ejecutivo

Esta auditoría resuelve las discrepancias entre los eventos emitidos por el contrato Soroban (`bimex/contracts/bimex/src/lib.rs`) y la lógica de filtrado y procesamiento del indexer (`bimex-indexer/processor.js` y `bimex-indexer/eventParser.js`).

### Hallazgos Principales:
1. **Desfase Crítico en Contribuciones (`aportar` vs `contribuir`):**
   El contrato emite `symbol_short!("aportar")` en la función `contribuir()` (línea 341), mientras que el indexer filtraba y esperaba el topic `contribuir`. Por ello, en un entorno de red real (Testnet/Mainnet), ninguna aportación era capturada ni almacenada en la base de datos por el indexer.
2. **Eventos Administrativos Faltantes (`adm_chg` y `prop_upg`):**
   Las funciones `admin_cambiar_admin` emite `adm_chg` y `admin_upgrade` emite `prop_upg`. Ninguno de estos dos eventos era escuchado por el indexer ni transformado a registros de `audit_log`, rompiendo la trazabilidad y auditabilidad de seguridad de la plataforma.
3. **Filtros RPC Inválidos vs Restricciones de Soroban RPC:**
   Soroban RPC rechaza filtros con más de 4 segmentos o más de 4 matchers por segmento (`topic cannot have more than 4 segments`), y requiere topics codificados en base64 XDR junto con el comodín `*` para segmentos variables (como la dirección del actor o backer).
4. **Formato Real de Eventos de `getEvents`:**
   En producción, Soroban RPC y `@stellar/stellar-sdk` entregan objetos con propiedades `contractId` (tipo `Address`/`Contract`), `topic` (array de `xdr.ScVal`), `value` (objeto `xdr.ScVal` o `{ xdr: string }`), `txHash` y `ledgerClosedAt`. Los mocks anteriores asumían texto plano sin decodificar XDR.

---

## 2. Matriz de Eventos del Contrato Soroban (10 Símbolos)

| # | Símbolo Soroban | Función Contrato Emisora | Topics (`topics` en Contrato) | Data / Value (`value` en Contrato) | Tipo Evento (`TOPIC_TO_EVENT`) | Tabla(s) Destino | Auditoría / Acción |
|---|-----------------|--------------------------|-------------------------------|-------------------------------------|---------------------------------|-------------------|---------------------|
| 1 | `aportar` | `contribuir()` | `[symbol_short!("aportar"), backer]` | `(id_proyecto, cantidad, ahora)` | `nueva_aportacion` | `eventos`, `aportaciones` | Registro de contribución y actualización de total recaudado |
| 2 | `yield` | `reclamar_yield()` | `[symbol_short!("yield"), dueno]` | `(id_proyecto, yield_monto, ahora)` | `yield_reclamado` | `eventos`, `proyectos` | Incremento de `yield_entregado` en el proyecto |
| 3 | `retiro` | `retirar_principal()` / `retiro_anticipado()` | `[symbol_short!("retiro"), backer]` | `(id_proyecto, monto, ahora)` | `retiro_principal` | `eventos`, `aportaciones` | Marca `retirado = true` en la aportación del backer |
| 4 | `aprobar` | `admin_aprobar()` | `[symbol_short!("aprobar"), admin]` | `(id_proyecto, ahora)` | `cambio_estado` | `eventos`, `proyectos`, `audit_log` | Proyecto pasa a `EtapaInicial`; registro en `audit_log` |
| 5 | `rechazar` | `admin_rechazar()` | `[symbol_short!("rechazar"), admin]` | `(id_proyecto, motivo, ahora)` | `cambio_estado` | `eventos`, `proyectos`, `audit_log` | Proyecto pasa a `Rechazado`; registro en `audit_log` con motivo |
| 6 | `adm_chg` | `admin_cambiar_admin()` | `[symbol_short!("adm_chg"), admin_actual, nuevo_admin]` | `nuevo_admin` | `admin_action` | `eventos`, `audit_log` | Registro en `audit_log` de transferencia de administración |
| 7 | `pausar` | `admin_pausar()` | `[symbol_short!("pausar"), admin]` | `ahora` | `admin_action` | `eventos`, `audit_log` | Pausa de emergencia registrada en `audit_log` |
| 8 | `reanudar` | `admin_reanudar()` | `[symbol_short!("reanudar"), admin]` | `ahora` | `admin_action` | `eventos`, `audit_log` | Reanudación de contrato registrada en `audit_log` |
| 9 | `prop_upg` | `admin_upgrade()` | `[symbol_short!("prop_upg"), admin]` | `(new_wasm_hash, timestamp)` | `admin_action` | `eventos`, `audit_log` | Apertura de timelock de actualización WASM en `audit_log` |
| 10 | `upgrade` | `admin_execute_upgrade()` | `[symbol_short!("upgrade"), admin]` | `(new_wasm_hash, ahora)` | `admin_action` | `eventos`, `audit_log` | Ejecución de actualización WASM registrada en `audit_log` |

*Nota de compatibilidad:* Se mantiene `contribuir` en `TOPIC_TO_EVENT` y filtros como fallback retrocompatible para entornos heredados y pruebas unitarias sintéticas.

---

## 3. Especificación Técnica de Filtros Soroban RPC

Soroban RPC restringe los filtros de la siguiente manera:
1. Máximo 4 elementos por segmento de topic en un filtro.
2. Cada segmento es un array de cadenas XDR codificadas en Base64 o el comodín `'*'`.

La función `buildEventFilters(contractId)` divide los 10 símbolos (+ 1 fallback) en bloques de 4 elementos para el segmento 0, con comodín `['*']` en el segmento 1:

```javascript
// bimex-indexer/processor.js
export function buildEventFilters(contractId) {
  const symbols = [...CONTRACT_EVENT_SYMBOLS, 'contribuir'];
  const s = sym => xdr.ScVal.scvSymbol(sym).toXDR('base64');

  const chunks = [];
  for (let i = 0; i < symbols.length; i += 4) {
    chunks.push(symbols.slice(i, i + 4).map(s));
  }

  return chunks.map(chunk => ({
    type: 'contract',
    contractIds: [contractId],
    topics: [chunk, ['*']],
  }));
}
```

---

## 4. Normalización Robusta de Argumentos y Decodificación XDR

`eventParser.js` implementa `normalizeArg` y `normalizeArgs`, garantizando compatibilidad dual:
- Decodifica instancias nativas `xdr.ScVal` mediante `scValToNative(val)`.
- Si el argumento es un string Base64 XDR, lo deserializa con `xdr.ScVal.fromXDR(val, 'base64')` antes de convertirlo a tipo JS nativo.
- Si es un valor plano (como en tests con strings o números planos), lo preserva intacto sin arrojar errores.
- Soporta identificadores de contrato `Address`, `Contract`, o strings directos.
- Soporta timestamps en formato ISO `ledgerClosedAt` y fechas UNIX en segundos.

---

## 5. Prevención de Desfase (Anti-Drift Guard)

Se implementó una prueba automatizada en `tests/eventAudit.test.js` que inspecciona la definición de eventos del contrato en `bimex/contracts/bimex/src/lib.rs` y verifica estáticamente que todo símbolo emitido por `env.events().publish(...)` cuente con:
1. Entrada en `TOPIC_TO_EVENT`.
2. Filtro correspondiente en `CONTRACT_EVENT_SYMBOLS`.
3. Manejador de transformación específico para su payload en `eventParser.js`.
