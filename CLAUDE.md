# Bimex — Contexto del Proyecto

## Qué es Bimex
Plataforma de crowdfunding de impacto social construida sobre Stellar/Soroban. Los contribuidores aportan MXNe (peso mexicano estable) a proyectos; el capital siempre es recuperable. El rendimiento (CETES ~9.45% + AMM Stellar ~4%) financia el proyecto. Al finalizar, cada contribuidor recupera exactamente lo que aportó.

**Deploy:** https://bimex-frontend.vercel.app (Vercel, despliega desde `main`)
**Repo:** https://github.com/David1984TK/Bimex
**Red:** el contrato corre en Testnet y Mainnet según `VITE_NETWORK` (`bimex-frontend/src/stellar/contrato.js`). El piloto real (ver `docs/guia-proyecto-piloto.md`) apunta a Mainnet; no hay una única "rama de trabajo" fija — este repo usa trunk-based development, ver `CONTRIBUTING.md`.

> **Nota de mantenimiento de este archivo:** no listes PRs individuales aquí — con 50+ colaboradores el historial vive en GitHub (`git log --oneline main` o la pestaña Pull Requests), no en este doc. Actualiza solo las secciones de abajo cuando cambie algo estructural (stack, invariantes, convenciones), no cuando se mergee un PR más.

## Stack
- **Smart contract:** Rust / Soroban (Stellar)
- **Frontend:** React + Vite, `bimex-frontend/`
- **Indexer:** Node.js, `bimex-indexer/`
- **Token:** MXNe (Etherfuse)
- **Wallet:** Freighter
- **Deploy:** Vercel (root directory: `bimex-frontend/`)
- **Notificaciones:** Resend + Supabase

## Estructura
```
bimex/                  → Smart contract Rust/Soroban
bimex-frontend/         → React app (Vite)
bimex-indexer/          → Indexer de eventos on-chain
docs/                   → Guías y documentación
scripts/                → Scripts de deploy y prueba
```

## Variables de entorno (bimex-frontend/.env.example)
- `VITE_CONTRACT_ID` — ID del contrato desplegado
- `VITE_RPC_URL` — https://soroban-testnet.stellar.org
- `VITE_TOKEN_MXNE` — dirección token MXNe
- `VITE_ADMIN_ADDRESS` — wallet admin
- `FAUCET_SECRET` (backend) — faucet testnet secret key, never VITE_ prefixed
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — notificaciones
- `VITE_PINATA_API_KEY` / `VITE_PINATA_SECRET` — IPFS (opcional, fallback SHA-256)

## Cómo contribuir
Ver `CONTRIBUTING.md`: trunk-based (ramas cortas directo a `main`, sin `develop`), CI en verde obligatorio antes de mergear, `Closes #NN` en cada PR que resuelve un issue. `.github/CODEOWNERS` define el revisor por defecto.

## Notas importantes
- El contrato almacena `doc_cid: String` (no `BytesN<32>`) desde PR #28
- Si IPFS está configurado: `docCid = "CID1|CID2|CID3"` (3 docs separados por `|`)
- Si Pinata no está configurado: fallback automático a SHA-256 hex
- El root directory de Vercel debe apuntar a `bimex-frontend/` en el dashboard de Vercel
- Admin address en `VITE_ADMIN_ADDRESS` o hardcoded como fallback en `App.jsx`
- `bimex/Cargo.lock` está commiteado a propósito (reproducibilidad de builds) — no lo agregues a `.gitignore`. CI corre `cargo test`/`cargo audit` sin `--locked`, así que un `cargo update` local antes de un PR puede cambiar versiones; verifica con `cargo test --locked` que el lock commiteado sigue siendo válido.
- Tests del contrato: `cd bimex && cargo test` (64 tests a la fecha de este doc, 0 failures)

## Pendientes conocidos
- **Issue #145 (seguridad, abierto):** `VITE_PINATA_SECRET` se bundlea en el JS público del frontend (`bimex-frontend/src/utils/ipfs.js`). Falta mover el upload a un proxy backend en `bimex-indexer`. Un intento previo (PR #200) se cerró sin mergear.
- **Branch protection en `main`:** no está configurado vía este repo (requiere acceso admin en GitHub Settings, fuera del alcance de las herramientas de Claude Code). Recomendado: requerir CI verde + review de CODEOWNERS antes de mergear.
