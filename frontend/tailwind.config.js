/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        deep: '#070A15',
        surface: '#0C0F1D',
        card: '#111525',
        elevated: '#171B2F',
      },
      boxShadow: {
        glow: '0 0 28px rgba(124, 92, 252, 0.22)',
        'glow-sm': '0 0 14px rgba(124, 92, 252, 0.14)',
        'amber-glow': '0 0 20px rgba(245, 158, 11, 0.28)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
