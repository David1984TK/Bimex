# Runbook: incidentes de dependencias (Rust y npm)

Procedimientos para cuando CI se pone rojo **sin que nadie haya tocado el repo**, o cuando un PR de Dependabot rompe el build. Basado en el incidente real del 2026-07-14 (ver postmortem al final).

## Síntomas y diagnóstico rápido

| Síntoma | Causa probable | Sección |
|---|---|---|
| `cargo test` falla en CI con error de compilación **dentro de un crate de terceros** | Release upstream incompatible resuelta en fresco | [A](#a-release-upstream-incompatible-rust) |
| `cargo audit` falla con `Warning: yanked` | Un crate pineado en `Cargo.lock` fue retirado de crates.io | [B](#b-crate-yanked) |
| PR de Dependabot con CI rojo | El bump necesita cambios de código o un pin | [C](#c-pr-de-dependabot-roto) |
| `main` compila y testea verde pero Vercel/deploy falla | Los tests no ejercitan `vite build` o el target wasm | [D](#d-build-de-deploy-roto-con-ci-verde) |

## A. Release upstream incompatible (Rust)

Un crate transitivo publicó una versión nueva que satisface el rango de versiones declarado pero rompe la compilación (ejemplo real: `soroban-env-host` declara `ed25519-dalek >= 2.0.0` sin tope; la 3.0.0 rompió sus propios testutils).

1. Reproduce localmente: `cd bimex && rm -f Cargo.lock && cargo test` (resolución en fresco).
2. Identifica el crate culpable con `cargo tree -i <crate>@<version>`.
3. Pinea hacia atrás la versión transitiva:
   ```bash
   cargo update -p <crate>@<version-mala> --precise <version-buena>
   cargo test --locked && cargo clippy --locked -- -D warnings
   ```
4. Commitea el `Cargo.lock` resultante con un mensaje que explique el pin y por qué.
5. Si el pin no es posible (conflicto de requisitos), el bump está bloqueado por upstream: documenta en el PR y espera el patch (no fuerces el merge).

## B. Crate yanked

`cargo audit --deny warnings` falla porque una versión pineada fue retirada (ejemplo real: `spin 0.9.8`).

```bash
cd bimex
cargo update -p <crate> --precise <siguiente-patch>   # ej. spin 0.9.8 -> 0.9.9
cargo test --locked && cargo audit --deny warnings
```
Commitea el lock. Si no hay versión de reemplazo compatible, agrega una excepción **temporal y comentada** en `bimex/audit.toml` con un issue de seguimiento.

## C. PR de Dependabot roto

- **Fix chico** (pin transitivo, import renombrado): push directo a la rama del PR de Dependabot (`dependabot/...`). Ojo: si editas la rama, `@dependabot rebase` sobreescribirá tus cambios — usa `@dependabot recreate` solo si quieres descartar lo tuyo.
- **Fix grande** (API mayor renombrada, ej. stellar-wallets-kit v2): abre un PR propio que incluya el bump + la migración de código, y cierra el de Dependabot.
- **Nunca** merges con CI rojo: `main` despliega a producción vía Vercel.

## D. Build de deploy roto con CI verde

Los tests unitarios no compilan producción. Verifica siempre por separado:

```bash
# Frontend: el build que corre Vercel
cd bimex-frontend && npm run build

# Contrato: el artefacto wasm real (target wasm32v1-none, requerido por soroban-sdk 27+)
cd bimex && cargo build --release --target wasm32v1-none --locked
```
Ambos pasos existen en CI desde los PRs #225/#226 — si fallan ahí, esta sección explica el porqué.

## Reglas permanentes

- `bimex/Cargo.lock` **está commiteado a propósito** (no va en `.gitignore`).
- CI corre con `--locked`: valida el lock commiteado, no una resolución fresca.
- Después de cualquier `cargo update` local, corre `cargo test --locked` antes de abrir PR.

---

## Postmortem 2026-07-14

**Impacto:** todos los PRs abiertos (incluidos 3 de Dependabot que no tocaban Rust) con el job "Contrato Soroban" en rojo durante días; build de frontend en `main` roto tras dos merges de Dependabot.

**Cadena de eventos:**
1. `Cargo.lock` nunca estuvo commiteado → cada corrida de CI resolvía dependencias en fresco.
2. `ed25519-dalek 3.0.0` se publicó y rompió la compilación de `soroban-env-host` (26.x y 27.0) → **A**.
3. `spin 0.9.8` fue yanked de crates.io → `cargo audit --deny warnings` rojo en `main` → **B**.
4. En paralelo, los bumps #209/#210 (npm) rompieron `vite build` con CI verde, porque CI no ejecutaba el build de producción → **D**.

**Resolución:** #211 (migración stellar-wallets-kit v2 + primer lock commiteado), #215 (spin 0.9.9), pin de `ed25519-dalek` a 2.2.0 dentro de #212, y los guardrails de CI en #225/#226.

**Lecciones:** lockfiles commiteados + `--locked` en CI + build de producción en CI. Las tres cosas juntas convierten "CI rojo misterioso un martes" en "diff de lockfile revisable en un PR de Dependabot".
