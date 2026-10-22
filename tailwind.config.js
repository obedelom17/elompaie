/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vert encre, repris du drapeau togolais, tenu sobre.
        primary: {
          50: '#eef6f2', 100: '#d8eae1', 200: '#b3d5c4', 300: '#83b9a1', 400: '#4f9779',
          500: '#2c7a5d', 600: '#14604a', 700: '#0e4f3c', 800: '#0b3f31', 900: '#082e24', 950: '#041a14',
        },
        // Or du drapeau, réservé aux accents rares.
        accent: {
          50: '#fbf6e8', 100: '#f5eac6', 200: '#ecd68f', 300: '#e0be58', 400: '#d4a93a',
          500: '#c4952b', 600: '#a3771f', 700: '#7e5a19', 800: '#5f4416', 900: '#463314',
        },
        // Neutres légèrement teintés de vert pour s'accorder au primaire.
        slate: {
          50: '#f6f7f5', 100: '#eceee9', 200: '#dde1db', 300: '#c3c9c1', 400: '#8d968c',
          500: '#667064', 600: '#4d564c', 700: '#394038', 800: '#272d27', 900: '#171c17', 950: '#0d110d',
        },
        success: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        error: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
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
