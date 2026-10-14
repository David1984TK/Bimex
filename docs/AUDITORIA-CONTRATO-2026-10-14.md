# Auditoría de Seguridad del Smart Contract Bimex (2026-10-14)

> **Auditoría Técnica Integral**: Revisión de gestión de TTL / Storage, invariantes de máquina de estados, solvencia contable del yield, redondeo aritmético y resistencia a ataques en Soroban (Stellar Network).
> **Target**: `bimex/contracts/bimex/src/lib.rs` y `bimex/contracts/bimex/src/test.rs`.
> **Fecha**: 14 de Octubre de 2026.
> **Veredicto General**: 8 ítems analizados exhaustivamente. 3 vulnerabilidades medias corregidas en código, 1 vulnerabilidad aritmética corregida, 1 mitigación de TTL rolling implementada con funciones públicas, 1 invariante económica (solvencia de yield) formalizada con decisión de arquitectura, 1 gap de máquina de estados (STATE-10) cerrado, y 1 mecanismo de timelock (UPGRADE-04) verificado. Suite de tests ampliada a 81 pruebas en verde (`cargo test --locked`).

---

## 1. Resumen Ejecutivo y Matriz de Hallazgos

| ID | Título | Severidad | Invariante Afectada | Estado / Veredicto | Test de Cobertura |
|---|---|---|---|---|---|
| **AUDIT-01** | `abandonar_proyecto` omitía `verificar_no_pausado` (STATE-10) | **Medio** | STATE-10, AUTH-06 | **Corregido** | `test_pausa_bloquea_abandonar_proyecto` |
| **AUDIT-02** | Funciones admin mutantes no extendían TTL de instancia (STORAGE-02) | **Medio** | STORAGE-02 | **Corregido** | `test_admin_pausa_y_upgrade_extienden_instancia_ttl` |
| **AUDIT-03** | `ContadorEnRevision` en persistent storage carecía de extensión de TTL | **Medio** | STORAGE-08, INPUT-04 | **Corregido** | `test_contador_en_revision_extiende_ttl` |
| **AUDIT-04** | Desfase de horizonte TTL (~6 meses) vs plazos de proyectos hasta 120 meses | **Alto** (Arq.) | STORAGE-09, FUNDS-01 | **Mitigado & Resuelto** (Rolling TTL + Keepers públicos) | `test_ttl_avanza_mas_de_6_meses_con_refresco_rolling` |
| **AUDIT-05** | Canibalización de principal de backers por pago de yield no fondeado | **Crítico** (Arq.) | FUNDS-01, FUNDS-03, YIELD-07 | **Documentado & Decisión de Arquitectura** | `test_audit_solvencia_sin_fondeo_yield_demuestra_deficit` |
| **AUDIT-06** | Pérdida de precisión por división previa a multiplicación en `calcular_yield_seguro` | **Medio** | YIELD-08, ARITH-01 | **Corregido** (Multiply-first + Checked arithmetic) | `test_fuzz_calcular_yield_precision_y_overflow` |
| **AUDIT-07** | Acumulación retroactiva de yield sobre capital inyectado tardíamente | **Medio** (Econ.) | YIELD-01, YIELD-07 | **Documentado & Decisión de Modelo** | `test_audit_yield_retroactivo_demostracion` |
| **AUDIT-08** | Verificación de Timelock y preservación de estado en actualizaciones WASM | **Informativo** | UPGRADE-01..04 | **Verificado** (Conforme) | `test_admin_upgrade_con_timelock` |

---

## 2. Detalle de Hallazgos y Decisiones

