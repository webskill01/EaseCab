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
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ec: {
          // Brand blue LOCKED to lightened prototype values (docs/design/DESIGN-SYSTEM.md §1).
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
          successBg: '#DCFCE7',
          successTx: '#166534',
          bookedBg: '#DBEAFE',
          bookedTx: '#1D4ED8',
          warning: '#F59E0B',
          warnBg: '#FFFBEB',
          danger: '#EF4444',
          dangerBg: '#FEF2F2',
          wa: '#25D366',
          waDeep: '#1FA855',
          amberTx: '#B45309', // trial-banner subtitle (DESIGN-SYSTEM §1)
          disabled: '#CBD5E1', // disabled primary-button fill (slate-300, no shadow)
        },
      },
      boxShadow: {
        'ec-card': '0 1px 3px rgba(15,23,42,0.08)',
        'ec-float': '0 8px 24px rgba(15,23,42,0.12)',
        'ec-blue': '0 2px 8px rgba(37,99,235,0.3)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ec-card': '16px',
        'ec-chip': '999px',
      },
      keyframes: {
        // Success badge: circle pops in with a slight overshoot, then the tick draws.
        'ec-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ec-draw': {
          '0%': { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'ec-pop': 'ec-pop 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'ec-draw': 'ec-draw 0.4s ease-out 0.28s both',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}
