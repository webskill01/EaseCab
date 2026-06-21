import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// Flat config (ESLint 9 / Next 16 — `next lint` removed). Mirrors the old
// .eslintrc "extends: next/core-web-vitals". eslint-config-next 16 bundles
// react-hooks v7, whose new react-compiler rules fire on this (working, tested)
// codebase: `set-state-in-effect` is kept as a non-blocking future-cleanup
// signal, and `refs` is off because it false-positives on destructured
// hook-return objects (flags `feed.atTop` as ref access). Demoting them keeps
// the lint baseline unchanged so this CVE bump doesn't pull in an unrelated
// lint-rule migration.
const config = [
  { ignores: ['.next/**', 'coverage/**', 'playwright-report/**', 'public/**'] },
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'off',
    },
  },
]

export default config
