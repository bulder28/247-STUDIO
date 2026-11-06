/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          navy: '#11152E',
          'navy-light': '#1C224A',
          'navy-deep': '#0C0F24',
          red: '#E60000',
          'red-dark': '#B80000',
          cream: '#D8D2B8',
          'cream-light': '#F4F2EB',
          white: '#FFFFFF',
          status: {
            ok: '#10B981',
            pending: '#F59E0B',
            grace: '#3B82F6',
            nok: '#E60000',
          },
        },
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Archivo Variable"', 'Impact', 'system-ui', 'sans-serif'],
      },
      // Esquinas más secas en toda la app: un tatami no tiene esquinas de burbuja.
      borderRadius: {
        xl: '0.375rem',
        '2xl': '0.5rem',
        '3xl': '0.625rem',
      },
    },
  },
  plugins: [],
};