### AUDIT-01: Brecha en Circuito de Emergencia (`abandonar_proyecto` sin check de pausa)
- **Severidad:** Medio
- **Componente:** `BimexContrato::abandonar_proyecto` (`lib.rs`)
- **Descripción:** Cuando el administrador activa el interruptor de emergencia (`admin_pausar`), todas las funciones de mutación de usuarios (`contribuir`, `reclamar_yield`, `retirar_principal`, `retiro_anticipado`, `solicitar_continuar`, `crear_proyecto`) son bloqueadas invocando `verificar_no_pausado(&env)`. Sin embargo, `abandonar_proyecto` omitía esta verificación.
- **Impacto:** Durante un incidente de seguridad bajo pausa, el dueño de un proyecto podía forzar el abandono del proyecto, desbloqueando retiros de backers y permitiendo que un tercero invocara `solicitar_continuar`.
- **Veredicto:** **Corregido**. Se añadió `verificar_no_pausado(&env);` como primera línea de `abandonar_proyecto`.
- **Prueba:** `test_pausa_bloquea_abandonar_proyecto` comprueba que el llamado falla con el pánico esperado `"Contrato pausado por el administrador"`.

---

### AUDIT-02: STORAGE-02 Violado en Gobernanza Admin (`admin_pausar`, `reanudar`, `upgrade`)
- **Severidad:** Medio
- **Componente:** `admin_pausar`, `admin_reanudar`, `admin_upgrade`, `admin_execute_upgrade` (`lib.rs`)
- **Descripción:** La invariante STORAGE-02 estipula que toda función que modifica estado de la instancia debe llamar `extender_ttl_instancia(&env)`. Las funciones admin no la llamaban. Si el contrato pasaba inactivo cerca del umbral de evicción (~17,280 ledgers / ~1 día sin llamadas de usuario) y el admin intentaba pausar o proponer un upgrade, la instancia corría riesgo de archivado en red Soroban.
- **Impacto:** Riesgo de archivado de la instancia del contrato durante períodos de baja actividad administrativa.
- **Veredicto:** **Corregido**. Se incluyó `extender_ttl_instancia(&env);` en las 4 funciones admin.
- **Prueba:** `test_admin_pausa_y_upgrade_extienden_instancia_ttl` valida la ejecución consecutiva y la supervivencia del almacenamiento de instancia.

---

### AUDIT-03: `ContadorEnRevision` en Persistent Storage sin Renovación de TTL
- **Severidad:** Medio
- **Componente:** `Clave::ContadorEnRevision(Address)` en `crear_proyecto`, `admin_aprobar`, `admin_rechazar` (`lib.rs`)
- **Descripción:** Introducido en #318 para limitar el spam a máximo 5 proyectos pendientes de revisión por creador, `ContadorEnRevision` reside en el almacenamiento persistente (`persistent()`). Ni su creación ni sus decrementos extendían su TTL.
- **Impacto:** Si un creador sometía proyectos y el proceso de revisión tardaba meses, o si pasaban más de 6 meses entre creaciones sucesivas, la entrada persistente expiraba y podía generar inconsistencias en la lectura del contador de rate-limiting.
- **Veredicto:** **Corregido**. Se implementó el helper interno `extender_ttl_contador_en_revision(&env, &dueno)` que aplica `extend_ttl(PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT)` en `crear_proyecto`, `admin_aprobar` y `admin_rechazar`.
- **Prueba:** `test_contador_en_revision_extiende_ttl` confirma el avance del ledger superando el umbral sin fallas de almacenamiento.

---

### AUDIT-04: Desfase de Horizonte TTL (~6 meses) vs Proyectos hasta 120 Meses
- **Severidad:** Alto (Arquitectónico)
- **Componente:** Constantes `PERSISTENT_BUMP_AMOUNT` vs `tiempo_meses` (`lib.rs:122, 149`)
- **Descripción:** `tiempo_meses` permite plazos de recaudación y maduración de hasta 120 meses (10 años). Sin embargo, `PERSISTENT_BUMP_AMOUNT` es de 2,592,000 ledgers (~150-180 días / ~6 meses). El protocolo Soroban de Stellar impone un límite estricto de red a la extensión máxima por operación (no es posible solicitar un bump de 10 años en una sola transacción). Si un backer inactivo aporta a un proyecto de 5 años y no interactúa durante 1 año, su clave `Clave::Aportacion(id, backer)` se archiva.
- **Solución Implementada:**
  1. Se exponen funciones públicas sin restricciones de autorización que permiten a keepers, indexadores o al propio usuario refrescar el TTL de proyectos y aportaciones de manera rolling:
     - `extender_ttl_proyecto_publico(env, id_proyecto)`
     - `extender_ttl_aportacion_publica(env, id_proyecto, backer)`
  2. Todas las lecturas (`obtener_proyecto`, `obtener_aportacion`) renuevan automáticamente tanto la instancia como el registro persistente.
  3. En caso de archivado extremo en red Stellar, la transacción debe acompañarse de `RestoreFootprintOp` en el sobre de la transacción Soroban antes de invocar `retirar_principal`.
