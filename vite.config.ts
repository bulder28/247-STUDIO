/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      // Excluimos og-image.webp del precache para ahorrar datos móviles al alumno
      includeAssets: ['favicon-32x32.png', 'logo.webp', 'herobackground.webp'],
      manifest: {
        id: '/app/home',
        name: '247 STUDIO — Unlimited Grappling & BJJ',
        short_name: '247Studio',
        description: 'Academia oficial de BJJ, Grappling, MMA y Lucha en Pinto (Madrid)',
        lang: 'es-ES',
        dir: 'ltr',
        theme_color: '#0a0f1d',
        background_color: '#F8F9FA',
        display: 'standalone',
        // 'any' permite usar la tablet del Kiosco en horizontal (landscape) y móviles en vertical
        orientation: 'any',
        start_url: '/app/home',
        scope: '/',
        categories: ['fitness', 'sports', 'lifestyle'],
        icons: [
          {
            src: '/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/logo.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any',
          },
          {
            src: '/logo.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any',
          },
          {
            src: '/logo.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Reservar Clase',
            short_name: 'Reservas',
            description: 'Acceso directo a la parrilla de horarios y reservas',
            url: '/app/home',
            icons: [{ src: '/logo.webp', sizes: '192x192', type: 'image/webp' }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // El service worker no debe interceptar ni responder con index.html a estas rutas:
        // /__/ (retorno de Google/Firebase Auth), /.netlify/ (funciones) y /api/ (proxy a funciones)
        navigateFallbackDenylist: [/^\/__\//, /^\/\.netlify\//, /^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Evita precachear la imagen de redes sociales y sourcemaps
        globIgnores: ['**/og-image.webp', '**/*.map'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB de margen seguro
        runtimeCaching: [
          {
            // Imágenes locales y remotas (incluyendo avatares de Google Auth o fotos de perfil)
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Caché de fuentes (por si usas Google Fonts o woff2 externos)
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-firebase-core': ['firebase/app', 'firebase/auth'],
          'vendor-firebase-firestore': ['firebase/firestore'],
          'vendor-motion': ['framer-motion'],
          'vendor-qrcode': ['qrcode'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    // Claves ficticias: los tests no dependen de credenciales reales ni de un .env local
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key-for-vitest',
      VITE_FIREBASE_AUTH_DOMAIN: 'studio-ff8d1.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'studio-ff8d1',
    },
  },
});