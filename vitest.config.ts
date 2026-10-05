import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: the tests are pure TS and don't need the React plugin.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
