# Bimex Contract Invariants

> Critical properties that the Bimex Soroban smart contract must never violate. These invariants are the foundation of the bug-bounty program and must be preserved across every release, upgrade, and audit.

**Version**: 1.2
**Last updated**: 2026-10-19
**Next review**: 2027-01-19

---

## 1. Purpose

This document lists the invariants that must hold at all times for the Bimex protocol to be considered secure. Any report that demonstrates a violation of one of these invariants is considered a high-priority security issue.

Invariants are grouped by:

- **Auth & access control** — who can do what.
- **State machine** — valid project lifecycle transitions.
- **Funds safety** — principal and yield preservation.
- **Yield correctness** — accurate and fair yield calculation.
- **Input validation** — bounds and spam controls added in #318.
- **Storage & availability** — ledger persistence and TTL.
- **Upgrade safety** — controlled contract upgrades.

---

## 2. Auditoría de vigencia (2026-10-19)

Esta revisión contrasta `bimex/contracts/bimex/src/lib.rs` y su suite de 85
pruebas con las invariantes de custodia. El detalle, severidad, evidencia y
decisión de fondeo se publica en
[`AUDITORIA-CONTRATO-.md`](AUDITORIA-CONTRATO-.md).

Cambios de seguridad relevantes:

- **TTL persistente**: el bump usa el máximo disponible de la red (con límite
  de seguridad) en vez de seis meses fijos; se añadieron
  `renovar_ttl_proyecto` y `renovar_ttl_aportacion`, permissionless, para que
  un keeper mantenga entradas vivas durante proyectos de hasta 120 meses.
- **`ContadorEnRevision`**: se renueva al crear, aprobar o rechazar, y al
  renovar un proyecto en revisión.
- **STORAGE-02**: los cuatro mutadores administrativos pendientes ahora llaman
  `extender_ttl_instancia`.
- **STATE-10**: `abandonar_proyecto` verifica el pause antes de cambiar estado.
- **Yield**: `fondear_yield` crea una reserva separada y sólo el admin puede
  fondearla. `reclamar_yield` falla antes de tocar el principal si la reserva
  no cubre el pago.
- **Cálculo de yield**: cada cambio de capital liquida el tramo anterior,
  conserva el residuo de división y calcula con `U256` para evitar tanto el
  redondeo prematuro como overflow intermedio de `i128`.

### 2.1 Resultado

