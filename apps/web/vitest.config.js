import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    // env.js validates these at import — provide them for tests
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    },
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.{js,jsx}',
        'config/**/*.js',
        'components/ui/**/*.jsx',
        'features/**/*.{js,jsx}',
      ],
      // Live-SDK boundaries: no logic to unit-test (mirrors api lib/firebaseAdmin).
      exclude: [
        'features/auth/lib/firebaseClient.js',
        'features/auth/services/otpClient.js',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
