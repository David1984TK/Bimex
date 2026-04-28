# Script para calcular el hash SHA-256 de un documento
# Uso: .\scripts\calcular-hash-documento.ps1 <archivo>

param(
    [Parameter(Mandatory=$true)]
    [string]$Archivo
)

if (-not (Test-Path $Archivo)) {
    Write-Host "❌ Error: El archivo '$Archivo' no existe" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CALCULAR HASH SHA-256" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivo: $Archivo"
Write-Host ""

# Calcular hash
$hash = Get-FileHash -Path $Archivo -Algorithm SHA256
$hashValue = $hash.Hash.ToLower()

Write-Host "Hash SHA-256:"
Write-Host $hashValue -ForegroundColor Green
Write-Host ""

# Convertir a formato para el contrato (0x prefix)
$hashHex = "0x$hashValue"

Write-Host "Hash para el contrato (32 bytes hex):"
Write-Host $hashHex -ForegroundColor Yellow
Write-Host ""

# Verificar longitud (debe ser 64 caracteres hex = 32 bytes)
$hashLength = $hashValue.Length
if ($hashLength -ne 64) {
    Write-Host "⚠️  Advertencia: El hash no tiene 64 caracteres (tiene $hashLength)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Hash válido (64 caracteres hex = 32 bytes)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Guarda este hash en un lugar seguro"
Write-Host "2. Úsalo al crear el proyecto con:"
Write-Host ""
Write-Host "   `$env:DOC_HASH = '$hashHex'" -ForegroundColor Yellow
Write-Host "   .\scripts\crear-proyecto-piloto.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Sube el documento a IPFS:"
Write-Host "   - Pinata: https://pinata.cloud"
Write-Host "   - IPFS CLI: ipfs add $Archivo"
Write-Host ""
Write-Host "4. Guarda el CID de IPFS en docs/proyecto-piloto-tracking.md"
Write-Host ""
