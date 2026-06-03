import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    // env.js validates NEXT_PUBLIC_API_URL at import — provide it for tests
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4000' },
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{js,jsx}', 'config/**/*.js', 'components/ui/**/*.jsx'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