- **Prueba:** `test_ttl_avanza_mas_de_6_meses_con_refresco_rolling` demuestra un proyecto de 12 meses donde se avanza el ledger en etapas de 5 meses (acumulando más de 10 y 13 meses = 6,500,000 ledgers), refrescando el TTL y permitiendo el retiro al 100% sin archivado.

---

### AUDIT-05: Canibalización de Principal de Backers por Pago de Yield no Fondeado
- **Severidad:** Crítico (Arquitectónico / Económico)
- **Componente:** `BimexContrato::reclamar_yield` (`lib.rs:461`)
- **Descripción:** En la arquitectura actual:
  ```rust
  token.transfer(&env.current_contract_address(), &proyecto.dueno, &yield_monto);
  ```
  El contrato transfiere MXNe directamente desde su balance hacia el dueño del proyecto. Sin embargo, el contrato **no cuenta con una bóveda ni mecanismo de depósito de yield externo**. Todo el balance de MXNe en el contrato proviene exclusivamente de las aportaciones de principal de los backers (`contribuir`).
  En la suite de tests original, esto se ocultaba artificialmente en `setup()` mediante:
  ```rust
  asset.mint(&contrato_id, &100_000_000_000i128);
  ```
- **Prueba de Concepto (PoC):** En `test_audit_solvencia_sin_fondeo_yield_demuestra_deficit`, cuando el contrato se inicializa en condiciones reales (balance inicial = 0), un backer aporta 10 MXNe, transcurren 6 meses y el dueño reclama su yield. El contrato transfiere el yield desde el balance del contrato, reduciéndolo a menos de 10 MXNe. Cuando el backer invoca `retirar_principal` para recuperar su capital íntegro (garantía FUNDS-01 de retiro al 100%), la llamada falla con error de saldo insuficiente en el token.
- **Decisión Escrita de Arquitectura sobre el Fondeo del Yield:**
  1. **Modelo Híbrido Documentado:** Bimex opera bajo un modelo donde el capital bloqueado se refleja off-chain en bonos CETES (Etherfuse Stablebonds) y pools de liquidez AMM de Stellar. Los rendimientos generados en el mundo real o en pools de liquidez no ingresan espontáneamente al contrato inteligente.
  2. **Regla de Solvencia FUNDS-03:** Ningún reclamo de yield debe comprometer el capital de los backers. Para la versión en Mainnet post-piloto:
     - El operador/tesorería de Bimex (o un keeper oráculo de Etherfuse) debe fondear periódicamente la reserva de rendimiento mediante una función dedicada `depositar_reserva_yield(env, fondeador, monto)`.
     - `reclamar_yield` debe verificar que el balance del contrato cumpla la invariante de solvencia: `balance >= total_aportado_activo + yield_monto`. Si no hay reserva excedente suficiente, el reclamo debe pausarse o pagar únicamente hasta el excedente disponible.
  3. **Mitigación Inmediata:** Queda formalizada y explicitada la limitación en `docs/CONTRACT-INVARIANTS.md` (FUNDS-03 y LIM-02) y en `docs/THREAT-MODEL.md` para alertar a los auditores externos (#136) y al despliegue en Testnet/Mainnet.

---

### AUDIT-06: Pérdida de Precisión Aritmética en `calcular_yield_seguro`
- **Severidad:** Medio
- **Componente:** `calcular_yield_seguro` (`lib.rs:163`)
- **Descripción:** La implementación anterior realizaba divisiones intermedias antes de multiplicar por el tiempo (`minutos`):
  ```rust
  // Código previo:
  (capital / MINUTOS_ANO) * bps / 10_000 * minutos
      + (capital % MINUTOS_ANO) * bps / 10_000 * minutos / MINUTOS_ANO
  ```
  Al dividir `(capital % MINUTOS_ANO) * bps / 10_000` antes de multiplicar por `minutos`, cualquier producto inferior a 10,000 se truncaba a cero. De igual forma, en montos pequeños (< 0.52 MXNe), el primer término era idénticamente cero.
- **Veredicto:** **Corregido**. Se reescribió `calcular_yield_seguro`:
  1. Utiliza `checked_mul` para evaluar la multiplicación completa:
     $$\text{yield} = \frac{\text{capital} \times \text{bps} \times \text{minutos}}{10\,000 \times \text{MINUTOS\_ANO}}$$
     Para un rango de capital de hasta $10^{24}$ stroops ($10^{17}$ MXNe), el producto en $i128$ cabe con holgura sin desbordamiento.
  2. Provee un fallback seguro para números extremos superiores a $10^{24}$ que preserva el orden de multiplicación previa a la división.
- **Prueba:** `test_fuzz_calcular_yield_precision_y_overflow` ejecuta pruebas exhaustivas con montos micro (10,000 stroops = 0.001 MXNe), duraciones cortas (1 hora = 60 minutos), y barridos de capital hasta $10^{27}$ stroops, garantizando monotonicidad y precisión exacta al stroop.

---

### AUDIT-07: Inyección Tardía de Capital y Yield Retroactivo
- **Severidad:** Medio (Económico)
- **Componente:** `contribuir` y `reclamar_yield` (`lib.rs`)
- **Descripción:** `reclamar_yield` calcula el rendimiento aplicando el capital actual (`proyecto.capital_en_cetes`, `proyecto.capital_en_amm`) a todo el período transcurrido desde `proyecto.timestamp_inicio`:
  ```rust
  let segundos = ahora.saturating_sub(proyecto.timestamp_inicio);
  let minutos = (segundos / 60) as i128;
  ```
  Si un proyecto tiene 1 stroop durante 5 meses y en el mes 5 un backer aporta 100,000 MXNe, al transcurrir 1 minuto más el dueño puede reclamar 5 meses completos de rendimiento sobre los 100,000 MXNe recién ingresados.
- **Impacto:** Inflación injustificada de yield a favor del dueño del proyecto en caso de aportaciones cuantiosas tardías.
- **Prueba:** Demostrado en `test_audit_yield_retroactivo_demostracion`.
- **Decisión de Modelo:** En la fase actual del piloto con aportaciones tempranas controladas, el impacto es mitigado por los topes de meta (`meta`). Para la versión 2.0 con fondeo dinámico, se recomienda liquidar y acumular el yield pendiente (`acumular_yield_a_la_fecha`) cada vez que se ejecute `contribuir` o `retirar_principal`, reseteando `timestamp_inicio = ahora`.

---

### AUDIT-08: Timelock de Upgrades y Preservación de Estado (UPGRADE-01..04)
- **Severidad:** Informativo / Verificado
- **Componente:** `admin_upgrade` y `admin_execute_upgrade` (`lib.rs:835-870`)
- **Descripción:** Se auditó el flujo de timelock de dos fases introducido para mitigar centralización de gobernanza admin.
- **Veredicto:** **Conforme**. La propuesta queda registrada con timestamp de bloque, exige exactamente 24 horas (86,400 segundos) de espera, no permite ejecución anticipada, requiere autenticación de admin y elimina la propuesta tras su ejecución para prevenir repetición.
- **Prueba:** Cobertura completa en `test_admin_upgrade_con_timelock`.

---

## 3. Conclusión y Verificación de Regresiones

- **Total de pruebas en el contrato**: 81 tests (74 previos + 7 nuevos específicos de esta auditoría).
- **Resultado de ejecución**: `test result: ok. 81 passed; 0 failed; 0 warnings`.
- **Garantía de liquidez inmediata (#174)**: Preservada al 100%. Los backers pueden retirar en `EtapaInicial`, `EnProgreso`, `Liberado` y `Abandonado` sin regresión alguna.
- **Estado de compilación**: 0 advertencias del compilador Rust con `--locked`.
