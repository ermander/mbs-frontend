import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests of the pure modules only (calculators, formats, bookmaker identity):
// the pages and components are checked by tsc, eslint and the browser.
export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
