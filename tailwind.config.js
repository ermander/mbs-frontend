/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        // OddWise (landing): ow-display SOLO per il marchio, ow-mono SOLO per i numeri
        // (quote, importi, prezzi); titoli e testo usano font-sans (Geist).
        'ow-display': ['var(--font-ow-display)', 'var(--font-geist-sans)', 'sans-serif'],
        'ow-mono': ['var(--font-ow-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: '9999px',
        'ow-card': 'var(--ow-radius-card)',
        'ow-card-lg': 'var(--ow-radius-card-lg)',
        'ow-btn': 'var(--ow-radius-btn)',
        'ow-pill': 'var(--ow-radius-pill)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
        },
        neon: {
          cyan: '#52feca',
          blue: '#8bacff',
          lavender: '#af8bff',
          orange: '#ff9d53',
          red: '#ff4d6a',
        },
        // OddWise design tokens (globals.css, .claude/design/tokens.css): tema dark blu di
        // default, varianti con data-theme="green" | "light" sull'<html>.
        ow: {
          bg: 'var(--ow-bg)',
          surface: 'var(--ow-surface)',
          raised: 'var(--ow-raised)',
          deep: 'var(--ow-deep)',
          'deep-border': 'var(--ow-deep-border)',
          accent: 'var(--ow-accent)',
          amber: 'var(--ow-amber)',
          'amber-text': 'var(--ow-amber-text)',
          text: 'var(--ow-text)',
          'text-2': 'var(--ow-text-2)',
          'text-3': 'var(--ow-text-3)',
          line: 'var(--ow-line)',
          'line-strong': 'var(--ow-line-strong)',
          'on-accent': 'var(--ow-on-accent)',
          'on-deep': 'var(--ow-on-deep)',
          'on-deep-2': 'var(--ow-on-deep-2)',
          'on-raised': 'var(--ow-on-raised)',
          'on-raised-2': 'var(--ow-on-raised-2)',
          'raised-muted': 'var(--ow-raised-muted)',
          'raised-line': 'var(--ow-raised-line)',
          'raised-fill': 'var(--ow-raised-fill)',
          neutral: 'var(--ow-neutral)',
          'on-neutral': 'var(--ow-on-neutral)',
          'check-off': 'var(--ow-check-off)',
          danger: 'var(--ow-danger)',
          success: 'var(--ow-success)',
        },
      },
      boxShadow: {
        'glow-sm': 'var(--glow-primary)',
        'glow-md': 'var(--glow-primary-strong)',
        'glow-destructive': 'var(--glow-destructive)',
        'ow-card': 'var(--ow-shadow-card)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        // Carosello loghi: due copie della fila, la fila scorre di metà della sua larghezza.
        'ow-marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'ow-marquee': 'ow-marquee 70s linear infinite',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
}
