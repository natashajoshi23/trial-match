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
        cream: '#FBF7F0',
        surface: '#FFFFFF',
        card: '#F7F3EC',
        elevated: '#EDE8D5',
        navy: '#1B3A52',
        crimson: '#C03A2B',
        'warm-orange': '#E8701A',
        golden: '#F5B642',
      },
      boxShadow: {
        glow: '0 0 28px rgba(124, 92, 252, 0.22)',
        'glow-sm': '0 0 14px rgba(124, 92, 252, 0.14)',
        'golden-glow': '0 0 20px rgba(245, 182, 66, 0.28)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
