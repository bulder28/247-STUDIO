import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { router } from '@/app/router';
import { RootErrorBoundary } from '@/shared/ui/RootErrorBoundary';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';

// Configuración global de caché TanStack Query para transiciones instantáneas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de validez de caché
      gcTime: 1000 * 60 * 30, // 30 minutos de persistencia en memoria
      refetchOnWindowFocus: false, // Evitar peticiones innecesarias al cambiar de app en móvil
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OfflineBanner />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
};


