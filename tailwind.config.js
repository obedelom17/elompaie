/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bleu professionnel : navigation, titres, liens.
        primary: {
          50: '#eef4fa', 100: '#d9e6f2', 200: '#b3cde4', 300: '#7fabcf', 400: '#4a84b3',
          500: '#2d6a9a', 600: '#1f4e79', 700: '#193f62', 800: '#14324e', 900: '#0f2639', 950: '#091623',
        },
        // Turquoise : actions et éléments actifs.
        accent: {
          50: '#ecf8f6', 100: '#d2efeb', 200: '#a6dfd8', 300: '#6fc7bd', 400: '#44b0a4',
          500: '#2a9d8f', 600: '#238377', 700: '#1d6b62', 800: '#17554e', 900: '#12423d',
        },
        slate: { 50: '#f5f7fa' },
        gold: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        success: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        error: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,28,23,0.04)',
        'card-hover': '0 1px 2px rgba(23,28,23,0.06)',
        modal: '0 16px 40px rgba(13,17,13,0.18)',
      },
    },
  },
  plugins: [],
}
