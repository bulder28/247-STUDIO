/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta #5: Swiss Monochrome + Vermilion (Diseño Clínico Suizo 247Studio)
        brand: {
          background: '#F4F4F5', // Niebla Suiza (Zinc 100)
          sand: '#F4F4F5',
          'sand-light': '#FFFFFF', // Blanco Clínico
          text: '#09090B',       // Negro Tinta (Zinc 950)
          accent: '#E11D48',     // Bermellón Suizo (Rose 600)
          'accent-dark': '#BE123C', // Bermellón Oscuro (Rose 700)
        },
        studio: {
          navy: '#09090B',
          'navy-light': '#18181B',
          'navy-deep': '#09090B',
          red: '#E11D48',
          'red-dark': '#BE123C',
          cream: '#F4F4F5',
          'cream-light': '#FAFAFA',
          white: '#FFFFFF',
          status: {
            ok: '#10B981',
            pending: '#F59E0B',
            grace: '#3B82F6',
            nok: '#E11D48',
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
