import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { auth } from '@/shared/api/firebase';
import { Role } from '@/shared/domain/types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, loading, profileMissing } = useAuth();
  const location = useLocation();

  // Si AuthProvider está cargando O si Firebase Auth ya tiene usuario autenticado
  // pero el contexto de React todavía está resolviendo su rol y claims en segundo plano,
  // mostrar el spinner en lugar de expulsarlo erróneamente a /login.
  if (loading || (auth.currentUser && (!user || !role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-navy text-studio-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-studio-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider uppercase text-studio-cream">Cargando 247Studio...</p>
        </div>
      </div>
    );
  }

  if (!user && !auth.currentUser) {
    let target = location.pathname + location.search;
    if (target === '/app' || target === '/app/') {
      target = '/app/home';
    }
    return <Navigate to={`/login?redirect=${encodeURI(target)}`} replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // Si aún está resolviendo claims con usuario autenticado en Firebase, no bloquear
    if (!role && auth.currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-studio-navy text-studio-cream">
          <div className="w-10 h-10 border-4 border-studio-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider uppercase text-studio-cream">Verificando permisos...</p>
        </div>
      );
    }
    // Fail-Closed: Si el rol no está resuelto o no está en la lista permitida, se bloquea el acceso
    if (!role) {
      return <Navigate to={`/login?redirect=${encodeURI(location.pathname + location.search)}`} replace />;
    }
    // Redirigir según su rol real a su zona autorizada
    if (role === 'admin') return <Navigate to="/admin/personal" replace />;
    if (role === 'coach') return <Navigate to="/admin/asistencia" replace />;
    if (role === 'kiosk') return <Navigate to="/kiosk/check-in" replace />;
    return <Navigate to="/app/home" replace />;
  }

  // Alumno autenticado (p. ej. con Google) que aún no tiene ficha: completar el registro
  if (role === 'student' && location.pathname.startsWith('/app')) {
    if (profileMissing === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-studio-navy text-studio-cream">
          <div className="w-10 h-10 border-4 border-studio-red border-t-transparent rounded-full animate-spin" role="status" aria-label="Cargando" />
        </div>
      );
    }
    if (profileMissing) {
      return <Navigate to="/registro?completar=1" replace />;
    }
  }

  return children;
};
