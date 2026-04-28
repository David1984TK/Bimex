#!/bin/bash

# Script para aprobar el proyecto piloto (solo admin)
# Uso: bash scripts/aprobar-proyecto-piloto.sh

set -e

echo "=========================================="
echo "  APROBAR PROYECTO PILOTO (ADMIN)"
echo "=========================================="
echo ""

# Verificar que stellar CLI está instalado
if ! command -v stellar &> /dev/null; then
    echo "❌ Error: stellar CLI no está instalado"
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

if [ -z "$ADMIN_SECRET" ]; then
    echo "❌ Error: Variable ADMIN_SECRET no está definida"
    echo "Exportar con: export ADMIN_SECRET=S..."
    exit 1
fi

echo "✅ Variables de entorno configuradas"
echo ""

# Solicitar ID del proyecto
read -p "ID del proyecto a aprobar: " PROYECTO_ID

if [ -z "$PROYECTO_ID" ]; then
    echo "❌ Error: El ID del proyecto no puede estar vacío"
    exit 1
fi

echo ""
echo "=========================================="
echo "  RESUMEN"
echo "=========================================="
echo "Proyecto ID: $PROYECTO_ID"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Obtener información del proyecto
echo "Obteniendo información del proyecto..."
echo ""

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source admin-temp \
  --network mainnet \
  -- obtener_proyecto \
  --id "$PROYECTO_ID" 2>/dev/null || echo "No se pudo obtener info del proyecto"

echo ""
read -p "¿Confirmar aprobación del proyecto? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🚀 Aprobando proyecto en Mainnet..."
echo ""

# Importar keypair del admin (temporal)
stellar keys add admin-temp --secret-key "$ADMIN_SECRET" 2>/dev/null || true

# Aprobar proyecto
TX_RESULT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source admin-temp \
  --network mainnet \
  -- admin_aprobar \
  --id_proyecto "$PROYECTO_ID")

echo ""
echo "✅ Proyecto aprobado exitosamente"
echo ""
echo "Resultado: $TX_RESULT"
echo ""

# Limpiar keypair temporal
stellar keys remove admin-temp 2>/dev/null || true

echo "=========================================="
echo "  PROYECTO APROBADO"
echo "=========================================="
echo ""
echo "El proyecto ahora está en estado EtapaInicial y puede recibir contribuciones."
echo ""
echo "Próximos pasos:"
echo "1. Actualizar docs/proyecto-piloto-tracking.md"
echo "2. Publicar anuncio en redes sociales"
echo "3. Enviar email a lista de contactos"
echo ""
