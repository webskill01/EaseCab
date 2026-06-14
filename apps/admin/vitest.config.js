import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    // config/env.js validates this at import — provide it for tests.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
    },
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.{js,jsx}',
        'config/**/*.js',
        'features/**/*.{js,jsx}',
      ],
      exclude: ['**/__tests__/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
