# Plan de Recuperación ante Desastres (Disaster Recovery)

## Resumen

Este documento describe los procedimientos para recuperar datos del indexer de Bimex en caso de pérdida de datos en Supabase. El sistema incluye:

- **Backup automático**: Exportación diaria de todas las tablas
- **Re-indexación**: Reconstrucción completa desde blockchain
- **Restauración**: Recuperación desde backups

## 🎯 Escenarios de Recuperación

### Escenario 1: Pérdida Total de Datos en Supabase
**Solución**: Re-indexar desde blockchain (fuente de verdad)

### Escenario 2: Corrupción Parcial de Datos
**Solución**: Restaurar desde backup más reciente

### Escenario 3: Error Humano (borrado accidental)
**Solución**: Restaurar tabla específica desde backup

## 📦 Sistema de Backup

### Configuración

Agregar a `.env`:
```bash
BACKUP_DIR=./backups  # Directorio para almacenar backups
```

### Backup Manual

```bash
cd bimex-indexer
bash scripts/backup.sh
```

**Salida**:
```
🔄 Starting Bimex backup at 2025-05-29 14:30:22
📁 Backup location: ./backups/20250529_143022

📊 Exporting table: proyectos
✅ Exported 15 records from proyectos

📊 Exporting table: aportaciones
✅ Exported 42 records from aportaciones

📊 Exporting table: eventos
✅ Exported 128 records from eventos

✅ Backup completed successfully
📦 Total size: 2.4M
📁 Location: ./backups/20250529_143022
```

### Backup Automático (Cron)

Para configurar backup diario a las 2 AM:

```bash
# Editar crontab
crontab -e

# Agregar línea:
0 2 * * * cd /path/to/bimex-indexer && bash scripts/backup.sh >> logs/backup.log 2>&1
```

**Alternativa con systemd timer** (Linux):

```ini
# /etc/systemd/system/bimex-backup.service
[Unit]
Description=Bimex Indexer Backup

[Service]
Type=oneshot
WorkingDirectory=/path/to/bimex-indexer
ExecStart=/bin/bash scripts/backup.sh
User=bimex
```

```ini
# /etc/systemd/system/bimex-backup.timer
[Unit]
Description=Daily Bimex Backup

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Activar:
```bash
sudo systemctl enable bimex-backup.timer
sudo systemctl start bimex-backup.timer
```

### Estructura de Backup

```
backups/
└── 20250529_143022/
    ├── metadata.json      # Información del backup
    ├── proyectos.json     # Tabla proyectos
    ├── aportaciones.json  # Tabla aportaciones
    └── eventos.json       # Tabla eventos
```

## 🔄 Re-indexación desde Blockchain

### Cuándo Usar

- Pérdida total de datos en Supabase
- Datos corruptos sin backup confiable
- Migración a nueva base de datos
- Verificación de integridad de datos

### Procedimiento Completo

#### 1. Verificar Configuración

```bash
cd bimex-indexer
cat .env
```

Verificar que existan:
- `STELLAR_RPC_URL`
- `CONTRACT_ID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `START_LEDGER` (opcional, 0 = desde el último indexado)

#### 2. Dry Run (Simulación)

**Siempre ejecutar primero en modo dry-run para verificar**:

```bash
node scripts/reindex.js --dry-run --from-ledger 1000000
```

Esto mostrará:
- Qué transacciones se procesarían
- Cuántos proyectos, aportaciones y eventos se crearían
- Sin escribir nada en la base de datos

#### 3. Re-indexación Completa

**⚠️ ADVERTENCIA**: Esto borrará todos los datos existentes.

```bash
# Opción 1: Limpiar y re-indexar desde ledger específico
node scripts/reindex.js --clear --from-ledger 1000000

# Opción 2: Re-indexar desde START_LEDGER en .env
node scripts/reindex.js --clear

# Opción 3: Re-indexar sin borrar (para agregar datos faltantes)
node scripts/reindex.js --from-ledger 2500000
```

