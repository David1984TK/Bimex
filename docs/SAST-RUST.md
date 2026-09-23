# SAST para el contrato Rust/Soroban

Este documento justifica y describe el análisis estático de seguridad (SAST)
aplicado al contrato Soroban en `bimex/`, y complementa a `docs/THREAT-MODEL.md`
y `docs/AUDITORIA.md`.

## Contexto

- `.github/workflows/ci.yml` configura **CodeQL solo con `languages: javascript`**,
  por lo que no analiza el contrato Rust.
- El job `contract` ya corre `cargo test`, `cargo build` (wasm), `cargo audit`
  (vulnerabilidades de dependencias) y `cargo clippy -- -D warnings`.
- `cargo audit` cubre **dependencias**, no la lógica propia del contrato. Este
  documento cubre ese hueco.

## Opciones evaluadas

| Opción | Qué analiza | Resultado de la evaluación |
| --- | --- | --- |
| **cargo-geiger** | Conteo de bloques `unsafe` por crate. | **Descartada.** Los contratos Soroban compilan a wasm `no_std` y el SDK no permite `unsafe` en el contrato; geiger reportaría 0 y aportaría señal casi nula. |
| **cargo-deny** | Advisory DB, licencias, bans y fuentes (supply chain). | **No elegida** (complementaria). Se solapa en gran medida con `cargo-audit`, que ya corre en CI, y no analiza la lógica propia. |
| **MIRAI / Rudra** | Análisis formal / memoria insegura. | **Descartadas.** Requieren nightly y/o están sin mantenimiento; no son aptas para un CI estable. |
| **Clippy con lints de seguridad** | Patrones de la lógica propia (código sin terminar, debug, etc.) más `clippy::all`. | **Elegida.** Corre en la toolchain estable, sin instalar nada extra, y analiza el código propio. |

## Decisión

Se adopta **Clippy con un conjunto explícito de lints de seguridad** encima de
`-D warnings`, ejecutado en un workflow dedicado que solo se dispara cuando
cambia `bimex/**`:

```bash
cd bimex && cargo clippy --locked -- -D warnings \
  -D clippy::todo \
  -D clippy::unimplemented \
  -D clippy::dbg_macro \
  -D clippy::print_stdout
```

Estos lints fallan el build ante:

- `todo!` / `unimplemented!` — lógica sin terminar que no debe llegar a un
  contrato que maneja fondos reales.
- `dbg!` — salidas de depuración olvidadas.
- `println!` / `print_stdout` — impresión a stdout, sin sentido (y no capturada)
  dentro de un contrato wasm.

`clippy::all` ya viene cubierto por `-D warnings`; el conjunto anterior añade
las comprobaciones específicas de seguridad de arriba.

### Por qué no `unwrap_used` / `expect_used`

Se evaluaron, pero el contrato usa `unwrap()`/`expect()` de forma deliberada
p.ej. al leer del storage (`env.storage()...`), lo que generaría decenas de
falsos positivos y obligaría a un refactor grande fuera del alcance de este
cambio. Queda como mejora futura si se migra a un manejo de errores explícito.

## Ejecución en CI

Workflow: `.github/workflows/rust-sast.yml`.

- Se dispara en `pull_request` y `push` a `main` con `paths: ['bimex/**']`, es
  decir, en cada PR que toca el contrato (criterio de aceptación del issue #335)
  sin ralentizar PRs que no tocan Rust.
- Cachea el build con `Swatinem/rust-cache` y usa la toolchain estable.

## Reproducir localmente

```bash
cd bimex
cargo clippy --locked -- -D warnings \
  -D clippy::todo -D clippy::unimplemented -D clippy::dbg_macro -D clippy::print_stdout
```

## Limitaciones y trabajo futuro

- SAST basado en lints no sustituye a una auditoría manual ni a análisis formal;
  complementa a `cargo-audit` (dependencias) y a la revisión humana del
  `docs/AUDITORIA.md`.
- Si en el futuro el contrato deja de ser `no_std` puro o requiere `unsafe`,
  conviene reevaluar `cargo-geiger`.
- Endurecer progresivamente los lints (p.ej. `clippy::arithmetic_side_effects`,
  `clippy::unwrap_used`) a medida que se refactorice el manejo de errores.
