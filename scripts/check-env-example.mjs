#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function extractVarsFromEnvExample(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = new Set();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=/);
    if (match) {
      vars.add(match[1]);
    }
  }
  return vars;
}

function scanFiles(dir, filterFn, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'build') {
        scanFiles(fullPath, filterFn, fileList);
      }
    } else if (entry.isFile() && filterFn(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function checkFrontend() {
  const envExamplePath = path.join(rootDir, 'bimex-frontend', '.env.example');
  const documented = extractVarsFromEnvExample(envExamplePath);

  const jsFiles = scanFiles(
    path.join(rootDir, 'bimex-frontend', 'src'),
    name => name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx')
  );

  const used = new Set();
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(/import\.meta\.env\.(VITE_[A-Za-z0-9_]+)/g);
    for (const match of matches) {
      used.add(match[1]);
    }
  }

  const missing = [...used].filter(v => !documented.has(v));
  return { documented, used, missing };
}

function checkIndexer() {
  const envExamplePath = path.join(rootDir, 'bimex-indexer', '.env.example');
  const documented = extractVarsFromEnvExample(envExamplePath);

  const jsFiles = scanFiles(
    path.join(rootDir, 'bimex-indexer'),
    name => name.endsWith('.js') && !name.includes('.test.')
  );

  const IGNORED = new Set(['NODE_ENV']);
  const used = new Set();
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(/process\.env\.([A-Za-z0-9_]+)/g);
    for (const match of matches) {
      const varName = match[1];
      if (!IGNORED.has(varName)) {
        used.add(varName);
      }
    }
  }

  const missing = [...used].filter(v => !documented.has(v));
  return { documented, used, missing };
}

console.log('Verificando sincronización de variables de entorno con .env.example...');
let hasError = false;

const frontendResult = checkFrontend();
if (frontendResult.missing.length > 0) {
  console.error('\n[bimex-frontend] Variables usadas en el código pero no documentadas en .env.example:');
  for (const v of frontendResult.missing) {
    console.error(`  - ${v}`);
  }
  hasError = true;
} else {
  console.log(`✓ bimex-frontend: ${frontendResult.used.size} variables VITE_* sincronizadas correctamente.`);
}

const indexerResult = checkIndexer();
if (indexerResult.missing.length > 0) {
  console.error('\n[bimex-indexer] Variables usadas en el código pero no documentadas en .env.example:');
  for (const v of indexerResult.missing) {
    console.error(`  - ${v}`);
  }
  hasError = true;
} else {
  console.log(`✓ bimex-indexer: ${indexerResult.used.size} variables sincronizadas correctamente.`);
}

if (hasError) {
  console.error('\nPor favor agrega las variables faltantes a sus respectivos .env.example con comentario y valor por defecto.');
  process.exit(1);
}

console.log('\nTodos los archivos .env.example están sincronizados.');
process.exit(0);
