# Auditoría interna del contrato Bimex — remediación de custodia

**Fecha:** 2026-10-19  
**Alcance:** `bimex/contracts/bimex/src/lib.rs`, `test.rs`,
`CONTRACT-INVARIANTS.md` y `THREAT-MODEL.md`  
**Método:** revisión manual de flujos de valor/TTL, pruebas regresivas y
property tests deterministas (`proptest`, 32 casos por propiedad).

> Este informe es una revisión interna de ingeniería y no sustituye la
> auditoría externa planificada en #136.

## Resumen ejecutivo

Se revisaron **9 ítems**. Se encontraron dos riesgos altos relacionados con
el yield, tres brechas medias de disponibilidad/pausa, y una deficiencia de
precisión/overflow. Todos tienen corrección en código y prueba regresiva.

La decisión de producto y seguridad es explícita: **el yield se paga sólo con
una reserva MXNe prefundeada por el administrador; nunca con principal de los
backers.** Si la reserva no alcanza, `reclamar_yield` revierte sin mover MXNe.
El principal continúa disponible para el retiro inmediato de #174.

| Resultado | Cantidad |
| --- | ---: |
| Corregido y cubierto por prueba | 7 |
| Verificado sin cambio funcional | 2 |
| Hallazgos abiertos de severidad alta/media | 0 |

## Hallazgos y veredictos

