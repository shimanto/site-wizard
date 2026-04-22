/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans JP"',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Meiryo',
          'sans-serif',
        ],
        serif: [
          '"Noto Serif JP"',
          'Hiragino Mincho ProN',
          'YuMincho',
          'serif',
        ],
      },
    },
  },
  plugins: [],
}
