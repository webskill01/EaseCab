import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// Flat config (ESLint 9 / Next 16 — `next lint` removed). Mirrors the old
// .eslintrc "extends: next/core-web-vitals". react-hooks v7 (bundled in
// eslint-config-next 16) ships new react-compiler rules; demoted to keep the
// lint baseline unchanged across this CVE bump (see apps/web/eslint.config.mjs).
const config = [
  { ignores: ['.next/**', 'coverage/**', 'playwright-report/**'] },
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'off',
    },
  },
]

export default config
