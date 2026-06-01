#!/usr/bin/env node
/**
 * Bimex Indexer - Restore Script
 * Restores data from a backup created by backup.sh
 * 
 * Usage:
 *   node scripts/restore.js <backup_timestamp> [--dry-run]
 * 
 * Example:
 *   node scripts/restore.js 20250529_143022
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import supabase from '../database.js';

const args = process.argv.slice(2);
const backupTimestamp = args[0];
const dryRun = args.includes('--dry-run');

if (!backupTimestamp) {
  console.error('❌ Error: Backup timestamp required');
  console.log('Usage: node scripts/restore.js <backup_timestamp> [--dry-run]');
  console.log('Example: node scripts/restore.js 20250529_143022');
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const backupPath = join(BACKUP_DIR, backupTimestamp);

async function loadBackupFile(filename) {
  const filepath = join(backupPath, filename);
  
  if (!existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filepath}`);
  }
  
  const content = readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

async function restoreTable(tableName, data) {
  console.log(`📊 Restoring ${tableName}: ${data.length} records`);
  
  if (dryRun) {
    console.log(`   [DRY RUN] Would insert ${data.length} records into ${tableName}`);
    return;
  }
  
  if (data.length === 0) {
    console.log(`   ⚠️  No data to restore for ${tableName}`);
    return;
  }
  
  // Insert in batches to avoid timeout
  const BATCH_SIZE = 100;
  let inserted = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: tableName === 'eventos' ? 'tx_hash' : undefined });
    
    if (error) {
      console.error(`   ❌ Error inserting batch: ${error.message}`);
      throw error;
    }
    
    inserted += batch.length;
    process.stdout.write(`\r   ✓ Inserted ${inserted}/${data.length} records`);
  }
  
  console.log(`\n   ✅ Restored ${inserted} records to ${tableName}`);
}

async function main() {
  console.log('🔄 Bimex Restore\n');
  console.log(`📁 Backup path: ${backupPath}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);
  
  // Verify backup exists
  if (!existsSync(backupPath)) {
    console.error(`❌ Error: Backup not found at ${backupPath}`);
    process.exit(1);
  }
  
  // Load metadata
  const metadata = await loadBackupFile('metadata.json');
  console.log('📋 Backup metadata:');
  console.log(`   Date: ${metadata.date}`);
  console.log(`   Contract: ${metadata.contract_id}`);
  console.log(`   Tables: ${metadata.tables.join(', ')}\n`);
  
  if (!dryRun) {
    console.log('⚠️  WARNING: This will overwrite existing data!');
    console.log('⏳ Starting in 3 seconds... (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Load backup data
  console.log('📦 Loading backup files...\n');
  const proyectos = await loadBackupFile('proyectos.json');
  const aportaciones = await loadBackupFile('aportaciones.json');
  const eventos = await loadBackupFile('eventos.json');
  
  // Restore in correct order (respecting foreign keys)
  console.log('🔄 Restoring data...\n');
  await restoreTable('proyectos', proyectos);
  await restoreTable('aportaciones', aportaciones);
  await restoreTable('eventos', eventos);
  
  console.log('\n✅ Restore completed successfully!');
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. No data was written to the database.');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