#### 4. Monitoreo del Progreso

Durante la re-indexación verás:

```
🚀 Bimex Re-indexer

📡 RPC URL:      https://soroban-testnet.stellar.org
📜 Contract ID:  CDUMMYCONTRACTID...
🔢 Start Ledger: 1000000
🔍 Mode:         LIVE

📊 Latest ledger: 2500000
🎯 Will process from ledger 1000000 to 2500000

🔄 Starting re-indexation...

✓ nuevo_proyecto        | ledger=1000123 | tx=a1b2c3d4...
✓ nueva_aportacion      | ledger=1000145 | tx=e5f6g7h8...
✓ yield_reclamado       | ledger=1000289 | tx=i9j0k1l2...

📊 Progress: 45.2% | Ledger: 1678900/2500000 | TX: 1234 | Rate: 12.5 tx/s | Time: 98.7s
```

#### 5. Verificación Post-Indexación

```bash
# Verificar conteo de registros
psql $DATABASE_URL -c "SELECT COUNT(*) FROM proyectos;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM aportaciones;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM eventos;"

# O usando Supabase dashboard
# https://app.supabase.com/project/[PROJECT_ID]/editor
```

### Resumen de Re-indexación

Al finalizar verás:

```
============================================================
📈 RE-INDEXATION SUMMARY
============================================================
⏱️  Total time:        245.3s
📦 Ledgers processed: 1500000
📝 Transactions:      3456
🏗️  Proyectos:         15
💰 Aportaciones:      42
📋 Eventos:           128
❌ Errors:            0
============================================================

✅ Re-indexation completed successfully!
```

## 🔙 Restauración desde Backup

### Cuándo Usar

- Recuperación rápida (más rápido que re-indexar)
- Datos corruptos recientes
- Rollback a estado anterior conocido

### Procedimiento

#### 1. Listar Backups Disponibles

```bash
ls -lh backups/
```

#### 2. Dry Run de Restauración

```bash
node scripts/restore.js 20250529_143022 --dry-run
```

#### 3. Restauración Real

**⚠️ ADVERTENCIA**: Esto sobrescribirá datos existentes.

```bash
node scripts/restore.js 20250529_143022
```

Salida:
```
🔄 Bimex Restore

📁 Backup path: ./backups/20250529_143022
🔍 Mode: LIVE

📋 Backup metadata:
   Date: 2025-05-29T14:30:22-06:00
   Contract: CDUMMYCONTRACTID...
   Tables: proyectos, aportaciones, eventos

⚠️  WARNING: This will overwrite existing data!
⏳ Starting in 3 seconds... (Ctrl+C to cancel)

📦 Loading backup files...

🔄 Restoring data...

📊 Restoring proyectos: 15 records
   ✓ Inserted 15/15 records
   ✅ Restored 15 records to proyectos

📊 Restoring aportaciones: 42 records
   ✓ Inserted 42/42 records
   ✅ Restored 42 records to aportaciones

📊 Restoring eventos: 128 records
   ✓ Inserted 128/128 records
   ✅ Restored 128 records to eventos

✅ Restore completed successfully!
```

## 🚨 Procedimientos de Emergencia

### Pérdida Total de Supabase

1. **Crear nueva instancia de Supabase**
   ```bash
   # Crear proyecto en https://app.supabase.com
   ```

2. **Ejecutar schema**
   ```bash
   psql $NEW_DATABASE_URL < schema.sql
   ```

3. **Actualizar .env con nuevas credenciales**
   ```bash
   SUPABASE_URL=https://new-project.supabase.co
   SUPABASE_KEY=new_anon_key
   ```

4. **Re-indexar desde blockchain**
   ```bash
   node scripts/reindex.js --from-ledger 1000000
   ```

5. **Verificar datos**
   ```bash
   # Comparar conteos con backup más reciente
   ```

