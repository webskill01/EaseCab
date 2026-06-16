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
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:abc',
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid-key',
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
        'features/subscription/services/razorpayClient.js',
        'features/chat/services/firestoreClient.js',
        'features/notifications/services/fcmClient.js',
        'features/notifications/services/geoClient.js',
        'features/pwa/services/swClient.js',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
