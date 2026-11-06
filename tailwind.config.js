/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial 247Studio extraída de www.247studiobjj.com
        brand: {
          background: '#DDD6B8', // Lienzo Tatami / Arena cálida oficial
          sand: '#DDD6B8',
          'sand-light': '#F4F0E1',
          text: '#1A1D2E',       // Tinta azul oscuro oficial
          accent: '#E11D2E',     // Rojo de rango BJJ oficial
          'accent-dark': '#B91C1C',
        },
        studio: {
          navy: '#1A1D2E',
          'navy-light': '#252B44',
          'navy-deep': '#111320',
          red: '#E11D2E',
          'red-dark': '#B91C1C',
          cream: '#DDD6B8',
          'cream-light': '#F5F2E6',
          white: '#FFFFFF',
          status: {
            ok: '#10B981',
            pending: '#F59E0B',
            grace: '#3B82F6',
            nok: '#E11D2E',
          },
        },
      },
      fontFamily: {
        headline: ['Oswald', 'system-ui', 'sans-serif'],
        display: ['Oswald', '"Archivo Variable"', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Archivo Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      // Esquinas secas de academia de artes marciales
      borderRadius: {
        xl: '0.375rem',
        '2xl': '0.5rem',
        '3xl': '0.625rem',
      },
    },
  },
  plugins: [],
};
