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
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 14px 34px -4px rgba(15, 23, 42, 0.08), 0 6px 14px -2px rgba(15, 23, 42, 0.04)',
        'modal': '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        'glow-red': '0 0 25px -4px rgba(225, 29, 46, 0.35)',
        'glow-gold': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
};
