/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './features/**/*.{js,jsx}',
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
          // Brand blue shares the locked web palette (docs/design/DESIGN-SYSTEM.md §1).
          blue: '#4D8DF6',
          blueDeep: '#3674E8',
          blueInk: '#2C5BD8',
          sky: '#EFF6FF',
          skyDeep: '#DCEAFE',
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
      boxShadow: {
        'ec-card': '0 1px 3px rgba(15,23,42,0.08)',
        'ec-float': '0 8px 24px rgba(15,23,42,0.12)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ec-card': '16px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