| ID | Severidad | Veredicto | Evidencia de corrección y regresión |
| --- | --- | --- | --- |
| AC-01 | **Alta** | **Corregido** — `reclamar_yield` podía transferir desde el balance general del contrato sin saber si era principal. | `Clave::ReservaYield`, `fondear_yield` admin-only y chequeo `reserva >= yield_monto` antes de la transferencia. `test_yield_no_usa_principal_sin_reserva` falla en el código anterior; `test_reserva_yield_fondeada_mantiene_principal_y_retiro_inmediato` conserva 100 % del principal y valida #174. |
| AC-02 | **Alta** | **Corregido** — el cálculo con `capital_en_*` actual aplicaba depósitos/retiros a tiempo histórico. | `acumular_yield_pendiente` liquida antes de cada contribución/retiro, y guarda el residuo. `test_yield_checkpoint_no_aplica_capital_nuevo_retroactivamente` falla antes del checkpoint. |
| AC-03 | **Media** | **Corregido con control operativo** — el bump persistente era 2,592,000 ledgers (~6 meses) frente a plazos de 120 meses. | El contrato usa `min(6_312_000, storage().max_ttl())` y ofrece `renovar_ttl_proyecto`/`renovar_ttl_aportacion` sin auth. `test_ttl_persistente_sobrevive_mas_de_seis_meses` mantiene sólo la instancia y recupera proyecto/aportación después de 2,592,001 ledgers. Un keeper debe renovar periódicamente; un único TTL de diez años no es posible en Soroban. |
| AC-04 | **Media** | **Corregido** — `ContadorEnRevision(owner)` no recibía bump y podía archivarse, abriendo el límite de cinco revisiones. | Helper dedicado llamado en crear/aprobar/rechazar y en renovación de proyecto. `test_ttl_contador_en_revision_sobrevive_mas_de_seis_meses` rechaza el sexto proyecto tras el avance de tiempo. |
| AC-05 | **Media** | **Corregido** — STORAGE-02 no cubría `admin_pausar`, `admin_reanudar`, `admin_upgrade` ni `admin_execute_upgrade`. | Los cuatro invocan `extender_ttl_instancia`; `test_storage02_admin_mutadores_extienden_ttl_instancia` los ejecuta cuando el TTL está a un ledger de expirar. |
| AC-06 | **Media** | **Corregido** — STATE-10 permitía `abandonar_proyecto` mientras el circuito estaba pausado. | `verificar_no_pausado()` se ejecuta al inicio. `test_state10_pausa_bloquea_abandonar_proyecto` falla antes del fix. |
| AC-07 | **Media** | **Corregido** — dividir antes de multiplicar perdía stroops y la fórmula no era exacta para extremos. | `U256` implementa `floor(capital × bps × minutos / denominador)` y conserva residuo entre checkpoints. `test_yield_exacto_conserva_stroops_que_la_division_previa_perdia`, `test_yield_extremo_usa_u256_sin_overflow_i128` y `proptest_yield_redondeo_exacto`. |
| AC-08 | Baja | **Verificado** — cap de contribuciones y contabilidad 50/50. | Las pruebas existentes de overfunding, distribución impar y múltiples aportaciones siguen en verde. |
| AC-09 | Baja | **Verificado** — retiro inmediato (#174) no regresa al comportamiento restrictivo. | `test_retirar_principal_en_progreso_exito` sigue en verde y la nueva prueba de reserva vuelve a retirar el principal inmediatamente después de un reclamo de yield. |

## Decisión de fondeo del yield

### Política adoptada

1. Al inicializar, `ReservaYield` es **cero**.
2. Sólo la dirección administradora puede llamar `fondear_yield(admin, cantidad)`.
   Esa función mueve MXNe del admin al contrato y aumenta la reserva por el
   mismo importe, dentro de la misma invocación atómica.
3. `reclamar_yield` primero calcula/liquida el rendimiento, y sólo lo transfiere
   si la reserva registrada es suficiente. Reduce la reserva antes de la
   interacción con el token (CEI).
4. Un balance MXNe recibido fuera de `fondear_yield` no se considera reserva
   automáticamente. Esto falla cerrado: evita clasificar por error principal
   de backers como liquidez de yield.
5. Si la reserva se agota, un reclamo de yield se demora hasta que el admin la
   reponga; el retiro de principal no depende de esa reposición.

### Implicación de migración

Una actualización de un contrato ya desplegado comienza con `ReservaYield = 0`.
Antes de permitir nuevos reclamos, operaciones debe fondear una reserva nueva
desde una tesorería segregada. No se debe “contabilizar” saldo histórico del
contrato como yield sin una conciliación externa: ese saldo puede incluir
principal. Es una elección deliberada de seguridad sobre disponibilidad de
yield acumulado.

## Diseño de TTL para plazos de hasta 120 meses

Soroban impone un máximo de TTL por entrada que depende de la red; por eso
ninguna constante de contrato puede garantizar diez años sin actividad. La
corrección combina:

- bump al máximo efectivo de la red en cada acceso/escritura relevante;
- operaciones permissionless de renovación para proyecto y aportación;
- renovación del contador de revisión que protege el límite anti-spam;
- requisito operativo de un keeper redundante que invoque las renovaciones
  antes del máximo de red; y
- restauración de footprint de Soroban si una entrada ya fue archivada.

La prueba de más de seis meses demuestra la regresión concreta denunciada. La
política operativa para Mainnet debe alertar con suficiente margen y no asumir
que una lectura simulada del RPC persiste un bump: la renovación debe ser una
transacción incluida en ledger.

## Pruebas ejecutadas

```text
cargo test --locked
87 passed; 0 failed
```

Cobertura nueva relevante:

- `fuzz_solvencia_reserva_y_principal` — 16 secuencias de principal/tiempo:
  sin reserva el reclamo falla; con reserva exacta el pago no reduce principal;
  después el backer retira todo el principal.
- `proptest_yield_redondeo_exacto` — 32 combinaciones de capital, bps y minutos
  contra un oráculo `i128` en un dominio que no desborda.
- extremos `i128` con producto intermedio superior a `i128` pero resultado
  final representable.
- persistencia más allá de seis meses, contador de revisión, los cuatro
  mutadores admin y pausa de abandono.

## Cierre de criterios de aceptación

- [x] Al menos 8 ítems revisados con veredicto (9).
- [x] Cada hallazgo alto/medio tiene una prueba regresiva identificada arriba.
- [x] STORAGE-02 y STATE-10 cerrados en código y en
  `CONTRACT-INVARIANTS.md`.
- [x] Decisión escrita sobre fuente y agotamiento de yield.
- [x] Prueba TTL que avanza más de seis meses.
- [x] `cargo test --locked` en verde y retiro inmediato #174 preservado.
