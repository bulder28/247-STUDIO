import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { AdminLayout } from '@/widgets/AdminLayout';
import { AppLayout } from '@/widgets/AppLayout';
import { LandingLayout } from '@/widgets/LandingLayout';
import { lazyWithRetry } from '@/shared/utils/lazyWithRetry';
import { RootErrorBoundary, RouteErrorElement } from '@/shared/ui/RootErrorBoundary';

// Lazy loading resiliente por ruta con auto-recuperación ante nuevos despliegues en caliente
const LandingPage = lazyWithRetry(() =>
  import('@/pages/public-landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const TrialClassPage = lazyWithRetry(() =>
  import('@/pages/public-reserva-prueba/TrialClassPage').then((m) => ({ default: m.TrialClassPage }))
);
const LoginPage = lazyWithRetry(() =>
  import('@/pages/public-login/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const HomePage = lazyWithRetry(() =>
  import('@/pages/app-home/HomePage').then((m) => ({ default: m.HomePage }))
);
const AttendanceHistoryPage = lazyWithRetry(() =>
  import('@/pages/app-historial/AttendanceHistoryPage').then((m) => ({ default: m.AttendanceHistoryPage }))
);
const SchedulePage = lazyWithRetry(() =>
  import('@/pages/app-horario/SchedulePage').then((m) => ({ default: m.SchedulePage }))
);
const ProgramsPage = lazyWithRetry(() =>
  import('@/pages/app-programas/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const ProfilePage = lazyWithRetry(() =>
  import('@/pages/app-perfil/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const AvisosPage = lazyWithRetry(() =>
  import('@/pages/app-avisos/AvisosPage').then((m) => ({ default: m.AvisosPage }))
);
const ForoPage = lazyWithRetry(() =>
  import('@/pages/app-foro/ForoPage').then((m) => ({ default: m.ForoPage }))
);
const FaqsPage = lazyWithRetry(() =>
  import('@/pages/app-faqs/FaqsPage').then((m) => ({ default: m.FaqsPage }))
);
const MediaPage = lazyWithRetry(() =>
  import('@/pages/app-media/MediaPage').then((m) => ({ default: m.MediaPage }))
);
const PersonalPage = lazyWithRetry(() =>
  import('@/pages/admin-personal/PersonalPage').then((m) => ({ default: m.PersonalPage }))
);
const CajaPage = lazyWithRetry(() =>
  import('@/pages/admin-caja/CajaPage').then((m) => ({ default: m.CajaPage }))
);
const SchedulesAdminPage = lazyWithRetry(() =>
  import('@/pages/admin-horarios/SchedulesAdminPage').then((m) => ({ default: m.SchedulesAdminPage }))
);
const TariffsAdminPage = lazyWithRetry(() =>
  import('@/pages/admin-tarifas/TariffsAdminPage').then((m) => ({ default: m.TariffsAdminPage }))
);
const LeadsAdminPage = lazyWithRetry(() =>
  import('@/pages/admin-leads/LeadsAdminPage').then((m) => ({ default: m.LeadsAdminPage }))
);
const AttendanceAdminPage = lazyWithRetry(() =>
  import('@/pages/admin-asistencia/AttendanceAdminPage').then((m) => ({ default: m.AttendanceAdminPage }))
);
const StudentRegistrationPage = lazyWithRetry(() =>
  import('@/pages/admin-alta-alumno/StudentRegistrationPage').then((m) => ({ default: m.StudentRegistrationPage }))
);
const PrivacyPage = lazyWithRetry(() =>
  import('@/pages/public-legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazyWithRetry(() =>
  import('@/pages/public-legal/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const KioskCheckinPage = lazyWithRetry(() =>
  import('@/pages/kiosk-checkin/KioskCheckinPage').then((m) => ({ default: m.KioskCheckinPage }))
);
const SparringTimerPage = lazyWithRetry(() =>
  import('@/pages/app-tools/SparringTimerPage').then((m) => ({ default: m.SparringTimerPage }))
);
const WeightDivisionPage = lazyWithRetry(() =>
  import('@/pages/app-tools/WeightDivisionPage').then((m) => ({ default: m.WeightDivisionPage }))
);
const CurriculumPage = lazyWithRetry(() =>
  import('@/pages/app-tools/CurriculumPage').then((m) => ({ default: m.CurriculumPage }))
);
const SparringLogPage = lazyWithRetry(() =>
  import('@/pages/app-tools/SparringLogPage').then((m) => ({ default: m.SparringLogPage }))
);
const BeltRoadmapPage = lazyWithRetry(() =>
  import('@/pages/app-tools/BeltRoadmapPage').then((m) => ({ default: m.BeltRoadmapPage }))
);

const LazyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RootErrorBoundary>
    <Suspense
      fallback={
        <div className="min-h-screen bg-studio-navy flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  </RootErrorBoundary>
);

export const router = createBrowserRouter([
  // Superficie pública (LandingLayout)
  {
    path: '/',
    element: <LandingLayout />,
    errorElement: <RouteErrorElement />,
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <LandingPage />
          </LazyRoute>
        ),
      },
      {
        path: 'reserva-prueba',
        element: (
          <LazyRoute>
            <TrialClassPage />
          </LazyRoute>
        ),
      },
      {
        path: 'privacidad',
        element: (
          <LazyRoute>
            <PrivacyPage />
          </LazyRoute>
        ),
      },
      {
        path: 'terminos',
        element: (
          <LazyRoute>
            <TermsPage />
          </LazyRoute>
        ),
      },
    ],
  },

  // Login público
  {
    path: '/login',
    errorElement: <RouteErrorElement />,
    element: (
      <LazyRoute>
        <LoginPage />
      </LazyRoute>
    ),
  },

  // Ruta /registro redirige al flujo de reserva y activación de prueba estilo Madrid Deportes
  { path: '/registro', element: <Navigate to="/reserva-prueba" replace /> },

  // App privada del Alumno (AppLayout con bottom-nav móvil)
  {
    path: '/app',
    errorElement: <RouteErrorElement />,
    element: (
      <ProtectedRoute allowedRoles={['student', 'admin']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/home" replace /> },
      {
        path: 'home',
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'horario',
        element: (
          <LazyRoute>
            <SchedulePage />
          </LazyRoute>
        ),
      },
      {
        path: 'historial',
        element: (
          <LazyRoute>
            <AttendanceHistoryPage />
          </LazyRoute>
        ),
      },
      {
        path: 'programas',
        element: (
          <LazyRoute>
            <ProgramsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'perfil',
        element: (
          <LazyRoute>
            <ProfilePage />
          </LazyRoute>
        ),
      },
      {
        path: 'avisos',
        element: (
          <LazyRoute>
            <AvisosPage />
          </LazyRoute>
        ),
      },
      {
        path: 'foro',
        element: (
          <LazyRoute>
            <ForoPage />
          </LazyRoute>
        ),
      },
      {
        path: 'faqs',
        element: (
          <LazyRoute>
            <FaqsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'media',
        element: (
          <LazyRoute>
            <MediaPage />
          </LazyRoute>
        ),
      },
      {
        path: 'cronometro',
        element: (
          <LazyRoute>
            <SparringTimerPage />
          </LazyRoute>
        ),
      },
      {
        path: 'peso',
        element: (
          <LazyRoute>
            <WeightDivisionPage />
          </LazyRoute>
        ),
      },
      {
        path: 'curriculum',
        element: (
          <LazyRoute>
            <CurriculumPage />
          </LazyRoute>
        ),
      },
      {
        path: 'sparring',
        element: (
          <LazyRoute>
            <SparringLogPage />
          </LazyRoute>
        ),
      },
      {
        path: 'cinturon',
        element: (
          <LazyRoute>
            <BeltRoadmapPage />
          </LazyRoute>
        ),
      },
    ],
  },

  // Consola privada del Administrador (AdminLayout con sidebar)
  {
    path: '/admin',
    errorElement: <RouteErrorElement />,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/personal" replace /> },
      {
        path: 'personal',
        element: (
          <LazyRoute>
            <PersonalPage />
          </LazyRoute>
        ),
      },
      {
        path: 'caja',
        element: (
          <LazyRoute>
            <CajaPage />
          </LazyRoute>
        ),
      },
      {
        path: 'asistencia',
        element: (
          <LazyRoute>
            <AttendanceAdminPage />
          </LazyRoute>
        ),
      },
      {
        path: 'horarios',
        element: (
          <LazyRoute>
            <SchedulesAdminPage />
          </LazyRoute>
        ),
      },
      {
        path: 'tarifas',
        element: (
          <LazyRoute>
            <TariffsAdminPage />
          </LazyRoute>
        ),
      },
      {
        path: 'leads',
        element: (
          <LazyRoute>
            <LeadsAdminPage />
          </LazyRoute>
        ),
      },
      {
        path: 'alta-alumno',
        element: (
          <LazyRoute>
            <StudentRegistrationPage />
          </LazyRoute>
        ),
      },
      {
        path: 'cronometro',
        element: (
          <LazyRoute>
            <SparringTimerPage />
          </LazyRoute>
        ),
      },
      {
        path: 'peso',
        element: (
          <LazyRoute>
            <WeightDivisionPage />
          </LazyRoute>
        ),
      },
      {
        path: 'curriculum',
        element: (
          <LazyRoute>
            <CurriculumPage />
          </LazyRoute>
        ),
      },
      {
        path: 'alta-menor',
        element: <Navigate to="/admin/alta-alumno" replace />,
      },
    ],
  },

  // Modo Kiosco (Tablet de recepción)
  {
    path: '/kiosk/check-in',
    errorElement: <RouteErrorElement />,
    element: (
      <ProtectedRoute allowedRoles={['kiosk', 'admin']}>
        <LazyRoute>
          <KioskCheckinPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },

  // Fallback catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);
