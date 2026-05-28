import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      buffer: 'buffer',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})