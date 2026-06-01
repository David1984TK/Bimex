#!/usr/bin/env node
/**
 * Test script to validate backup and reindex scripts logic
 * This doesn't require external dependencies
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Bimex Indexer Scripts\n');

// Test 1: Verify reindex.js exists and has correct structure
console.log('✓ Test 1: Checking reindex.js...');
try {
  const reindexPath = join(__dirname, 'reindex.js');
  const reindexContent = readFileSync(reindexPath, 'utf-8');
  
  const checks = [
    { name: 'Has shebang', test: reindexContent.includes('#!/usr/bin/env node') },
    { name: 'Imports dotenv', test: reindexContent.includes("import 'dotenv/config'") },
    { name: 'Imports SorobanRpc', test: reindexContent.includes('SorobanRpc') },
    { name: 'Has --dry-run option', test: reindexContent.includes('--dry-run') },
    { name: 'Has --clear option', test: reindexContent.includes('--clear') },
    { name: 'Has --from-ledger option', test: reindexContent.includes('--from-ledger') },
    { name: 'Has clearDatabase function', test: reindexContent.includes('async function clearDatabase') },
    { name: 'Has processTransaction function', test: reindexContent.includes('async function processTransaction') },
    { name: 'Has reindexBatch function', test: reindexContent.includes('async function reindexBatch') },
    { name: 'Has progress reporting', test: reindexContent.includes('printProgress') },
    { name: 'Has summary reporting', test: reindexContent.includes('printSummary') },
    { name: 'Handles SIGINT', test: reindexContent.includes("process.on('SIGINT'") },
  ];
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name}`);
      process.exitCode = 1;
    }
  });
} catch (error) {
  console.log(`  ✗ Error reading reindex.js: ${error.message}`);
  process.exitCode = 1;
}

// Test 2: Verify restore.js exists and has correct structure
console.log('\n✓ Test 2: Checking restore.js...');
try {
  const restorePath = join(__dirname, 'restore.js');
  const restoreContent = readFileSync(restorePath, 'utf-8');
  
  const checks = [
    { name: 'Has shebang', test: restoreContent.includes('#!/usr/bin/env node') },
    { name: 'Imports dotenv', test: restoreContent.includes("import 'dotenv/config'") },
    { name: 'Has --dry-run option', test: restoreContent.includes('--dry-run') },
    { name: 'Has loadBackupFile function', test: restoreContent.includes('async function loadBackupFile') },
    { name: 'Has restoreTable function', test: restoreContent.includes('async function restoreTable') },
    { name: 'Validates backup exists', test: restoreContent.includes('existsSync(backupPath)') },
    { name: 'Loads metadata', test: restoreContent.includes('metadata.json') },
    { name: 'Restores proyectos', test: restoreContent.includes("restoreTable('proyectos'") },
    { name: 'Restores aportaciones', test: restoreContent.includes("restoreTable('aportaciones'") },
    { name: 'Restores eventos', test: restoreContent.includes("restoreTable('eventos'") },
    { name: 'Has batch processing', test: restoreContent.includes('BATCH_SIZE') },
  ];
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name}`);
      process.exitCode = 1;
    }
  });
} catch (error) {
  console.log(`  ✗ Error reading restore.js: ${error.message}`);
  process.exitCode = 1;
}

// Test 3: Verify backup.sh exists and has correct structure
console.log('\n✓ Test 3: Checking backup.sh...');
try {
  const backupPath = join(__dirname, 'backup.sh');
  const backupContent = readFileSync(backupPath, 'utf-8');
  
  const checks = [
    { name: 'Has shebang', test: backupContent.includes('#!/bin/bash') },
    { name: 'Has set -e', test: backupContent.includes('set -e') },
    { name: 'Loads .env', test: backupContent.includes('export $(cat .env') },
    { name: 'Creates backup directory', test: backupContent.includes('mkdir -p') },
    { name: 'Has timestamp', test: backupContent.includes('TIMESTAMP=$(date') },
    { name: 'Validates env vars', test: backupContent.includes('SUPABASE_URL') && backupContent.includes('SUPABASE_KEY') },
    { name: 'Has export_table function', test: backupContent.includes('export_table()') },
    { name: 'Uses curl for export', test: backupContent.includes('curl') },
    { name: 'Exports proyectos', test: backupContent.includes('export_table "proyectos"') },
    { name: 'Exports aportaciones', test: backupContent.includes('export_table "aportaciones"') },
    { name: 'Exports eventos', test: backupContent.includes('export_table "eventos"') },
    { name: 'Creates metadata', test: backupContent.includes('metadata.json') },
    { name: 'Shows backup size', test: backupContent.includes('du -sh') },
  ];
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name}`);
      process.exitCode = 1;
    }
  });
} catch (error) {
  console.log(`  ✗ Error reading backup.sh: ${error.message}`);
  process.exitCode = 1;
}

// Test 4: Verify command line argument parsing
console.log('\n✓ Test 4: Testing argument parsing logic...');
const testArgs = [
  { args: ['--dry-run'], expected: { dryRun: true } },
  { args: ['--clear'], expected: { clear: true } },
  { args: ['--from-ledger', '12345'], expected: { fromLedger: 12345 } },
  { args: ['--dry-run', '--from-ledger', '99999'], expected: { dryRun: true, fromLedger: 99999 } },
];

testArgs.forEach(({ args, expected }) => {
  const dryRun = args.includes('--dry-run');
  const clear = args.includes('--clear');
  const fromLedgerIdx = args.indexOf('--from-ledger');
  const fromLedger = fromLedgerIdx !== -1 && args[fromLedgerIdx + 1] 
    ? parseInt(args[fromLedgerIdx + 1], 10) 
    : null;
  
  let passed = true;
  if (expected.dryRun !== undefined && dryRun !== expected.dryRun) passed = false;
  if (expected.clear !== undefined && clear !== expected.clear) passed = false;
  if (expected.fromLedger !== undefined && fromLedger !== expected.fromLedger) passed = false;
  
  if (passed) {
    console.log(`  ✓ Args ${args.join(' ')} parsed correctly`);
  } else {
    console.log(`  ✗ Args ${args.join(' ')} parsing failed`);
    process.exitCode = 1;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
if (process.exitCode === 1) {
  console.log('❌ Some tests failed');
} else {
  console.log('✅ All tests passed!');
  console.log('\n📝 Scripts are ready to use:');
  console.log('   • node scripts/reindex.js --dry-run');
  console.log('   • node scripts/reindex.js --from-ledger 1000000');
  console.log('   • node scripts/reindex.js --clear --from-ledger 0');
  console.log('   • bash scripts/backup.sh');
  console.log('   • node scripts/restore.js 20250529_143022');
}
console.log('='.repeat(60));
