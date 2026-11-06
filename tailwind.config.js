/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          navy: '#11152E',
          'navy-light': '#1C224A',
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
