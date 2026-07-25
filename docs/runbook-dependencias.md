# Runbook: Fallos de Dependencias

> **Versión:** 1.0.0
> **Última actualización:** 2026-07-25
> **Postmortem de referencia:** incidente 2026-07-14

Este runbook cubre los cuatro modos de fallo de dependencias observados durante la semana del 14 de julio de 2026, cuando ocurrieron simultáneamente en el mismo ciclo de Dependabot. Incluye procedimientos exactos, la tabla de diagnóstico de síntomas y las reglas permanentes que evitan recurrencias.

---

## Tabla de contenidos

1. [Tabla de diagnóstico rápido](#1-tabla-de-diagnóstico-rápido)
2. [Caso A — Versión upstream incompatible resuelta: `cargo update --precise`](#2-caso-a--versión-upstream-incompatible-resuelta-cargo-update---precise)
3. [Caso B — Crate yanked rompe `cargo audit`](#3-caso-b--crate-yanked-rompe-cargo-audit)
4. [Caso C — PRs de Dependabot rotos](#4-caso-c--prs-de-dependabot-rotos)
5. [Caso D — Build de deploy roto con CI verde](#5-caso-d--build-de-deploy-roto-con-ci-verde)
6. [Reglas permanentes](#6-reglas-permanentes)
7. [Postmortem 2026-07-14](#7-postmortem-2026-07-14)

---

## 1. Tabla de diagnóstico rápido

Usa esta tabla para identificar el caso antes de aplicar el procedimiento.

| # | Síntoma principal | Dónde falla | Caso |
|---|---|---|---|
| A | `cargo build` o `cargo test` falla con error de tipos/API roto en una crate transitiva | CI job `Contrato Soroban` | [Caso A](#2-caso-a--versión-upstream-incompatible-resuelta-cargo-update---precise) |
| B | `cargo audit` sale con `error[unmaintained]` o `error[yanked]` en una versión específica | CI job `Contrato Soroban`, paso `Run cargo audit` | [Caso B](#3-caso-b--crate-yanked-rompe-cargo-audit) |
| C | El PR de Dependabot está marcado con conflictos de merge o el check de CI falla por razones de entorno (node version, lockfile desincronizado) sin que haya código roto | Checks del PR | [Caso C](#4-caso-c--prs-de-dependabot-rotos) |
| D | CI verde en la rama `main`, pero Vercel o el build de producción falla con error de resolución de módulos o target WASM | Deploy log de Vercel / build de producción | [Caso D](#5-caso-d--build-de-deploy-roto-con-ci-verde) |

---

## 2. Caso A — Versión upstream incompatible resuelta: `cargo update --precise`

**Ejemplo real:** `ed25519-dalek` 2.x → 3.0 introduce una API breaking que ningún crate del workspace consume directamente, pero sí una dependencia transitiva. Resuelto en **PR #211**.

### Síntomas

```
error[E0277]: the trait `SignerError` is not satisfied
  --> ...
   = note: required by a bound in `ed25519_dalek::SigningKey::sign`
```

`cargo test` y `cargo build --target wasm32-unknown-unknown` fallan. `cargo audit` puede estar verde.

### Causa

`cargo update` sin `--precise` resuelve al parche más nuevo dentro del rango SemVer declarado. Si un upstream publica una versión incompatible con rangos amplios (p.ej. `>= 1, < 4`), Cargo la puede seleccionar aunque rompa compilación.

### Procedimiento

```bash
# 1. Identificar la versión buena (la última que compilaba)
cargo tree -p ed25519-dalek

# 2. Fijar al parche exacto sin mover otras crates
cargo update -p ed25519-dalek --precise 2.1.1

# 3. Verificar que compila con el target WASM
cargo test
cargo build --target wasm32-unknown-unknown --release

# 4. Confirmar que cargo audit sigue verde
cargo audit

# 5. Commitear el Cargo.lock actualizado
git add bimex/Cargo.lock
git commit -m "fix(deps): pin ed25519-dalek to 2.1.1 to restore WASM build"
```

> **Importante:** commitear siempre `Cargo.lock` después del `--precise`. Ver [Regla R1](#r1-lockfile-siempre-commiteado).

### Cuándo escalarlo

Si no existe una versión anterior estable que compile, el problema es upstream. Abrir issue en el repositorio de la crate y fijar la versión con `=` en `Cargo.toml` hasta que haya un fix:

```toml
# bimex/contracts/bimex/Cargo.toml
ed25519-dalek = "=2.1.1"   # pinned: 3.0 rompe compilación, ver <issue URL>
```

---

## 3. Caso B — Crate yanked rompe `cargo audit`

**Ejemplo real:** `spin 0.9.8` fue yanked de crates.io sin reemplazarse por un parche superior visible. `cargo audit --deny warnings` devolvió error aunque el código compila. Resuelto en **PR #212**.

### Síntomas

```
error[yanked]: spin 0.9.8
   │
   = note: crate was yanked from crates.io
```

`cargo build` puede ser verde; sólo `cargo audit` falla.

### Causa

El autor yankeó una versión específica. Cargo sigue usando esa versión desde el lockfile (no la reemplaza automáticamente), pero `cargo audit` con `--deny warnings` la detecta.

### Procedimiento

```bash
# 1. Ver qué versiones no yanked existen
cargo search spin
# O directamente en crates.io: https://crates.io/crates/spin/versions

# 2. Actualizar al parche más nuevo no yanked
cargo update -p spin --precise 0.9.9   # ajusta la versión según lo que esté disponible

# 3. Si no hay versión superior, ignorar explícitamente en audit.toml
# (sólo si se confirma que el yank es cosmético, no security)
```

Si no existe versión nueva y el yank no es por motivo de seguridad, añadir excepción documentada en `bimex/audit.toml`:

```toml
# bimex/audit.toml
[advisories]
ignore = [
  "RUSTSEC-2024-0388",  # derivative 2.2.0 — unmaintained
  "RUSTSEC-2024-0436",  # paste 1.0.15 — unmaintained
  # Añadir aquí sólo yanks cosméticos; documentar el motivo y PR de revisión
]
```

```bash
# 4. Verificar
cargo audit
cargo test

# 5. Commitear
git add bimex/Cargo.lock bimex/audit.toml   # según lo que cambió
git commit -m "fix(deps): update spin to non-yanked version"
```

> **Nunca** añadir un advisory de seguridad real al bloque `ignore` de `audit.toml`. Los advisories RUSTSEC ya presentes (`RUSTSEC-2024-0388`, `RUSTSEC-2024-0436`) son dependencias transitivas de `soroban-sdk` sin ruta de upgrade; cualquier nueva excepción debe justificarse con igual rigor.

---

## 4. Caso C — PRs de Dependabot rotos

**Ejemplo real:** Dependabot abrió PRs para los grupos `frontend-dependencies` (#209) e `indexer-dependencies` (#210) que fallaban en CI por conflictos con cambios en `main` hechos entre ciclos. Resuelto en **PRs #215 y #225**.

### Síntomas

- El PR de Dependabot muestra `This branch has conflicts that must be resolved` en GitHub.
- O bien, el CI del PR falla con error de lockfile desincronizado (`npm ci` difiere del `package-lock.json` del PR).
- O bien, el PR tiene más de ~5 días y `main` ha avanzado con otros cambios de dependencias.

### Árbol de decisión

```
¿El PR de Dependabot tiene conflictos de merge?
├── SÍ → Opción 1: comentar @dependabot rebase
│         Si no responde en 30 min o sigue fallando → Opción 2
│
└── NO → ¿El CI falla por lockfile o entorno?
          ├── SÍ → Opción 2: abrir PR propio basado en main
          └── NO → Mergear el PR de Dependabot normalmente
```

### Opción 1: `@dependabot rebase`

Añade un comentario en el PR con exactamente este texto (sin espacios adicionales):

```
@dependabot rebase
```

Dependabot rebasa la rama sobre `main` y relanza los checks. Esperar ~10 minutos. Si el PR vuelve a verde, mergear.

**Limitaciones:** Si los conflictos son en `package-lock.json` generado (p.ej. por haber mergeado otro PR de deps en paralelo), el rebase automático puede fallar repetidamente. En ese caso, pasar a Opción 2.

### Opción 2: PR propio sobre `main`

```bash
# 1. Crear una rama fresca desde main
git checkout main && git pull
git checkout -b fix/deps-frontend-$(date +%Y%m%d)

# 2. Aplicar las mismas actualizaciones que Dependabot intentaba
#    (leer el diff del PR de Dependabot para saber qué versiones subió)
cd bimex-frontend
npm install <paquete>@<version> [<paquete2>@<version2> ...]
# O si es un bump de todas las dependencias del grupo:
npx npm-check-updates -u --filter "<patron>"
npm install

# 3. Verificar localmente
npm run lint
npm run test:run

# 4. Push y abrir PR
git add package.json package-lock.json
git commit -m "chore(deps): bump frontend-dependencies (manual rebase of #NNN)"
git push -u origin fix/deps-frontend-$(date +%Y%m%d)
# Abrir PR referenciando el PR de Dependabot que se reemplaza
```

> Cerrar el PR de Dependabot original con un comentario indicando que fue reemplazado, para que no vuelva a abrirlo en el siguiente ciclo semanal. Si no se cierra, Dependabot lo reabrirá.

### Para el grupo `cargo-dependencies`

El mismo árbol de decisión aplica. En lugar de `npm install`, el procedimiento es:

```bash
git checkout main && git pull
git checkout -b fix/deps-cargo-$(date +%Y%m%d)

# Aplicar los bumps individuales que Dependabot intentaba
cd bimex
cargo update -p <crate> --precise <version>
# Repetir para cada crate del bump

cargo test
cargo build --target wasm32-unknown-unknown --release

git add Cargo.lock
git commit -m "chore(deps): bump cargo-dependencies (manual rebase of #NNN)"
git push -u origin fix/deps-cargo-$(date +%Y%m%d)
```

---

## 5. Caso D — Build de deploy roto con CI verde

**Ejemplo real:** Los PRs #209 y #210 (bumps de `indexer-dependencies` y `frontend-dependencies`) pasaron CI pero rompieron el deploy de Vercel. El frontend actualizó el paquete `@stellar/stellar-sdk` a una versión que cambió exports ES modules, invisible para el job de CI porque éste no ejecuta `vite build --target wasm32-unknown-unknown`. Documentado en detalle en **PR #226**.

### Síntomas

- CI en GitHub (`Frontend React`, `Indexer Node.js`) muestra ✅ verde.
- Vercel build log muestra error de tipo:
  ```
  [vite]: Rollup failed to resolve import "..."
  Error: Cannot find module '...'
  ```
  O bien errores de tipos WASM en el bundle:
  ```
  TypeError: Cannot read properties of undefined (reading 'wasmBinary')
  ```

### Causa raíz

El job de CI corre `npm ci` + `npm run test:run` (Vitest en Node), pero **no** corre `vite build`. Las incompatibilidades de empaquetado (resolución de módulos ESM, assets WASM, imports dinámicos) sólo se manifiestan durante el paso de build de producción.

### Procedimiento de diagnóstico

```bash
# Reproducir el build de producción localmente
cd bimex-frontend
npm ci
npm run build   # equivalente al comando que ejecuta Vercel

# Si falla, buscar el paquete que causó la regresión
git log --oneline bimex-frontend/package-lock.json | head -5
git diff HEAD~1 -- bimex-frontend/package-lock.json | grep '"version"' | head -20
```

### Procedimiento de resolución

```bash
# 1. Identificar el paquete y la versión anterior funcional
#    (visible en el diff del package-lock.json entre el commit roto y el anterior)

# 2. Volver a la versión anterior
cd bimex-frontend
npm install @stellar/stellar-sdk@<version-anterior>

# 3. Verificar build completo
npm run build
npm run test:run

# 4. Commitear y abrir PR de hotfix
git add package.json package-lock.json
git commit -m "fix(deps): revert @stellar/stellar-sdk to <version> — Vercel build broken"
git push -u origin fix/vercel-build-$(date +%Y%m%d)
```

### Guardrail permanente

Para evitar que CI quede verde con un build de producción roto, el job `Frontend React` en CI debe incluir `npm run build` como paso de verificación. Esto queda codificado en **PR #226** (workflow update). Ver [Regla R3](#r3-build-de-producción-en-ci).

---

## 6. Reglas permanentes

Estas reglas se derivan directamente del postmortem del 2026-07-14 y están aplicadas en los PRs #225 y #226.

### R1: Lockfile siempre commiteado

`bimex/Cargo.lock`, `bimex-frontend/package-lock.json` y `bimex-indexer/package-lock.json` **deben estar commiteados** en el repositorio y actualizarse en el mismo commit que toca dependencias.

Rationale: sin lockfile commiteado, `cargo build --locked` y `npm ci` en CI producen resultados no reproducibles entre entornos.

```bash
# Verificar antes de mergear cualquier PR de deps:
git diff --name-only HEAD | grep -E "Cargo\.lock|package-lock\.json"
# Debe aparecer junto al Cargo.toml / package.json correspondiente
```

### R2: `--locked` en builds de producción

El script `bimex/deploy-mainnet.sh` y cualquier pipeline de deploy deben usar `--locked`:

```bash
# Contrato
cargo build --target wasm32-unknown-unknown --release --locked

# Nunca omitir --locked en deploy; sólo se omite en desarrollo local
```

`--locked` hace que Cargo falle si `Cargo.lock` no coincide exactamente con `Cargo.toml`, previniendo que un deploy silenciosamente use versiones distintas.

### R3: Build de producción en CI

El job `Frontend React` de `.github/workflows/ci.yml` ejecuta `npm run build` además de los tests unitarios. Así, un bump de deps que rompe el build de Vercel es detectado en CI antes de mergear.

Comprobación: el workflow post-PR #226 incluye el paso:

```yaml
- name: Build de producción
  run: cd bimex-frontend && npm run build
  env:
    VITE_CONTRACT_ID: PLACEHOLDER_CONTRACT_ID
    VITE_RPC_URL: https://soroban-testnet.stellar.org
    VITE_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015"
```

### R4: Nunca mergear múltiples PRs de dependencias en paralelo

Mergear dos PRs de deps al mismo tiempo (p.ej. `frontend-dependencies` + `indexer-dependencies` en el mismo push) hace que el segundo PR quede desincronizado del lockfile actualizado por el primero. Siempre mergear de forma secuencial y esperar a que CI pase entre merges.

### R5: Regla de revisión de `audit.toml`

Toda adición al bloque `ignore` de `bimex/audit.toml` requiere:

1. Confirmación de que el advisory **no** tiene vector de explotación en el contexto de Bimex (contrato WASM en Soroban).
2. Comentario en el mismo archivo explicando por qué se ignora y referenciando un PR o issue.
3. Revisión en cada actualización de `soroban-sdk` para verificar si el advisory fue resuelto upstream.

---

## 7. Postmortem 2026-07-14

### Resumen ejecutivo

Durante la semana del 14 de julio de 2026, cuatro modos de fallo de dependencias ocurrieron simultáneamente, todos desencadenados por el ciclo semanal de Dependabot. El incidente bloqueó merges durante aproximadamente 48 horas y requirió intervención manual en los PRs #211, #212, #215, #225 y #226.

### Línea de tiempo

| Fecha/Hora (UTC) | Evento |
|---|---|
| 2026-07-14 08:12 | Dependabot abre PRs grupales: `frontend-dependencies` (#209, 8 bumps), `indexer-dependencies` (#210, 4 bumps), `cargo-dependencies` (#211), `actions-dependencies` (#212) |
| 2026-07-14 08:30 | CI del PR #211 falla: `cargo build` roto por `ed25519-dalek 3.0` |
| 2026-07-14 09:15 | CI del PR #212 falla: `cargo audit` detecta `spin 0.9.8` yanked |
| 2026-07-14 11:00 | PR #209 y #210 en conflicto de merge tras hotfix de código en `main` |
| 2026-07-14 14:00 | Intento de `@dependabot rebase` en #209 — fallido (conflicto en lockfile generado) |
| 2026-07-14 16:00 | PR #215 abierto manualmente para reemplazar #209/#210 |
| 2026-07-15 09:00 | PRs #215 y PR para `cargo-dependencies` mergeados |
| 2026-07-15 11:00 | Deploy de Vercel falla post-merge: `@stellar/stellar-sdk` bump rompe vite build |
| 2026-07-15 14:30 | Hotfix en PR #225: revertir SDK, añadir guardrails automáticos |
| 2026-07-16 10:00 | PR #226 mergeado: `npm run build` añadido al job CI; todas las reglas codificadas |

### Causas raíz

| # | Causa | Modo de fallo |
|---|---|---|
| 1 | `ed25519-dalek` publicó breaking change 3.0 dentro de un rango SemVer permisivo | Caso A |
| 2 | `spin 0.9.8` fue yanked sin versión de reemplazo inmediata | Caso B |
| 3 | Hotfix de código en `main` entre apertura y merge del PR de Dependabot desincronizó lockfiles | Caso C |
| 4 | CI no ejecutaba `npm run build`; sólo tests unitarios en Node, no verificaba el bundle de producción | Caso D |

### Factores contribuyentes

- Los cuatro fallos ocurrieron en la misma ventana de Dependabot (lunes de semana), amplificando el impacto.
- No había procedimiento documentado para distinguir cuándo usar `@dependabot rebase` vs. abrir PR propio.
- El CI verde daba falsa confianza para mergear sin verificar el build de deploy.

### Lecciones aprendidas

1. **El CI verde no garantiza que el deploy funcione.** La cobertura del CI debe incluir el paso de build de producción (`vite build`), no sólo los tests unitarios.
2. **Los bumps de dependencias en Rust requieren verificación con `--target wasm32-unknown-unknown`.** El target WASM puede rechazar código que compila en `x86_64-unknown-linux-gnu`.
3. **Dependabot no es suficiente para resolver conflictos complejos de lockfile.** El procedimiento de PR propio debe estar documentado y ser el camino principal cuando `@dependabot rebase` falla.
4. **Los yanks en crates.io no se reflejan en errores de compilación**, sólo en `cargo audit`. Mantener `cargo audit --deny warnings` en CI es crítico.

### Acciones correctivas

| Acción | PR | Estado |
|---|---|---|
| Documentar los cuatro procedimientos de fallo | Este runbook | ✅ Completado |
| Añadir `npm run build` al job CI de frontend | #226 | ✅ Mergeado |
| Confirmar que `--locked` está en deploy-mainnet.sh | #225 | ✅ Verificado |
| Confirmar que `Cargo.lock` y `package-lock.json` están commiteados | #225 | ✅ Verificado |
| Revisar regla de `audit.toml` para nuevas excepciones | #225 | ✅ Codificada |

### Impacto

- **Usuarios:** ninguno. El incidente fue contenido en CI/CD; ningún deploy roto llegó a producción en Mainnet.
- **Desarrollo:** ~48 horas de bloqueo de merges para el equipo.
- **Deuda técnica:** eliminada (las reglas R1–R5 previenen recurrencias estructurales).

---

## Referencias

- PR #211 — fix: `cargo update --precise` para `ed25519-dalek`
- PR #212 — fix: bump `spin` a versión no yanked
- PR #215 — chore: rebase manual de `frontend-dependencies` + `indexer-dependencies`
- PR #225 — chore: guardrails automáticos (lockfiles, `--locked`, reglas de audit)
- PR #226 — ci: añadir `npm run build` al job `Frontend React`
- [`bimex/audit.toml`](../bimex/audit.toml) — lista de advisories ignorados con justificación
- [`.github/dependabot.yml`](../.github/dependabot.yml) — configuración de grupos de Dependabot
- [Runbook: Restore DB](runbook-restore-db.md) — procedimiento de recuperación de base de datos
- [Runbook: Admin Multi-Sig](runbook-admin-multisig.md) — operaciones del contrato
