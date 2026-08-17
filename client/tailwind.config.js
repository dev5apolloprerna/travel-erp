/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 360 Travel Concierge palette
        brand: { DEFAULT: '#4583fe', dark: '#2f6ce8', light: '#eaf1ff' },
        accent: { DEFAULT: '#35a1fc', dark: '#1e8ae6', light: '#e6f4ff' },
        ink: { DEFAULT: '#15223b', soft: '#2b3a56', muted: '#66748f' },
        canvas: '#f4f7fc',
        line: '#e2e8f2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(21,34,59,0.04), 0 8px 24px -12px rgba(21,34,59,0.14)',
        pop: '0 12px 40px -12px rgba(21,34,59,0.28)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
