/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 360 Travel Concierge palette (brand blue kept; grays aligned to wireframe)
        brand: { DEFAULT: '#4583fe', dark: '#2f6ce8', light: '#eaf1ff' },
        accent: { DEFAULT: '#35a1fc', dark: '#1e8ae6', light: '#e6f4ff' },
        ink: { DEFAULT: '#101828', soft: '#344054', muted: '#667085' },
        canvas: '#f7f8fa',
        line: '#e4e7ec',
        subtle: '#f2f4f7',
        faint: '#f9fafb',
        ok: { DEFAULT: '#12a150', light: '#e7f8ee' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
        pop: '0 8px 24px rgba(16,24,40,.14), 0 2px 6px rgba(16,24,40,.08)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
