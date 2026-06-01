#!/usr/bin/env bash
# =============================================================================
# deploy-staging.sh — Despliega el contrato Bimex en Testnet para Staging
# =============================================================================
# Uso:
#   export STAGING_ADMIN_SECRET=S...  # Clave secreta de la cuenta admin staging
#   export TOKEN_MXNE=C...            # Contract ID del token MXNe en Testnet
#   export YIELD_CETES_BPS=945        # ~9.45% APY en bps (100 bps = 1%)
#   export YIELD_AMM_BPS=400          # ~4.00% APY en bps
#   bash scripts/deploy-staging.sh
# =============================================================================
set -euo pipefail

# ── Validar variables requeridas ──────────────────────────────────────────────
: "${STAGING_ADMIN_SECRET:?Falta STAGING_ADMIN_SECRET}"
: "${YIELD_CETES_BPS:=945}"
: "${YIELD_AMM_BPS:=400}"

# Testnet MXNe token (same as dev)
: "${TOKEN_MXNE:=CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4P}"

NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
WASM_PATH="bimex/target/wasm32v1-none/release/bimex.wasm"

echo "============================================================"
echo " Bimex — Despliegue en Testnet (Staging)"
echo "============================================================"

# ── 1. Verificar Stellar CLI ──────────────────────────────────────────────────
if ! command -v stellar &>/dev/null; then
  echo "[1/6] Instalando Stellar CLI..."
  cargo install --locked stellar-cli --features opt
else
  echo "[1/6] Stellar CLI: $(stellar --version)"
fi

# ── 2. Compilar contrato ──────────────────────────────────────────────────────
echo "[2/6] Compilando contrato (release optimizado)..."
cd bimex
cargo build --release --target wasm32v1-none
cd ..

WASM_SIZE=$(wc -c < "$WASM_PATH")
echo "      WASM size: ${WASM_SIZE} bytes"
if [ "$WASM_SIZE" -gt 65536 ]; then
  echo "ERROR: WASM supera 64KB (${WASM_SIZE} bytes). Optimiza con wasm-opt."
  exit 1
fi

# ── 3. Derivar clave pública del admin ────────────────────────────────────────
ADMIN_PUBLIC=$(stellar keys address --secret-key "$STAGING_ADMIN_SECRET" 2>/dev/null || \
  stellar keys generate --secret-key "$STAGING_ADMIN_SECRET" --no-fund staging-admin 2>/dev/null && \
  stellar keys address staging-admin)

echo "[3/6] Staging Admin: $ADMIN_PUBLIC"

# ── 4. Subir WASM a Testnet ───────────────────────────────────────────────────
echo "[4/6] Subiendo WASM a Testnet..."
WASM_HASH=$(stellar contract upload \
  --wasm "$WASM_PATH" \
  --source-account "$STAGING_ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "      WASM Hash: $WASM_HASH"

# ── 5. Desplegar instancia del contrato ───────────────────────────────────────
echo "[5/6] Desplegando instancia del contrato..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source-account "$STAGING_ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "      Contract ID: $CONTRACT_ID"

# ── 6. Inicializar contrato ───────────────────────────────────────────────────
echo "[6/6] Inicializando contrato..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$STAGING_ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- inicializar \
  --admin "$ADMIN_PUBLIC" \
  --token_mxne "$TOKEN_MXNE" \
  --yield_cetes_bps "$YIELD_CETES_BPS" \
  --yield_amm_bps "$YIELD_AMM_BPS"

# ── 7. Verificar despliegue ───────────────────────────────────────────────────
echo ""
echo "Verificando total_proyectos..."
TOTAL=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$STAGING_ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- total_proyectos)

if [ "$TOTAL" = "0" ]; then
  echo "✓ Verificación exitosa: total_proyectos = 0"
else
  echo "ADVERTENCIA: total_proyectos = $TOTAL (esperado: 0)"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " DESPLIEGUE STAGING EXITOSO"
echo "============================================================"
echo " Contract ID : $CONTRACT_ID"
echo " WASM Hash   : $WASM_HASH"
echo " Admin       : $ADMIN_PUBLIC"
echo " Token MXNe  : $TOKEN_MXNE"
echo " Yield CETES : ${YIELD_CETES_BPS} bps"
echo " Yield AMM   : ${YIELD_AMM_BPS} bps"
echo " Explorer    : https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "============================================================"
echo ""
echo "Actualiza bimex-frontend/.env.staging con:"
echo "  VITE_CONTRACT_ID=$CONTRACT_ID"
echo "  VITE_ADMIN_ADDRESS=$ADMIN_PUBLIC"
echo ""
echo "Luego despliega en Vercel:"
echo "  vercel --prod --env VITE_CONTRACT_ID=$CONTRACT_ID"
