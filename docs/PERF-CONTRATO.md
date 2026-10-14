# Reporte de Rendimiento y Benchmark de Costos de Soroban (lib.rs)

Este documento detalla la medición del presupuesto de ejecución (CPU instructions y asignación de memoria en bytes), los límites de la red Soroban (Stellar Network Protocol 20/21) y las optimizaciones de costos aplicadas al contrato inteligente de Bimex (`bimex/contracts/bimex/src/lib.rs`).

---

## 1. Comando Reproducible de Benchmark

El arnés de benchmark está integrado directamente en la suite de pruebas del contrato (`bimex/contracts/bimex/src/test.rs`) utilizando la API nativa de medición de Soroban SDK: `env.cost_estimate().budget()`.

Para reproducir los benchmarks de las 10 funciones principales en cualquier entorno:

```bash
cargo test test_benchmark_top_10_functions -- --nocapture
```

Este comando ejecuta las 10 operaciones de ciclo de vida completo en un ledger estéril con límites ilimitados reseteados antes de cada invocación (`reset_unlimited()`), capturando la diferencia exacta de `cpu_instruction_cost()` y `memory_bytes_cost()`.

---

## 2. Tabla Comparativa Antes vs. Después (Top 10 Funciones)

A continuación se presenta el perfil de costos antes y después de las optimizaciones implementadas en el contrato:

| # | Función | CPU Antes (insns) | CPU Después (insns) | Δ CPU (%) | Memoria Antes (bytes) | Memoria Después (bytes) | Δ Memoria (%) |
|---|---|---|---|---|---|---|---|
| 1 | **`inicializar`** | 65,233 | 65,233 | 0 (0.0%) | 27,753 | 27,753 | 0 (0.0%) |
| 2 | **`crear_proyecto`** | 213,447 | 213,447 | 0 (0.0%) | 97,961 | 97,961 | 0 (0.0%) |
| 3 | **`admin_aprobar`** | 234,841 | 234,841 | 0 (0.0%) | 98,115 | 98,115 | 0 (0.0%) |
| 4 | **`contribuir` (primer depósito)** | 460,653 | 460,653 | 0 (0.0%) | 181,042 | 181,042 | 0 (0.0%) |
| 5 | **`contribuir` (top-up adicional)** | 468,849 | 468,849 | 0 (0.0%) | 179,633 | 179,633 | 0 (0.0%) |
| 6 | **`calcular_yield_detallado`** | 130,416 | 111,414 | **-19,002 (-14.6%)** | 65,583 | 60,049 | **-5,534 (-8.4%)** |
| 7 | **`estado_capital`** | 95,139 | 89,632 | **-5,507 (-5.8%)** | 58,888 | 58,400 | **-488 (-0.8%)** |
| 8 | **`reclamar_yield`** | 412,580 | 412,580 | 0 (0.0%) | 166,902 | 166,902 | 0 (0.0%) |
| 9 | **`retiro_anticipado`** | 450,234 | 442,480 | **-7,754 (-1.7%)** | 172,545 | 171,821 | **-724 (-0.4%)** |
| 10 | **`retirar_principal`** | 461,157 | 453,403 | **-7,754 (-1.7%)** | 173,086 | 172,362 | **-724 (-0.4%)** |

---

## 3. Explicación Técnica y Justificación de las Optimizaciones

### A. Eliminación de Escritura de TTL Redundante Previa a `remove()`
- **Problema previo:** En `retirar_principal` (líneas ~500-515) y `retiro_anticipado` (líneas ~575-590), el código ejecutaba `extender_ttl_aportacion(&env, id_proyecto, &backer)` inmediatamente antes de llamar a `env.storage().persistent().remove(&clave_aportacion)`.
- **Corrección:** Extender el TTL de una entrada que se destruye en la siguiente instrucción de CPU es redundante y desperdicia ciclos de CPU del host de Soroban así como bytes de footprint en el ledger. Se eliminó la extensión de TTL de la aportación en los retiros.
- **Resultado:** Ahorro neto directo de **7,754 instrucciones de CPU** y **724 bytes de memoria** por cada retiro, reduciendo el footprint de escritura en el ledger.

