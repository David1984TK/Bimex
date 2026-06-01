#!/usr/bin/env node
/**
 * Bimex Indexer - Re-indexation Script
 * Re-indexes all data from Stellar blockchain starting from START_LEDGER
 * 
 * Usage:
 *   node scripts/reindex.js [--from-ledger N] [--dry-run] [--clear]
 * 
 * Options:
 *   --from-ledger N  Start from specific ledger (overrides START_LEDGER env)
 *   --dry-run        Show what would be indexed without writing to DB
 *   --clear          Clear existing data before re-indexing (DESTRUCTIVE)
 */

import 'dotenv/config';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { parseTx } from '../eventParser.js';
import { upsertProyecto, upsertAportacion, insertEvento } from '../database.js';
import supabase from '../database.js';

const RPC_URL = process.env.STELLAR_RPC_URL;
const CONTRACT_ID = process.env.CONTRACT_ID;
const BATCH_SIZE = 200;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fromLedger: null,
  dryRun: args.includes('--dry-run'),
  clear: args.includes('--clear'),
};

const fromLedgerIdx = args.indexOf('--from-ledger');
if (fromLedgerIdx !== -1 && args[fromLedgerIdx + 1]) {
  options.fromLedger = parseInt(args[fromLedgerIdx + 1], 10);
}

if (!options.fromLedger) {
  options.fromLedger = parseInt(process.env.START_LEDGER ?? '0', 10);
}

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

// Statistics
const stats = {
  ledgersProcessed: 0,
  txProcessed: 0,
  proyectos: 0,
  aportaciones: 0,
  eventos: 0,
  errors: 0,
  startTime: Date.now(),
};

async function clearDatabase() {
  console.log('⚠️  CLEARING ALL DATA FROM DATABASE...');
  console.log('⏳ This will delete all proyectos, aportaciones, and eventos');
  
  // Wait 3 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Delete in correct order (respecting foreign keys)
    await supabase.from('aportaciones').delete().neq('proyecto_id', -1);
    console.log('✅ Cleared aportaciones');
    
    await supabase.from('eventos').delete().neq('id', -1);
    console.log('✅ Cleared eventos');
    
    await supabase.from('proyectos').delete().neq('id', -1);
    console.log('✅ Cleared proyectos');
    
    console.log('✅ Database cleared successfully\n');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}

async function processTransaction(tx) {
  if (tx.status !== 'SUCCESS') return;
  
  const parsed = parseTx(tx, CONTRACT_ID);
  if (!parsed) return;
  
  const { evento, proyecto, aportacion } = parsed;
  
  if (options.dryRun) {
    console.log(`[DRY RUN] ${evento.tipo} | ledger=${evento.ledger} | tx=${evento.tx_hash.slice(0, 8)}...`);
    if (proyecto) console.log(`  → Proyecto: ${JSON.stringify(proyecto)}`);
    if (aportacion) console.log(`  → Aportación: ${JSON.stringify(aportacion)}`);
  } else {
    try {
      await insertEvento(evento);
      stats.eventos++;
      
      if (proyecto) {
        await upsertProyecto(proyecto);
        stats.proyectos++;
      }
      
      if (aportacion) {
        await upsertAportacion(aportacion);
        stats.aportaciones++;
      }
      
      console.log(`✓ ${evento.tipo.padEnd(20)} | ledger=${evento.ledger} | tx=${evento.tx_hash.slice(0, 8)}...`);
    } catch (error) {
      console.error(`✗ Error processing tx ${evento.tx_hash}:`, error.message);
      stats.errors++;
    }
  }
  
  stats.txProcessed++;
}

async function reindexBatch(startLedger) {
  const resp = await rpc.getTransactions({
    startLedger,
    pagination: { limit: BATCH_SIZE },
  });
  
  for (const tx of resp.transactions ?? []) {
    await processTransaction(tx);
  }
  
  stats.ledgersProcessed++;
  
  return {
    cursor: resp.cursor ?? resp.latestLedger + 1,
    latestLedger: resp.latestLedger,
    hasMore: (resp.cursor ?? resp.latestLedger + 1) <= resp.latestLedger,
  };
}

function printProgress(currentLedger, latestLedger) {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const progress = ((currentLedger / latestLedger) * 100).toFixed(1);
  const rate = (stats.txProcessed / (elapsed || 1)).toFixed(1);
  
  process.stdout.write(
    `\r📊 Progress: ${progress}% | ` +
    `Ledger: ${currentLedger}/${latestLedger} | ` +
    `TX: ${stats.txProcessed} | ` +
    `Rate: ${rate} tx/s | ` +
    `Time: ${elapsed}s`
  );
}

function printSummary() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  
  console.log('\n\n' + '='.repeat(60));
  console.log('📈 RE-INDEXATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total time:        ${elapsed}s`);
  console.log(`📦 Ledgers processed: ${stats.ledgersProcessed}`);
  console.log(`📝 Transactions:      ${stats.txProcessed}`);
  console.log(`🏗️  Proyectos:         ${stats.proyectos}`);
  console.log(`💰 Aportaciones:      ${stats.aportaciones}`);
  console.log(`📋 Eventos:           ${stats.eventos}`);
  console.log(`❌ Errors:            ${stats.errors}`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Bimex Re-indexer\n');
  console.log(`📡 RPC URL:      ${RPC_URL}`);
  console.log(`📜 Contract ID:  ${CONTRACT_ID}`);
  console.log(`🔢 Start Ledger: ${options.fromLedger || 'latest'}`);
  console.log(`🔍 Mode:         ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');
  
  // Validate environment
  if (!RPC_URL || !CONTRACT_ID) {
    console.error('❌ Error: STELLAR_RPC_URL and CONTRACT_ID must be set in .env');
    process.exit(1);
  }
  
  // Clear database if requested
  if (options.clear && !options.dryRun) {
    await clearDatabase();
  }
  
  // Get latest ledger to determine range
  const latestLedgerInfo = await rpc.getLatestLedger();
  const latestLedger = latestLedgerInfo.sequence;
  const startLedger = options.fromLedger || latestLedger;
  
  console.log(`📊 Latest ledger: ${latestLedger}`);
  console.log(`🎯 Will process from ledger ${startLedger} to ${latestLedger}\n`);
  
  if (startLedger > latestLedger) {
    console.log('⚠️  Start ledger is ahead of latest ledger. Nothing to process.');
    return;
  }
  
  console.log('🔄 Starting re-indexation...\n');
  
  let cursor = startLedger;
  let hasMore = true;
  
  while (hasMore && cursor <= latestLedger) {
    try {
      const result = await reindexBatch(cursor);
      cursor = result.cursor;
      hasMore = result.hasMore;
      
      printProgress(cursor, latestLedger);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\n❌ Error processing batch at ledger ${cursor}:`, error.message);
      stats.errors++;
      
      // Continue with next batch
      cursor++;
    }
  }
  
  printSummary();
  
  if (options.dryRun) {
    console.log('\n💡 This was a dry run. No data was written to the database.');
    console.log('   Run without --dry-run to perform actual re-indexation.');
  } else {
    console.log('\n✅ Re-indexation completed successfully!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  printSummary();
  process.exit(0);
});

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
