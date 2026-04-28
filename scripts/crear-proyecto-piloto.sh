#!/bin/bash

# Script para crear el proyecto piloto en Mainnet
# Uso: bash scripts/crear-proyecto-piloto.sh

set -e

echo "=========================================="
echo "  CREAR PROYECTO PILOTO EN MAINNET"
echo "=========================================="
echo ""

# Verificar que stellar CLI está instalado
if ! command -v stellar &> /dev/null; then
    echo "❌ Error: stellar CLI no está instalado"
    echo "Instalar con: cargo install --locked stellar-cli --features opt"
    exit 1
fi

echo "✅ stellar CLI encontrado"
echo ""

# Verificar variables de entorno
if [ -z "$CONTRACT_ID" ]; then
    echo "❌ Error: Variable CONTRACT_ID no está definida"
    echo "Exportar con: export CONTRACT_ID=C..."
    exit 1
fi

if [ -z "$DUENO_SECRET" ]; then
    echo "❌ Error: Variable DUENO_SECRET no está definida"
    echo "Exportar con: export DUENO_SECRET=S..."
    exit 1
fi

echo "✅ Variables de entorno configuradas"
echo ""

# Solicitar información del proyecto
echo "Ingresa la información del proyecto:"
echo ""

read -p "Nombre del proyecto: " NOMBRE
read -p "Meta en MXN (ej. 100000): " META_MXN
read -p "Hash SHA-256 del documento (32 bytes hex): " DOC_HASH

# Validar inputs
if [ -z "$NOMBRE" ]; then
    echo "❌ Error: El nombre no puede estar vacío"
    exit 1
fi

if [ -z "$META_MXN" ]; then
    echo "❌ Error: La meta no puede estar vacía"
    exit 1
fi

if [ -z "$DOC_HASH" ]; then
    echo "❌ Error: El hash del documento no puede estar vacío"
    exit 1
fi

# Convertir MXN a stroops (7 decimales)
META_STROOPS=$((META_MXN * 10000000))

echo ""
echo "=========================================="
echo "  RESUMEN"
echo "=========================================="
echo "Nombre: $NOMBRE"
echo "Meta: $META_MXN MXN ($META_STROOPS stroops)"
echo "Doc hash: $DOC_HASH"
echo "Contract ID: $CONTRACT_ID"
echo ""

read -p "¿Confirmar creación del proyecto? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🚀 Creando proyecto en Mainnet..."
echo ""

# Importar keypair del dueño (temporal)
stellar keys add dueno-temp --secret-key "$DUENO_SECRET" 2>/dev/null || true

# Obtener dirección del dueño
DUENO_ADDRESS=$(stellar keys address dueno-temp)

echo "Dirección del dueño: $DUENO_ADDRESS"
echo ""

# Crear proyecto
TX_RESULT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source dueno-temp \
  --network mainnet \
  -- crear_proyecto \
  --dueno "$DUENO_ADDRESS" \
  --nombre "$NOMBRE" \
  --meta "$META_STROOPS" \
  --doc_hash "$DOC_HASH")

echo ""
echo "✅ Proyecto creado exitosamente"
echo ""
echo "Resultado: $TX_RESULT"
echo ""

# Extraer ID del proyecto (asumiendo que retorna el ID)
PROYECTO_ID=$(echo "$TX_RESULT" | grep -oP '\d+' | head -1)

if [ -n "$PROYECTO_ID" ]; then
    echo "ID del proyecto: $PROYECTO_ID"
    echo ""
    echo "Próximo paso: El admin debe aprobar el proyecto con:"
    echo ""
    echo "stellar contract invoke \\"
    echo "  --id $CONTRACT_ID \\"
    echo "  --source admin \\"
    echo "  --network mainnet \\"
    echo "  -- admin_aprobar \\"
    echo "  --id_proyecto $PROYECTO_ID"
    echo ""
fi

# Limpiar keypair temporal
stellar keys remove dueno-temp 2>/dev/null || true

echo "=========================================="
echo "  PROYECTO CREADO"
echo "=========================================="
echo ""
echo "Actualizar docs/proyecto-piloto-tracking.md con:"
echo "- ID del proyecto: $PROYECTO_ID"
echo "- TX hash: [buscar en Stellar Explorer]"
echo "- Dirección del dueño: $DUENO_ADDRESS"
echo ""