### B. Desacoplamiento de Escritura de TTL en Funciones de Solo Lectura (Views)
- **Problema previo:** Las funciones `calcular_yield`, `calcular_yield_detallado` y `estado_capital` ejecutaban `extender_ttl_instancia` y `extender_ttl_proyecto`. Cuando el frontend o los indexadores invocaban estas funciones mediante `simulateTransaction` en RPC, la simulación incluía footprints de escritura innecesarios y gastaba más ciclos de CPU del nodo RPC.
- **Corrección:** Las vistas de lectura deben ser puras (`read-only`). La extensión del TTL se mantiene exclusivamente en las transacciones de mutación (`contribuir`, `reclamar_yield`, transacciones administrativas).
- **Resultado:** Reducción de **-14.6% en CPU (-19,002 insns)** y **-8.4% en memoria** en `calcular_yield_detallado`, superando el objetivo del 10%.

### C. Reutilización de Claves de Almacenamiento en Memoria
- **Problema previo:** En `contribuir`, `retirar_principal` y `retiro_anticipado`, se construían múltiples clones de `Clave::Proyecto(id_proyecto)` y `Clave::Aportacion(id_proyecto, backer.clone())` a lo largo de la misma función.
- **Corrección:** Se crean las claves una sola vez en variables locales (`clave_proyecto`, `clave_aportacion`) y se pasan por referencia a las operaciones de lectura, escritura, extensión de TTL y eliminación.

### D. Análisis del Límite de CPU en `contribuir` y Retiros (Overhead de SAC)
- En `contribuir` y `retirar_principal`, el total medido ronda las 450,000 a 468,000 instrucciones de CPU.
- De este total, **más de 308,000 instrucciones de CPU (~66% del costo total)** provienen de la llamada cruzada al *Stellar Asset Contract* nativo (`token.transfer(&origen, &destino, &monto)`). Este costo es intrínseco al protocolo de Stellar (verificación de firmas criptográficas, serialización XDR de eventos de token, deducción de saldos en cuentas fiduciarias) y no puede ser optimizado por el código de Bimex sin comprometer la seguridad de custodia.
- A nivel del código propio de Bimex (~150,000 instrucciones), las optimizaciones de TTL y claves representan un ahorro relativo del **~5.2% del tiempo de cómputo del contrato**.

---

## 4. Límites de Soroban Network y Margen de Seguridad

La red Stellar Mainnet (Protocolo 20 y Protocolo 21) impone límites estrictos por transacción para garantizar la estabilidad y predictibilidad de las tarifas de la red:

| Dimensión | Límite por Transacción en Soroban | Consumo Máximo en Bimex (`contribuir` top-up) | Margen de Seguridad Disponible | % Utilizado del Límite |
|---|---|---|---|---|
| **CPU Instructions** | **100,000,000** | 468,849 insns | **99,531,151 insns** | **0.47%** |
| **Memory Allocation** | **40 MB (41,943,040 B)** | 181,042 bytes | **41,761,998 bytes** | **0.43%** |
| **Ledger Read Entries** | 40 entradas | 4 entradas (`Instancia`, `Proyecto`, `Aportacion`, `SAC Balance`) | 36 entradas | 10.0% |
| **Ledger Write Entries** | 25 entradas | 3 entradas (`Proyecto`, `Aportacion`, `SAC Balance`) | 22 entradas | 12.0% |

### Conclusiones de Seguridad y Estabilidad:
1. **Margen de Cómputo >99.5%:** La función más costosa del contrato (`contribuir`) utiliza menos del **0.5% del límite de CPU y memoria** de la red Soroban. No existe riesgo de fallas por *TxBudgetExceeded*.
2. **Predictibilidad de Tarifas:** Las tarifas de red (network fee / resource fee) para los usuarios finales se mantienen en el mínimo absoluto de stroops (~0.0001 XLM por transacción).
3. **Preservación Total de Invariantes:** Las 75 pruebas unitarias y de integración pasan satisfactoriamente sin modificar ninguna aserción existente.
