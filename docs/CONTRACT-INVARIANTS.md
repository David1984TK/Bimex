# Bimex Contract Invariants

> Critical properties that the Bimex Soroban smart contract must never violate. These invariants are the foundation of the bug-bounty program and must be preserved across every release, upgrade, and audit.

**Version**: 1.2  
**Last updated**: 2026-10-14  
**Next review**: 2027-01-14  

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

## 2. Auditoría de vigencia (2026-10-14)

Revisión técnica y formal de seguridad sobre el contrato `bimex/contracts/bimex/src/lib.rs` y `test.rs` (81 tests, todos en verde). Se contrastó el modelo de almacenamiento, máquina de estados y contabilidad de rendimientos (referencia: `docs/AUDITORIA-CONTRATO-2026-10-14.md`).

### 2.1 Resultado

Las brechas previas **STATE-10** y **STORAGE-02** fueron **corregidas y cerradas en código**. Se añadieron las invariantes **STORAGE-08** y **STORAGE-09** para gobernanza de TTL en almacenamiento persistente y proyectos de largo plazo (hasta 120 meses). Se formalizó la decisión de arquitectura sobre la solvencia del fondeo de yield (**FUNDS-03**).

### 2.2 Hallazgos y estado de resolución

| ID | Estado | Hallazgo y Resolución |
| --- | --- | --- |
| **STATE-10** | ✅ **Corregido en código (2026-10-14)** | `abandonar_proyecto` ahora invoca `verificar_no_pausado(&env)`. El circuito de emergencia bloquea efectivamente el abandono de proyectos mientras el contrato esté pausado por el administrador. Cobertura: `test_pausa_bloquea_abandonar_proyecto`. |
| **STORAGE-02** | ✅ **Corregido en código (2026-10-14)** | `admin_pausar`, `admin_reanudar`, `admin_upgrade` y `admin_execute_upgrade` ahora llaman a `extender_ttl_instancia(&env)`. Se garantiza que ninguna operación de gobernanza administrativa deje desprotegida la instancia contra evicción. Cobertura: `test_admin_pausa_y_upgrade_extienden_instancia_ttl`. |
| **STORAGE-08** | ✅ **Nuevo & Corregido (2026-10-14)** | `ContadorEnRevision(dueno)` ahora renueva su TTL en persistent storage en `crear_proyecto`, `admin_aprobar` y `admin_rechazar`. Cobertura: `test_contador_en_revision_extiende_ttl`. |
| **STORAGE-09** | ✅ **Nuevo & Mitigado (2026-10-14)** | Desfase entre el límite de TTL de red (~6 meses) y proyectos hasta 120 meses mitigado mediante rolling TTL y funciones públicas de refresco: `extender_ttl_proyecto_publico` y `extender_ttl_aportacion_publica`. Cobertura: `test_ttl_avanza_mas_de_6_meses_con_refresco_rolling`. |
| **FUNDS-03** | ⚠️ **Decisión formal de arquitectura** | Se documenta que el pago de yield en `reclamar_yield` no debe canibalizar el principal de los backers (invariante FUNDS-01). En producción, el balance de yield debe ser fondeado externamente por la tesorería o keepers oráculo antes del desembolso. Cobertura: `test_audit_solvencia_sin_fondeo_yield_demuestra_deficit`. |
| **YIELD-08** | ✅ **Corregido en código (2026-10-14)** | Se eliminó la pérdida de precisión por división previa en `calcular_yield_seguro`. Ahora multiplica antes de dividir usando `checked_mul` en i128 sin riesgo de desbordamiento. Cobertura: `test_fuzz_calcular_yield_precision_y_overflow`. |

---

