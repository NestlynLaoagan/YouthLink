/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  safelist: [
    'border-t-navy','border-t-crimson','border-t-gold','border-t-green-500',
    'bg-navy','bg-navy-dark','bg-navy-mid','bg-navy-light',
    'bg-crimson','bg-crimson-dark','bg-crimson-light',
    'bg-gold','bg-gold-dark','bg-gold-light',
    'text-navy','text-crimson','text-gold',
    'border-navy','border-crimson','border-gold',
    'hover:bg-navy','hover:bg-crimson','hover:bg-gold',
    'hover:text-navy','hover:text-white',
    'bg-softwhite','text-charcoal',
  ],
  theme: {
    extend: {
      colors: {
        navy:           '#1A365D',
        'navy-dark':    '#0F2444',
        'navy-mid':     '#2A4A7F',
        'navy-light':   '#EBF8FF',
        crimson:        '#C53030',
        'crimson-dark': '#9B2C2C',
        'crimson-light':'#FFF5F5',
        gold:           '#D69E2E',
        'gold-dark':    '#B7851A',
        'gold-light':   '#FEF9E7',
        softwhite:      '#F7FAFC',
        charcoal:       '#2D3748',
      },
      fontFamily: { serif: ['Georgia', 'serif'] },
    },
  },
  plugins: [],
}
