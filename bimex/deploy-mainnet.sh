#!/usr/bin/env bash
# =============================================================================
# deploy-mainnet.sh — Despliega el contrato Bimex en Stellar Mainnet
# =============================================================================
# Uso:
#   export ADMIN_SECRET=S...          # Clave secreta de la cuenta admin
#   export MAINNET_RPC_URL=https://...# URL del RPC de Mainnet (con API key)
#   export TOKEN_MXNE=C...            # Contract ID del token MXNe en Mainnet
#   export YIELD_CETES_BPS=945        # ~9.45% APY en bps (100 bps = 1%)
#   export YIELD_AMM_BPS=400          # ~4.00% APY en bps
#   bash deploy-mainnet.sh
# =============================================================================
set -euo pipefail

# ── Validar variables requeridas ──────────────────────────────────────────────
: "${ADMIN_SECRET:?Falta ADMIN_SECRET}"
: "${MAINNET_RPC_URL:?Falta MAINNET_RPC_URL}"
: "${TOKEN_MXNE:?Falta TOKEN_MXNE}"
: "${YIELD_CETES_BPS:=945}"
: "${YIELD_AMM_BPS:=400}"

# Official MXNe Mainnet Soroban contract (issuer: brale.xyz / Etherfuse)
# Verify at: https://stellar.expert/explorer/public/contract/CAPW7JXJ6H6SGJ5MVM25356FAYOVT3ICZUIZRT4KGZHLUNMTWNMUI3RM
: "${TOKEN_MXNE:=CAPW7JXJ6H6SGJ5MVM25356FAYOVT3ICZUIZRT4KGZHLUNMTWNMUI3RM}"

NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
WASM_PATH="target/wasm32v1-none/release/bimex.wasm"

echo "============================================================"
echo " Bimex — Despliegue en Stellar Mainnet"
echo "============================================================"

# ── 1. Verificar Stellar CLI ──────────────────────────────────────────────────
if ! command -v stellar &>/dev/null; then
  echo "[1/5] Instalando Stellar CLI..."
  cargo install --locked stellar-cli --features opt
else
  echo "[1/5] Stellar CLI: $(stellar --version)"
fi

# ── 2. Compilar contrato ──────────────────────────────────────────────────────
echo "[2/5] Compilando contrato (release optimizado)..."
cargo build --release --target wasm32v1-none

WASM_SIZE=$(wc -c < "$WASM_PATH")
echo "      WASM size: ${WASM_SIZE} bytes"
if [ "$WASM_SIZE" -gt 65536 ]; then
  echo "ERROR: WASM supera 64KB (${WASM_SIZE} bytes). Optimiza con wasm-opt."
  exit 1
fi

# ── 3. Derivar clave pública del admin ────────────────────────────────────────
ADMIN_PUBLIC=$(stellar keys address --secret-key "$ADMIN_SECRET" 2>/dev/null || \
  stellar keys generate --secret-key "$ADMIN_SECRET" --no-fund mainnet-admin 2>/dev/null && \
  stellar keys address mainnet-admin)

echo "[3/5] Admin: $ADMIN_PUBLIC"

# ── 4. Subir WASM a Mainnet ───────────────────────────────────────────────────
echo "[4/5] Subiendo WASM a Mainnet..."
WASM_HASH=$(stellar contract upload \
  --wasm "$WASM_PATH" \
  --source-account "$ADMIN_SECRET" \
  --rpc-url "$MAINNET_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "      WASM Hash: $WASM_HASH"

# ── 5. Desplegar instancia del contrato ───────────────────────────────────────
echo "[5/5] Desplegando instancia del contrato..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source-account "$ADMIN_SECRET" \
  --rpc-url "$MAINNET_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "      Contract ID: $CONTRACT_ID"

# ── 6. Inicializar contrato ───────────────────────────────────────────────────
echo "[6/6] Inicializando contrato con tasas reales..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$ADMIN_SECRET" \
  --rpc-url "$MAINNET_RPC_URL" \
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
  --source-account "$ADMIN_SECRET" \
  --rpc-url "$MAINNET_RPC_URL" \
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
echo " DESPLIEGUE EXITOSO"
echo "============================================================"
echo " Contract ID : $CONTRACT_ID"
echo " WASM Hash   : $WASM_HASH"
echo " Admin       : $ADMIN_PUBLIC"
echo " Token MXNe  : $TOKEN_MXNE"
echo " Yield CETES : ${YIELD_CETES_BPS} bps"
echo " Yield AMM   : ${YIELD_AMM_BPS} bps"
echo " Explorer    : https://stellar.expert/explorer/public/contract/$CONTRACT_ID"
echo "============================================================"
echo ""
echo "Actualiza bimex-frontend/.env.production con:"
echo "  VITE_CONTRACT_ID=$CONTRACT_ID"
echo "  VITE_RPC_URL=$MAINNET_RPC_URL"
echo "  VITE_TOKEN_MXNE=$TOKEN_MXNE"
echo "  VITE_NETWORK=mainnet"