## 3. Auth & access control invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| AUTH-01 | Only the address stored in `Clave::Admin` can call `admin_aprobar`, `admin_rechazar`, `admin_pausar`, `admin_reanudar`, `admin_cambiar_admin`, `admin_upgrade`, and `admin_execute_upgrade`. | Prevents unauthorized governance actions. | ✅ `test_no_admin_no_puede_upgrade`, `test_solo_admin_puede_pausar`, `test_solo_admin_puede_reanudar`, `test_admin_cambiar_admin_no_autorizado`, `test_admin_upgrade_con_timelock` |
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
| STATE-09 | Pausing the contract does not affect admin-only governance actions (`admin_aprobar`, `admin_rechazar`, `admin_cambiar_admin`, `admin_upgrade`, `admin_execute_upgrade`). | Ensures the admin can still recover during an incident. | ✅ `test_admin_aprobacion_funciona_pausado` |
| STATE-10 | Pausing blocks state-changing user operations (`contribuir`, `reclamar_yield`, `retirar_principal`, `retiro_anticipado`, `solicitar_continuar`, `crear_proyecto`, `abandonar_proyecto`). | Circuit breaker protects user funds. ✅ **Corregido (2026-10-14)**: `abandonar_proyecto` ahora llama `verificar_no_pausado()`. | ✅ `test_pausa_bloquea_contribuciones`, `test_reanudacion_permite_contribuciones`, `test_pausa_bloquea_abandonar_proyecto` |
| STATE-11 | When all contributions are withdrawn from a project, the project returns to `EtapaInicial` (if it was `EnProgreso` or `Liberado`). | Allows the owner to restart or abandon the project cleanly. | ✅ `test_retirar_todos_los_fondos_vuelve_a_etapa_inicial` |

---

## 5. Funds safety invariants

