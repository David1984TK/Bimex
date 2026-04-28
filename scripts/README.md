# Scripts de Ayuda - Proyecto Piloto

Scripts para facilitar el lanzamiento del primer proyecto real en Mainnet.

## Requisitos

- Stellar CLI instalado: `cargo install --locked stellar-cli --features opt`
- Bash shell (Linux, macOS, Git Bash en Windows)
- Variables de entorno configuradas

## Scripts disponibles

### 1. calcular-hash-documento.sh / .ps1

Calcula el hash SHA-256 de un documento para almacenar en el contrato.

**Uso en Linux/macOS:**
```bash
bash scripts/calcular-hash-documento.sh plan-proyecto.pdf
```

**Uso en Windows (PowerShell):**
```powershell
# Opción 1: Usar el script (si está habilitado)
.\scripts\calcular-hash-documento.ps1 plan-proyecto.pdf

# Opción 2: Comando directo (siempre funciona)
$hash = (Get-FileHash -Path plan-proyecto.pdf -Algorithm SHA256).Hash.ToLower()
Write-Host "Hash SHA-256: $hash"
Write-Host "Para el contrato: 0x$hash"
```

**Output:**
```
Hash SHA-256:
a1b2c3d4e5f6...

Hash para el contrato (32 bytes hex):
0xa1b2c3d4e5f6...
```

**Siguiente paso:**
```bash
# Linux/macOS
export DOC_HASH=0xa1b2c3d4e5f6...

# Windows PowerShell
$env:DOC_HASH = "0xa1b2c3d4e5f6..."
```

---

### 2. crear-proyecto-piloto.sh

Crea el proyecto piloto en Mainnet de forma interactiva.

**Variables requeridas:**
```bash
export CONTRACT_ID=C...  # Contract ID de Mainnet
export DUENO_SECRET=S... # Secret key del dueño del proyecto
```

**Uso:**
```bash
bash scripts/crear-proyecto-piloto.sh
```

**Prompts interactivos:**
- Nombre del proyecto
- Meta en MXN (ej. 100000)
- Hash SHA-256 del documento

**Output:**
- ID del proyecto asignado
- TX hash de creación
- Comando para que el admin apruebe

**Ejemplo completo:**
```bash
# 1. Configurar variables
export CONTRACT_ID=CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T
export DUENO_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# 2. Ejecutar script
bash scripts/crear-proyecto-piloto.sh

# Prompts:
# Nombre del proyecto: Escuela Rural Oaxaca
# Meta en MXN: 100000
# Hash SHA-256: 0xa1b2c3d4e5f6...
# ¿Confirmar? (y/n): y

# Output:
# ✅ Proyecto creado exitosamente
# ID del proyecto: 0
# TX hash: [buscar en Explorer]
```

---

### 3. aprobar-proyecto-piloto.sh

Aprueba el proyecto piloto (solo admin).

**Variables requeridas:**
```bash
export CONTRACT_ID=C...  # Contract ID de Mainnet
export ADMIN_SECRET=S... # Secret key del admin
```

**Uso:**
```bash
bash scripts/aprobar-proyecto-piloto.sh
```

**Prompts interactivos:**
- ID del proyecto a aprobar

**Output:**
- Confirmación de aprobación
- TX hash de aprobación

**Ejemplo completo:**
```bash
# 1. Configurar variables
export CONTRACT_ID=CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T
export ADMIN_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# 2. Ejecutar script
bash scripts/aprobar-proyecto-piloto.sh

# Prompts:
# ID del proyecto a aprobar: 0
# ¿Confirmar? (y/n): y

# Output:
# ✅ Proyecto aprobado exitosamente
# El proyecto ahora puede recibir contribuciones
```

---

## Flujo completo

### Paso 1: Preparar documentos

```bash
# Calcular hash del documento
bash scripts/calcular-hash-documento.sh plan-proyecto.pdf

# Guardar el hash
export DOC_HASH=0xa1b2c3d4e5f6...

# Subir a IPFS (Pinata o CLI)
ipfs add plan-proyecto.pdf
# Guardar el CID
```

### Paso 2: Crear proyecto

```bash
# Configurar variables
export CONTRACT_ID=C...
export DUENO_SECRET=S...

# Crear proyecto
bash scripts/crear-proyecto-piloto.sh

# Guardar ID del proyecto y TX hash
```

### Paso 3: Aprobar proyecto

```bash
# Configurar variables
export CONTRACT_ID=C...
export ADMIN_SECRET=S...

# Aprobar proyecto
bash scripts/aprobar-proyecto-piloto.sh

# Guardar TX hash de aprobación
```

### Paso 4: Verificar

```bash
# Verificar en Stellar Explorer
# https://stellar.expert/explorer/public/contract/[CONTRACT_ID]

# Verificar en frontend
# https://bimex-frontend.vercel.app
```

---

## Troubleshooting

### Error: "stellar CLI no está instalado"

**Solución:**
```bash
cargo install --locked stellar-cli --features opt
```

### Error: "Variable CONTRACT_ID no está definida"

**Solución:**
```bash
export CONTRACT_ID=CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T
```

### Error: "insufficient balance"

**Solución:**
- Verificar que la cuenta tiene suficiente XLM para fees
- Fondear con al menos 5 XLM

### Error: "No se encontró sha256sum ni shasum"

**Solución en Windows:**
```bash
# Usar Git Bash o instalar sha256sum
# Alternativa: usar PowerShell
Get-FileHash plan-proyecto.pdf -Algorithm SHA256
```

### Error: "Proyecto no existe"

**Solución:**
- Verificar que el ID del proyecto es correcto
- Verificar que estás en la red correcta (Mainnet)

---

## Seguridad

⚠️ **IMPORTANTE**: Nunca commitear secret keys al repositorio

- Usar variables de entorno para secrets
- No guardar secrets en archivos de texto
- Los scripts limpian keypairs temporales automáticamente
- Verificar que `.gitignore` incluye archivos sensibles

---

## Próximos pasos

Después de ejecutar estos scripts:

1. Actualizar `docs/proyecto-piloto-tracking.md` con:
   - ID del proyecto
   - TX hashes
   - Dirección del dueño
   - CID de IPFS

2. Publicar anuncios en redes sociales (usar templates en `docs/templates-comunicacion-piloto.md`)

3. Monitorear contribuciones y actualizar métricas

4. Documentar caso de éxito cuando se complete

---

**Última actualización**: 2026-04-28  
**Mantenedor**: Equipo Bimex
