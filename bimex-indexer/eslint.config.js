import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

// ESLint flat config for bimex-indexer, consistent with bimex-frontend where it
// makes sense. The indexer is a Node.js ESM service (not a browser app), so the
// React/Refresh plugins used by the frontend do not apply here.
export default defineConfig([
  globalIgnores(['node_modules', 'coverage', 'dist']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Allow intentionally-unused bindings prefixed with `_` (common in
      // `catch (_) {}` fallbacks and unused callback args).
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Empty `catch {}` is used deliberately for best-effort SSE/webhook sends.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
]);
