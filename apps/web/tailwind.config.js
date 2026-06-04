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
          blue: '#2563EB',
          blueDeep: '#1E40AF',
          blueInk: '#1E3A8A',
          sky: '#EFF4FF',
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
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}
