import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Role } from '@/shared/domain/types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-navy text-studio-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-studio-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider uppercase text-studio-cream">Cargando 247Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    let target = location.pathname + location.search;
    if (target === '/app' || target === '/app/') {
      target = '/app/home';
    }
    return <Navigate to={`/login?redirect=${encodeURI(target)}`} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirigir según el rol real si intenta entrar a una sección no autorizada
    if (role === 'admin') return <Navigate to="/admin/personal" replace />;
    if (role === 'kiosk') return <Navigate to="/kiosk/check-in" replace />;
    return <Navigate to="/app/home" replace />;
  }

  return children;
};