| ID | Invariant | Rationale | Test coverage |
|---|---|---|---|
| FUNDS-01 | A backer can only withdraw **exactly** the amount they deposited (principal). Zero-loss guarantee. | Core protocol promise. | ✅ `test_flujo_completo`, `test_retiro_despues_de_vencimiento`, `test_retirar_principal_proyecto_abandonado` |
| FUNDS-02 | The sum of all backer principals for a project never exceeds the project's `meta`. | Prevents overfunding. | ✅ `test_vul03_overfunding_cap`, `test_estado_capital` |
| FUNDS-03 | The contract's total locked MXNe balance must always be at least the sum of all unwithdrawn principals plus any unclaimed yield. | Solvency invariant. ⚠️ **Decisión formal**: En producción, el reclamo de yield debe estar respaldado por depósitos externos de reserva de rendimiento para no drenar el capital de los backers. | ✅ `test_audit_solvencia_sin_fondeo_yield_demuestra_deficit` |
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
| YIELD-01 | Yield is calculated only from the backer's original contribution timestamp, and top-ups do not reset that timestamp. | Prevents yield clock manipulation. | ✅ `test_vul04_timestamp_preservado_en_topup` |
| YIELD-02 | When a new owner takes over an abandoned project (`solicitar_continuar`), the project's `timestamp_inicio` is reset to the current ledger time. | Prevents the new owner from inheriting previously accrued yield. | ✅ `test_vul06_continuar_resetea_timestamp` |
| YIELD-03 | Yield rates configured at initialization cannot exceed `10_000_000` bps. | Prevents unrealistic or exploitative rates. | ✅ `test_vul05_yield_bps_cetes_excede_maximo`, `test_vul05b_yield_bps_amm_excede_maximo` |
| YIELD-04 | Yield is 0 if no time has elapsed since the contribution/project start timestamp. | Time-proportional yield. | ✅ `test_yield_cero_sin_tiempo_transcurrido` |
| YIELD-05 | `reclamar_yield` cannot be called if the calculated yield is 0. | Prevents empty claims and wasted fees. | ✅ `test_reclamar_yield_cero_falla` |
| YIELD-06 | Annual yield for CETES must be approximately 9.45% APY and AMM approximately 4.00% APY under production settings. | Business model correctness. | ✅ `test_yield_tasas_reales_produccion`, `test_yield_no_es_demo_exagerado` |
| YIELD-07 | The sum of all `yield_entregado` plus remaining unclaimed yield must never exceed the yield that can be mathematically generated from the locked capital and elapsed time. | Yield cannot be created from nothing. | ✅ Indirectly covered by yield tests. |
| YIELD-08 | Yield calculation must be overflow-safe for capital up to the protocol's maximum supported amount and preserve full precision by multiplying before dividing with `checked_mul`. | Protects against arithmetic truncation and overflow. | ✅ `test_fuzz_calcular_yield_precision_y_overflow`, `test_yield_tasas_reales_produccion` |

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
| STORAGE-02 | Every state-mutating function must extend the instance TTL. | Prevents instance storage eviction. ✅ **Corregido (2026-10-14)**: `admin_pausar`, `admin_reanudar`, `admin_upgrade` y `admin_execute_upgrade` ahora extienden el TTL de instancia. | ✅ `test_admin_pausa_y_upgrade_extienden_instancia_ttl` |
| STORAGE-03 | Every read or write of a project must extend the project's persistent TTL. | Prevents project storage eviction. | ✅ `extender_ttl_proyecto` is called in all relevant functions. |
| STORAGE-04 | Every read or write of a backer contribution must extend the contribution's persistent TTL. | Prevents contribution storage eviction. | ✅ `extender_ttl_aportacion` is called in all relevant functions. |
| STORAGE-05 | The project counter (`ContadorProyectos`) is monotonically increasing. | IDs are never reused or rolled back. | ✅ `test_crear_multiples_proyectos` |
| STORAGE-06 | `doc_cid` and `motivo_rechazo` are stored as `String` and cannot be mutated by unauthorized parties. | Document integrity. | ✅ `test_admin_rechazar_con_motivo` |
| STORAGE-07 | TTL extension must keep storage alive for at least 1 day and bump up to 30 days for instances / 6 months for persistent entries. | Availability guarantee. | ✅ `test_extend_ttl` |
| STORAGE-08 | `Clave::ContadorEnRevision` must have its persistent TTL extended on every creation, approval, and rejection. | Prevents spam counter eviction. | ✅ `test_contador_en_revision_extiende_ttl` |
| STORAGE-09 | Multi-year projects (up to 120 months) must support rolling TTL extension via read operations and public keeper functions (`extender_ttl_proyecto_publico`, `extender_ttl_aportacion_publica`). | Availability for long-term projects beyond the network maximum TTL bump (~6 months). | ✅ `test_ttl_avanza_mas_de_6_meses_con_refresco_rolling` |

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
| LIM-02 | Yield is calculated using a simplified on-chain model, not actual off-chain CETES/AMM yields. | The protocol commits to a fixed reference rate; real yield is off-chain and requires external funding for solvency (see FUNDS-03). |
| LIM-03 | The indexer relies on the public Soroban RPC and may lag or miss events under network stress. | Operational risk; indexer has backup/reindex scripts. |
| LIM-04 | `retiro_anticipado` leaves the accrued yield in the project for the owner. | By design; early exit does not entitle the backer to yield. |
| LIM-05 | Integer rounding in the 50/50 split may leave 1 stroop in the AMM bucket for odd amounts. | Acceptable; capital is still fully recoverable. |
| LIM-06 | Admin pause does not block read-only functions. | By design; transparency is maintained during incidents. |
| LIM-07 | The contract does not enforce KYC/AML on project owners or backers. | Regulatory compliance is handled off-chain by the operator. |
| LIM-08 | (Resolved) `abandonar_proyecto` is now blocked while the contract is paused (STATE-10 closed). | N/A |

---

## 11. How to test invariants

Run the full contract test suite:

```bash
cd bimex
cargo test
```

All 81 tests must pass. Each new release should add regression tests for any newly discovered invariant violation.

To verify invariants on the live testnet deployment:

1. Use the Stellar Laboratory or `soroban-cli` to inspect the contract state.
2. Compare `total_aportado` against the sum of live `Aportacion` entries.
3. Verify the contract MXNe balance is at least `total_aportado` plus unclaimed yield.
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