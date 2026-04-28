#!/bin/bash

# Script para calcular el hash SHA-256 de un documento
# Uso: bash scripts/calcular-hash-documento.sh <archivo>

set -e

if [ -z "$1" ]; then
    echo "Uso: bash scripts/calcular-hash-documento.sh <archivo>"
    echo ""
    echo "Ejemplo:"
    echo "  bash scripts/calcular-hash-documento.sh plan-proyecto.pdf"
    exit 1
fi

ARCHIVO="$1"

if [ ! -f "$ARCHIVO" ]; then
    echo "❌ Error: El archivo '$ARCHIVO' no existe"
    exit 1
fi

echo "=========================================="
echo "  CALCULAR HASH SHA-256"
echo "=========================================="
echo ""
echo "Archivo: $ARCHIVO"
echo ""

# Calcular hash según el sistema operativo
if command -v sha256sum &> /dev/null; then
    # Linux
    HASH=$(sha256sum "$ARCHIVO" | awk '{print $1}')
elif command -v shasum &> /dev/null; then
    # macOS
    HASH=$(shasum -a 256 "$ARCHIVO" | awk '{print $1}')
else
    echo "❌ Error: No se encontró sha256sum ni shasum"
    exit 1
fi

echo "Hash SHA-256:"
echo "$HASH"
echo ""

# Convertir a formato para el contrato (0x prefix)
HASH_HEX="0x$HASH"

echo "Hash para el contrato (32 bytes hex):"
echo "$HASH_HEX"
echo ""

# Verificar longitud (debe ser 64 caracteres hex = 32 bytes)
HASH_LENGTH=${#HASH}
if [ "$HASH_LENGTH" -ne 64 ]; then
    echo "⚠️  Advertencia: El hash no tiene 64 caracteres (tiene $HASH_LENGTH)"
else
    echo "✅ Hash válido (64 caracteres hex = 32 bytes)"
fi

echo ""
echo "=========================================="
echo "  INSTRUCCIONES"
echo "=========================================="
echo ""
echo "1. Guarda este hash en un lugar seguro"
echo "2. Úsalo al crear el proyecto con:"
echo ""
echo "   export DOC_HASH=$HASH_HEX"
echo "   bash scripts/crear-proyecto-piloto.sh"
echo ""
echo "3. Sube el documento a IPFS:"
echo "   - Pinata: https://pinata.cloud"
echo "   - IPFS CLI: ipfs add $ARCHIVO"
echo ""
echo "4. Guarda el CID de IPFS en docs/proyecto-piloto-tracking.md"
echo ""