### Corrupción de Tabla Específica

Si solo una tabla está corrupta:

1. **Backup actual (por si acaso)**
   ```bash
   bash scripts/backup.sh
   ```

2. **Borrar tabla corrupta**
   ```sql
   DELETE FROM aportaciones WHERE proyecto_id > 0;
   ```

3. **Restaurar desde backup**
   ```bash
   # Modificar restore.js para restaurar solo una tabla
   # O re-indexar solo esa parte
   node scripts/reindex.js --from-ledger [LEDGER_INICIO]
   ```

## 📊 Verificación de Integridad

### Script de Verificación

```bash
# Crear script de verificación
cat > scripts/verify-integrity.sh << 'EOF'
#!/bin/bash
echo "🔍 Verificando integridad de datos..."

# Contar registros
PROYECTOS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM proyectos;")
APORTACIONES=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM aportaciones;")
EVENTOS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM eventos;")

echo "📊 Proyectos: $PROYECTOS"
echo "💰 Aportaciones: $APORTACIONES"
echo "📋 Eventos: $EVENTOS"

# Verificar consistencia
INCONSISTENCIAS=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*) FROM aportaciones a
  LEFT JOIN proyectos p ON a.proyecto_id = p.id
  WHERE p.id IS NULL;
")

if [ "$INCONSISTENCIAS" -gt 0 ]; then
  echo "❌ Encontradas $INCONSISTENCIAS aportaciones huérfanas"
  exit 1
else
  echo "✅ Integridad verificada"
fi
EOF

chmod +x scripts/verify-integrity.sh
```

## 🔐 Seguridad de Backups

### Recomendaciones

1. **Almacenamiento Redundante**
   - Guardar backups en múltiples ubicaciones
   - Usar servicios de almacenamiento en la nube (S3, GCS, etc.)

2. **Encriptación**
   ```bash
   # Encriptar backup
   tar -czf - backups/20250529_143022 | \
     gpg --symmetric --cipher-algo AES256 > \
     backup_20250529_143022.tar.gz.gpg
   ```

3. **Retención**
   - Mantener backups diarios por 7 días
   - Backups semanales por 4 semanas
   - Backups mensuales por 12 meses

4. **Pruebas Regulares**
   - Probar restauración mensualmente
   - Documentar tiempo de recuperación (RTO)
   - Documentar punto de recuperación (RPO)

## 📝 Checklist de Recuperación

### Pre-Desastre (Preparación)
- [ ] Backups automáticos configurados
- [ ] Backups probados mensualmente
- [ ] Documentación actualizada
- [ ] Credenciales de emergencia disponibles
- [ ] Equipo entrenado en procedimientos

### Durante Desastre
- [ ] Evaluar alcance del problema
- [ ] Notificar al equipo
- [ ] Detener indexer si está corriendo
- [ ] Determinar método de recuperación (backup vs re-index)
- [ ] Ejecutar procedimiento elegido
- [ ] Verificar integridad de datos recuperados

### Post-Desastre
- [ ] Documentar incidente
- [ ] Analizar causa raíz
- [ ] Actualizar procedimientos si es necesario
- [ ] Reanudar operaciones normales
- [ ] Monitorear por 24-48 horas

## 🆘 Contactos de Emergencia

```
Equipo de Desarrollo: [email/slack]
Administrador de Base de Datos: [email/slack]
Proveedor RPC Stellar: [soporte]
Supabase Support: support@supabase.io
```

## 📚 Referencias

- [Stellar RPC Documentation](https://developers.stellar.org/docs/data/rpc)
- [Supabase Backup Guide](https://supabase.com/docs/guides/platform/backups)
- [Soroban Events](https://developers.stellar.org/docs/smart-contracts/guides/events)

---

**Última actualización**: 2025-05-29  
**Versión**: 1.0  
**Mantenedor**: Equipo Bimex
