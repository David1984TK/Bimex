#!/usr/bin/env bash
# Temporary helper — remove after tests run
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/bimex-frontend"
test -d node_modules || npm install
npm run test:run -- src/test/ipfs.test.js
echo "FRONTEND_EXIT:$?"
cd "$ROOT/bimex-indexer"
test -d node_modules || npm install
npm test -- tests/ipfsProxy.test.js
echo "INDEXER_EXIT:$?"
