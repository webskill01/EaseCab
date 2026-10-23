/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './features/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ec: {
          // Same palette as the finance + manager-bot panels: one blue accent, slate text.
          blue: '#2563EB',
          blueDeep: '#1E40AF',
          blueInk: '#1E3A8A',
          sky: '#EFF4FF',
          skyDeep: '#DBE7FE',
          bg: '#F8FAFC',
          line: '#E2E8F0',
          ink: '#0F172A',
          ink60: '#64748B',
          ink40: '#94A3B8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        'ec-card': '0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)',
        'ec-float': '0 8px 24px rgba(15,23,42,0.12)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ec-card': '12px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
