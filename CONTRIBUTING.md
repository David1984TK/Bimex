# Contribuir a Bimex

Gracias por aportar. Bimex recibe contribuciones de mucha gente distinta (waves, bounties, colaboradores puntuales), así que estas reglas existen para que tu PR se pueda revisar y mergear rápido sin ida y vuelta.

## Antes de abrir un PR

1. **Parte siempre de `main` actualizado** (`git pull origin main` antes de crear tu rama). No existe una rama `develop` de larga duración — este repo usa trunk-based development: ramas cortas, directo a `main`.
2. **Un PR, un cambio.** PRs pequeños y enfocados se revisan y mergean más rápido que uno grande que toca contrato + frontend + indexer a la vez.
3. Verifica localmente antes de abrir el PR:
   ```bash
   # Contrato (si tocaste bimex/)
   cd bimex && cargo test && cargo clippy -- -D warnings

   # Frontend (si tocaste bimex-frontend/)
   cd bimex-frontend && npm run lint && npm run test:run && npm run build

   # Indexer (si tocaste bimex-indexer/)
   cd bimex-indexer && npm test
   ```

## Al abrir el PR

- Usa la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`) — no la borres.
- **Si tu PR resuelve un issue, escribe `Closes #NN` en la descripción.** GitHub cierra el issue automáticamente al mergear. Si tu cambio es una versión adaptada/reaplicada del trabajo de otra persona (ver sección siguiente), el `Closes #NN` debe ir en **tu** PR, no solo en el original.
- El CI (`Contrato Soroban`, `Frontend React`, `Indexer Node.js`, `CodeQL`, y `Playwright E2E` si aplica) debe estar en verde antes de pedir review. Un PR con CI en rojo no se mergea, sin excepciones — mergear con CI roto rompe `main`, que despliega automáticamente a producción vía Vercel.
- Si tu rama quedó atrás de `main`, actualízala (rebase o merge) antes de pedir review — no dejes que se acumulen conflictos.

## Si tu PR no se puede mergear directo

A veces un PR llega con conflictos o queda desactualizado antes de revisarse, y el mantenedor reaplica el cambio en un PR nuevo en vez de resolver conflictos sobre el tuyo. Si eso pasa con tu contribución, seguís apareciendo como autor original en el historial de commits y se te agradece explícitamente en el PR/issue relacionado — no se pierde el crédito, pero si puedes, prioriza mantener tu rama actualizada para evitar que esto sea necesario.

## Dependencias (Dependabot)

Los PRs de Dependabot (`bimex/Cargo.toml`, `bimex-frontend/package.json`, `bimex-indexer/package.json`, `.github/workflows/`) se revisan igual que cualquier otro PR: CI en verde antes de mergear. Si un bump rompe CI:
- Si el fix es simple (pin de una sub-dependencia, ajuste de import), corrígelo en la misma rama del PR de Dependabot y push.
- Si el bump expone un bug real de una dependencia (ej. incompatibilidad entre crates transitivos), documenta el hallazgo en el PR y decide si mergear con un pin manual o esperar un patch upstream — no fuerces el merge con CI en rojo.
- `bimex/Cargo.lock` está commiteado a propósito para reproducibilidad — no lo agregues a `.gitignore`.

## Contrato Soroban

El contrato maneja fondos reales (o en camino a Mainnet). Cambios en `bimex/contracts/` requieren:
- Tests nuevos o actualizados para cualquier cambio de lógica.
- `cargo clippy -- -D warnings` limpio.
- Si el cambio afecta invariantes del contrato, actualiza `docs/CONTRACT-INVARIANTS.md`.

## Dudas

Abre un issue con la etiqueta `question`, o revisa `CLAUDE.md` para contexto general del proyecto y `docs/` para guías específicas.