Las invariantes revisadas siguen vigentes con las precisiones de esta versión.
Los gaps **STORAGE-02** y **STATE-10** están cerrados. Las nuevas pruebas
regresivas incluyen avance de más de seis meses de TTL, solvencia con y sin
reserva, precisión/overflow de yield, y la garantía de retiro inmediato (#174).

### 2.2 Decisiones de seguridad cerradas

| ID | Estado | Decisión y evidencia |
| --- | --- | --- |
| **STATE-10** | ✅ Cerrado | `abandonar_proyecto` llama `verificar_no_pausado()`. `test_state10_pausa_bloquea_abandonar_proyecto` falla en el código anterior y pasa ahora. |
| **STORAGE-02** | ✅ Cerrado | `admin_pausar`, `admin_reanudar`, `admin_upgrade` y `admin_execute_upgrade` extienden el TTL de instancia. `test_storage02_admin_mutadores_extienden_ttl_instancia` cubre los cuatro cerca de expiración. |
| **STORAGE-03/04** | ✅ Fortalecido | El TTL persistente se extiende al máximo configurado por la red y puede renovarse sin auth. `test_ttl_persistente_sobrevive_mas_de_seis_meses` avanza más de seis meses sin tocar proyecto/aportación. |
| **STORAGE-08** | ✅ Cerrado | `ContadorEnRevision` recibe `extend_ttl` en cada escritura y por renovación permissionless. `test_ttl_contador_en_revision_sobrevive_mas_de_seis_meses` mantiene el límite de cinco tras el avance. |
| **FUNDS-03 / YIELD-07** | ✅ Cerrado | El yield procede exclusivamente de `Clave::ReservaYield`, fondeada por `fondear_yield`; un reclamo insuficientemente fondeado revierte sin transferir capital. |
| **YIELD-08** | ✅ Cerrado | El cálculo usa `U256` y residuo acumulado. Los tests de caso de redondeo, extremo y `proptest_yield_redondeo_exacto` verifican la fórmula. |

> **Límite de protocolo Soroban:** ningún contrato puede extender una entrada
> persistente más allá de `storage().max_ttl()` en una sola transacción. Para
> los plazos de 120 meses la disponibilidad requiere un keeper que invoque las
> funciones `renovar_ttl_*` antes de cada máximo de red; si una entrada ya fue
> archivada, se debe restaurar su footprint mediante el flujo de restauración
> de Soroban. Esto es explícito, observable y no se confunde con una garantía
> de TTL único de diez años.

---

## 3. Auth & access control invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| AUTH-01 | Only the address stored in `Clave::Admin` can call `admin_aprobar`, `admin_rechazar`, `admin_pausar`, `admin_reanudar`, `admin_cambiar_admin`, `admin_upgrade`, `admin_execute_upgrade`, and `fondear_yield`. | Prevents unauthorized governance and reserve actions. | ✅ `test_no_admin_no_puede_upgrade`, `test_solo_admin_puede_pausar`, `test_solo_admin_puede_reanudar`, `test_admin_cambiar_admin_no_autorizado`, `test_admin_upgrade_con_timelock`, `test_solo_admin_puede_fondear_yield` |
| AUTH-02 | `crear_proyecto` requires `dueno.require_auth()`. | Ensures the project owner is the signer. | ✅ `test_flujo_completo` |
| AUTH-03 | `contribuir` requires `backer.require_auth()`. | Ensures only the contributor can lock their own funds. | ✅ `test_flujo_completo` |
| AUTH-04 | `reclamar_yield` requires `proyecto.dueno.require_auth()`. | Only the project owner can claim yield. | ✅ `test_flujo_completo` |
| AUTH-05 | `retirar_principal` and `retiro_anticipado` require `backer.require_auth()`. | Only the backer can withdraw their own principal. | ✅ `test_flujo_completo`, `test_retiro_anticipado_devuelve_capital` |
| AUTH-06 | `abandonar_proyecto` requires `proyecto.dueno.require_auth()`. | Only the owner can mark a project abandoned. | ✅ `test_abandonar_y_continuar` |
| AUTH-07 | `solicitar_continuar` requires `nuevo_dueno.require_auth()`. | Only the new owner can take over an abandoned project. | ✅ `test_abandonar_y_continuar` |
| AUTH-08 | `admin_cambiar_admin` requires `admin_actual.require_auth()` and `admin_actual == stored_admin`. | Prevents arbitrary admin transfers. | ✅ `test_admin_cambiar_admin_exito`, `test_admin_cambiar_admin_no_autorizado`, `test_admin_cambiar_admin_mismo_admin_falla` |
| AUTH-09 | `admin_upgrade` and `admin_execute_upgrade` require `admin.require_auth()` and `admin == stored_admin`. | Only admin can update the WASM. | ✅ `test_solo_admin_puede_upgrade`, `test_no_admin_no_puede_upgrade`, `test_admin_upgrade_con_timelock` |
| AUTH-10 | Privileged functions must call `require_auth()` **before** modifying state. | Prevents auth bypass through state manipulation. | ✅ All admin/owner/backer functions |

---

## 4. State machine invariants

Valid state transitions (any other transition is a violation):

```
EnRevision ──admin_aprobar──► EtapaInicial
EnRevision ──admin_rechazar──► Rechazado
EtapaInicial ──contribuir (first)──► EnProgreso
EnProgreso ──contribuir (goal met)──► Liberado
EnProgreso ──abandonar_proyecto──► Abandonado
EtapaInicial ──abandonar_proyecto──► Abandonado
Liberado ──abandonar_proyecto──► Abandonado
Abandonado ──solicitar_continuar──► EtapaInicial (if no funds)
Abandonado ──solicitar_continuar──► EnProgreso (if funds remain)
EnProgreso / Liberado ──retirar_principal (all funds withdrawn)──► EtapaInicial
EnProgreso ──retiro_anticipado (all funds withdrawn)──► EtapaInicial
```

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| STATE-01 | A project can only be approved (`admin_aprobar`) when it is in `EnRevision`. | Prevents duplicate or unauthorized approvals. | ✅ `test_admin_aprobar_proyecto_ya_aprobado_falla` |
| STATE-02 | A project can only be rejected (`admin_rechazar`) when it is in `EnRevision`. | Rejection is a one-time review action. | ✅ `test_admin_rechazar_proyecto_aprobado_falla` |
| STATE-03 | A project can only be abandoned from `EtapaInicial`, `EnProgreso`, or `Liberado`. | Rejected or already-review projects cannot be abandoned. | ✅ `test_vul02_no_abandonar_rechazado`, `test_vul02b_no_abandonar_en_revision` |
| STATE-04 | `solicitar_continuar` can only be called on `Abandonado` projects. | Prevents project hijacking while active. | ✅ `test_solicitar_continuar_proyecto_activo_falla` |
| STATE-05 | Contributions are only accepted when the project is in `EtapaInicial` or `EnProgreso` (and before the deadline). | Prevents funding rejected, abandoned, or completed projects. | ✅ `test_vul08_no_contribuir_en_revision`, `test_contribuir_proyecto_rechazado_falla`, `test_contribuir_proyecto_liberado_falla` |
| STATE-06 | `retirar_principal` is allowed in `EtapaInicial`, `EnProgreso`, `Liberado`, or `Abandonado` — **immediate-liquidity guarantee**: the backer can recover 100% of their principal at any time from an active, finished, or abandoned project. Forbidden in `EnRevision` and `Rechazado`. The deadline-expiry condition is subsumed by the immediate-liquidity policy. | Backers control their principal at all times (zero-loss guarantee); there is no premature-withdrawal restriction once funds are locked. | ✅ `test_vul09_retiro_en_progreso_permitido`, `test_retirar_principal_en_progreso_exito`, `test_retiro_despues_de_vencimiento`, `test_retirar_principal_proyecto_abandonado` |
| STATE-07 | `retiro_anticipado` is only allowed when the project is `EtapaInicial` or `EnProgreso` and the deadline has not expired. | Dedicated early-exit path (identical result to STATE-06, kept for policy clarity). | ✅ `test_retiro_anticipado_despues_de_vencimiento_falla`, `test_retiro_anticipado_proyecto_liberado_falla` |
| STATE-08 | `reclamar_yield` is only allowed when the project is `EnProgreso` or `Liberado` and has at least one active contribution. | Prevents yield extraction from invalid states. | ✅ `test_vul01_yield_bloqueado_en_revision`, `test_vul01b_yield_bloqueado_rechazado`, `test_vul01c_yield_bloqueado_abandonado`, `test_reclamar_yield_cero_falla` |
| STATE-09 | Pausing the contract does not affect admin-only governance actions (`admin_aprobar`, `admin_rechazar`, `admin_cambiar_admin`, `admin_upgrade`, `admin_execute_upgrade`, `fondear_yield`). | Ensures the admin can still recover or replenish the yield reserve during an incident. | ✅ `test_admin_aprobacion_funciona_pausado`, `test_reserva_yield_fondeada_mantiene_principal_y_retiro_inmediato` |
| STATE-10 | Pausing blocks state-changing user operations (`contribuir`, `reclamar_yield`, `retirar_principal`, `retiro_anticipado`, `solicitar_continuar`, `crear_proyecto`, `abandonar_proyecto`). | Circuit breaker protects user funds during an incident. | ✅ `test_pausa_bloquea_contribuciones`, `test_reanudacion_permite_contribuciones`, `test_state10_pausa_bloquea_abandonar_proyecto` |
| STATE-11 | When all contributions are withdrawn from a project, the project returns to `EtapaInicial` (if it was `EnProgreso` or `Liberado`). | Allows the owner to restart or abandon the project cleanly. | ✅ `test_retirar_todos_los_fondos_vuelve_a_etapa_inicial` |

---

## 5. Funds safety invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| FUNDS-01 | A backer can only withdraw **exactly** the amount they deposited (principal). Zero-loss guarantee. | Core protocol promise. | ✅ `test_flujo_completo`, `test_retiro_despues_de_vencimiento`, `test_retirar_principal_proyecto_abandonado` |
| FUNDS-02 | The sum of all backer principals for a project never exceeds the project's `meta`. | Prevents overfunding. | ✅ `test_vul03_overfunding_cap`, `test_estado_capital` |
| FUNDS-03 | El principal no puede financiar yield: cada pago de `reclamar_yield` debe estar cubierto por `Clave::ReservaYield`, fondeada explícitamente por el admin. | Separa la liquidez de yield del capital custodiado y preserva el retiro de 100 % de principal. | ✅ `test_yield_no_usa_principal_sin_reserva`, `test_reserva_yield_fondeada_mantiene_principal_y_retiro_inmediato`, `fuzz_solvencia_reserva_y_principal` |
| FUNDS-04 | When a backer withdraws principal, the corresponding `Aportacion` entry is removed. | Prevents double withdrawal. | ✅ `test_vul07_no_doble_retiro` |
| FUNDS-05 | `retiro_anticipado` returns 100% of the principal and does not pay any yield to the backer. | Yield stays in the project for the owner. | ✅ `test_retiro_anticipado_devuelve_capital` |
| FUNDS-06 | When a project is abandoned, every backer can recover 100% of their principal. | Zero-loss guarantee even on project failure. | ✅ `test_retirar_principal_proyecto_abandonado` |
| FUNDS-07 | When a project's deadline expires without reaching the goal, backers can recover 100% of their principal. | Zero-loss guarantee on underfunded projects (now a subset of the immediate-liquidity policy in STATE-06). | ✅ `test_retiro_despues_de_vencimiento`, `test_vul09_retiro_en_progreso_permitido` |
| FUNDS-08 | The contract never transfers principal to anyone other than the original backer. | Principal is not confiscable. | ✅ `test_flujo_completo` (transfer destination is `backer`) |
| FUNDS-09 | `meta` must be greater than 0 when creating a project. | Prevents zero-goal projects. | ✅ `test_crear_proyecto_meta_cero_falla` |
| FUNDS-10 | Contribution amount must be greater than 0. | Prevents empty contributions. | ✅ `test_contribuir_cantidad_cero_falla` |
| FUNDS-11 | Capital split must be 50/50 between CETES and AMM (with integer rounding handled safely). | Preserves the documented yield model. | ✅ `test_capital_distribucion_impar`, `test_estado_capital` |
| FUNDS-12 | `total_aportado` must equal the sum of all active `Aportacion` entries for the project. | Internal accounting consistency. | ✅ `test_multiple_contributors_same_project`, `test_multiple_contributions_same_backer_accumulate` |

---

## 6. Yield correctness invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| YIELD-01 | A top-up does not reset the backer's first-contribution timestamp; for owner yield, the prior project-capital tranche is checkpointed before the top-up. | Prevents yield-clock manipulation and retroactive application of new capital. | ✅ `test_vul04_timestamp_preservado_en_topup`, `test_yield_checkpoint_no_aplica_capital_nuevo_retroactivamente` |
| YIELD-02 | When a new owner takes over an abandoned project (`solicitar_continuar`), the project's `timestamp_inicio` is reset to the current ledger time. | Prevents the new owner from inheriting previously accrued yield. | ✅ `test_vul06_continuar_resetea_timestamp` |
| YIELD-03 | Yield rates configured at initialization cannot exceed `10_000_000` bps. | Prevents unrealistic or exploitative rates. | ✅ `test_vul05_yield_bps_cetes_excede_maximo`, `test_vul05b_yield_bps_amm_excede_maximo` |
| YIELD-04 | Yield is 0 if no time has elapsed since the contribution/project start timestamp. | Time-proportional yield. | ✅ `test_yield_cero_sin_tiempo_transcurrido` |
| YIELD-05 | `reclamar_yield` cannot be called if the calculated yield is 0. | Prevents empty claims and wasted fees. | ✅ `test_reclamar_yield_cero_falla` |
| YIELD-06 | Annual yield for CETES must be approximately 9.45% APY and AMM approximately 4.00% APY under production settings. | Business model correctness. | ✅ `test_yield_tasas_reales_produccion`, `test_yield_no_es_demo_exagerado` |
| YIELD-07 | Sólo se paga yield hasta el monto existente en `ReservaYield`; una reserva insuficiente revierte antes de transferir. La reserva se reduce exactamente por cada pago exitoso. | El principal nunca subsidia rendimiento. | ✅ `test_yield_no_usa_principal_sin_reserva`, `test_reserva_yield_fondeada_mantiene_principal_y_retiro_inmediato`, `fuzz_solvencia_reserva_y_principal` |
| YIELD-08 | Yield is checkpointed before every capital mutation; the exact formula uses `U256` and carries the division remainder across checkpoints. | Prevents retroactive capital, early-rounding loss, and intermediate `i128` overflow. | ✅ `test_yield_checkpoint_no_aplica_capital_nuevo_retroactivamente`, `test_yield_exacto_conserva_stroops_que_la_division_previa_perdia`, `test_yield_extremo_usa_u256_sin_overflow_i128`, `proptest_yield_redondeo_exacto` |

---

## 7. Input validation invariants

Added in #318 (`f2edb3c`, merged 2026-08-26). Enforced at `crear_proyecto` time.

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| INPUT-01 | `nombre` must not exceed 200 chars. | Prevents storage spam and oversized entries. | ✅ `test_nombre_excesivo_falla`, `test_nombre_limite_exacto_pasa` |
| INPUT-02 | `doc_cid` must not exceed 200 chars. | Prevents oversized document references. | ✅ `test_doc_cid_excesivo_falla`, `test_doc_cid_tres_cids_pasa` |
| INPUT-03 | `tiempo_meses` must be within `1..=120`. | Bounds the fundraising window. | ✅ `test_tiempo_meses_cero_falla`, `test_tiempo_meses_excesivo_falla` |
| INPUT-04 | An owner can have at most 5 projects in `EnRevision` at the same time (`Clave::ContadorEnRevision(owner)`). | Prevents review spam. Counter increments on `crear_proyecto`; decrements (saturating) on `admin_aprobar`/`admin_rechazar`. Per-owner, so other owners are unaffected. | ✅ `test_limite_en_revision_falla`, `test_limite_en_revision_cinco_pasa`, `test_en_revision_limit_independiente_por_dueno` |

---

## 8. Storage & availability invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| STORAGE-01 | `inicializar` can only be called once. | Prevents reinitialization attacks. | ✅ `test_inicializar_dos_veces_falla` |
| STORAGE-02 | Every state-mutating function, including pause/resume and both upgrade phases, extends the instance TTL. | Prevents instance storage eviction. | ✅ `test_storage02_admin_mutadores_extienden_ttl_instancia` |
| STORAGE-03 | Project records use the maximum TTL allowed by the active network and can be renewed permissionlessly with `renovar_ttl_proyecto`. | Prevents silent six-month archival; accommodates the 1–120 month lifecycle with periodic maintenance. | ✅ `test_ttl_persistente_sobrevive_mas_de_seis_meses` |
| STORAGE-04 | Contribution records use the maximum network TTL and can be renewed permissionlessly with `renovar_ttl_aportacion`. | Keeps a backer record recoverable throughout the project when the keeper schedule runs. | ✅ `test_ttl_persistente_sobrevive_mas_de_seis_meses` |
| STORAGE-05 | The project counter (`ContadorProyectos`) is monotonically increasing. | IDs are never reused or rolled back. | ✅ `test_crear_multiples_proyectos` |
| STORAGE-06 | `doc_cid` and `motivo_rechazo` are stored as `String` and cannot be mutated by unauthorized parties. | Document integrity. | ✅ `test_admin_rechazar_con_motivo` |
| STORAGE-07 | Instance TTL bumps up to 30 days; persistent entries bump to `min(6_312_000, storage().max_ttl())` ledgers and require renewal before network expiry. | Availability guarantee consistent with Soroban network limits. | ✅ `test_extend_ttl`, `test_ttl_persistente_sobrevive_mas_de_seis_meses` |
| STORAGE-08 | `ContadorEnRevision(owner)` receives the same persistent TTL treatment on create, approve/reject and project renewal. | Its expiration cannot reset the five-project anti-spam limit. | ✅ `test_ttl_contador_en_revision_sobrevive_mas_de_seis_meses` |

---

## 9. Upgrade safety invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| UPGRADE-01 | Only the admin can call `admin_upgrade` and `admin_execute_upgrade`. | Prevents arbitrary code replacement. | ✅ `test_solo_admin_puede_upgrade`, `test_no_admin_no_puede_upgrade`, `test_admin_upgrade_con_timelock` |
| UPGRADE-02 | Upgrades must preserve existing project, contribution, and configuration storage. | State must survive across WASM updates. | ✅ Relies on Soroban storage persistence; tested implicitly by contract test suite. |
| UPGRADE-03 | New WASM versions must continue to enforce all invariants in this document. | Regression protection. | ✅ New releases must pass the full test suite and add tests for new invariants. |
| UPGRADE-04 | Admin upgrades must be proposed with a 24-hour timelock before execution (two-phase flow: `admin_upgrade` stores the proposal in `Clave::PropuestaUpgrade`; `admin_execute_upgrade` enforces `ahora >= timestamp_propuesta + 24 h`). | Gives users time to react to protocol changes. | ✅ `test_admin_upgrade_con_timelock` |

---

## 10. Known limitations (not in scope for new reports)

The following behaviors are known and accepted. Reports describing them will not be rewarded as new vulnerabilities, but suggestions for improvement are welcome.

| ID | Limitation | Reason |
|---|---|---|
| LIM-01 | (Resolved) Admin multisig and timelock are now implemented. | N/A |
| LIM-02 | Yield uses configured reference rates rather than verified off-chain CETES/AMM performance. | The admin must explicitly prefund `ReservaYield`; the contract does not infer or bridge off-chain returns. |
| LIM-03 | The indexer relies on the public Soroban RPC and may lag or miss events under network stress. | Operational risk; indexer has backup/reindex scripts. |
| LIM-04 | `retiro_anticipado` leaves the accrued yield in the project for the owner. | By design; early exit does not entitle the backer to yield. |
| LIM-05 | Integer rounding in the 50/50 split may leave 1 stroop in the AMM bucket for odd amounts. | Acceptable; capital is still fully recoverable. |
| LIM-06 | Admin pause does not block read-only functions. | By design; transparency is maintained during incidents. |
| LIM-07 | The contract does not enforce KYC/AML on project owners or backers. | Regulatory compliance is handled off-chain by the operator. |
| LIM-08 | Persistent storage cannot be kept alive for 120 months with a single Soroban TTL bump. | A permissionless keeper must invoke `renovar_ttl_*` before the network maximum; archived entries require Soroban restoration. |

---

## 11. How to test invariants

Run the full contract test suite:

```bash
cd bimex
cargo test
```

All 87 tests must pass, including the deterministic `proptest` cases. Each new release should add regression tests for any newly discovered invariant violation.

To verify invariants on the live testnet deployment:

1. Use the Stellar Laboratory or `soroban-cli` to inspect the contract state.
2. Compare `total_aportado` against the sum of live `Aportacion` entries.
3. Verify the contract MXNe balance covers all active principal and the explicitly recorded `ReservaYield`; a claim must never reduce principal.
4. Check that no project state violates the transition diagram above.

---

## 12. References

- [`SECURITY.md`](../SECURITY.md) — Bug bounty policy and disclosure process.
- [`docs/THREAT-MODEL.md`](THREAT-MODEL.md) — Threat model and attack surface.
- [`docs/SECURITY-BOUNTY-TIER2.md`](SECURITY-BOUNTY-TIER2.md) — Tier 2 platform decision and budget.
- [`bimex/contracts/bimex/src/lib.rs`](../bimex/contracts/bimex/src/lib.rs) — Contract source.
- [`bimex/contracts/bimex/src/test.rs`](../bimex/contracts/bimex/src/test.rs) — Contract tests.

---

**Authors**: Bimex Security Team  
**Reviewers**: Contract, frontend, and indexer leads