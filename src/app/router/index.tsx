import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { AdminLayout } from '@/widgets/AdminLayout';
import { AppLayout } from '@/widgets/AppLayout';
import { LandingLayout } from '@/widgets/LandingLayout';

// Lazy loading por ruta (Code Splitting)
const LandingPage = React.lazy(() =>
  import('@/pages/public-landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const TrialClassPage = React.lazy(() =>
  import('@/pages/public-reserva-prueba/TrialClassPage').then((m) => ({ default: m.TrialClassPage }))
);
const LoginPage = React.lazy(() =>
  import('@/pages/public-login/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const HomePage = React.lazy(() =>
  import('@/pages/app-home/HomePage').then((m) => ({ default: m.HomePage }))
);
const AttendanceHistoryPage = React.lazy(() =>
  import('@/pages/app-historial/AttendanceHistoryPage').then((m) => ({ default: m.AttendanceHistoryPage }))
);
const SchedulePage = React.lazy(() =>
  import('@/pages/app-horario/SchedulePage').then((m) => ({ default: m.SchedulePage }))
);
const ProgramsPage = React.lazy(() =>
  import('@/pages/app-programas/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const ProfilePage = React.lazy(() =>
  import('@/pages/app-perfil/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const AvisosPage = React.lazy(() =>
  import('@/pages/app-avisos/AvisosPage').then((m) => ({ default: m.AvisosPage }))
);
const ForoPage = React.lazy(() =>
  import('@/pages/app-foro/ForoPage').then((m) => ({ default: m.ForoPage }))
);
const FaqsPage = React.lazy(() =>
  import('@/pages/app-faqs/FaqsPage').then((m) => ({ default: m.FaqsPage }))
);
const MediaPage = React.lazy(() =>
  import('@/pages/app-media/MediaPage').then((m) => ({ default: m.MediaPage }))
);
const PersonalPage = React.lazy(() =>
  import('@/pages/admin-personal/PersonalPage').then((m) => ({ default: m.PersonalPage }))
);
const CajaPage = React.lazy(() =>
  import('@/pages/admin-caja/CajaPage').then((m) => ({ default: m.CajaPage }))
);
const SchedulesAdminPage = React.lazy(() =>
  import('@/pages/admin-horarios/SchedulesAdminPage').then((m) => ({ default: m.SchedulesAdminPage }))
);
const TariffsAdminPage = React.lazy(() =>
  import('@/pages/admin-tarifas/TariffsAdminPage').then((m) => ({ default: m.TariffsAdminPage }))
);
const LeadsAdminPage = React.lazy(() =>
  import('@/pages/admin-leads/LeadsAdminPage').then((m) => ({ default: m.LeadsAdminPage }))
);
const AttendanceAdminPage = React.lazy(() =>
  import('@/pages/admin-asistencia/AttendanceAdminPage').then((m) => ({ default: m.AttendanceAdminPage }))
);
const StudentRegistrationPage = React.lazy(() =>
  import('@/pages/admin-alta-alumno/StudentRegistrationPage').then((m) => ({ default: m.StudentRegistrationPage }))
);
const PrivacyPage = React.lazy(() =>
  import('@/pages/public-legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = React.lazy(() =>
  import('@/pages/public-legal/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const KioskCheckinPage = React.lazy(() =>
  import('@/pages/kiosk-checkin/KioskCheckinPage').then((m) => ({ default: m.KioskCheckinPage }))
);
const SparringTimerPage = React.lazy(() =>
  import('@/pages/app-tools/SparringTimerPage').then((m) => ({ default: m.SparringTimerPage }))
);
const WeightDivisionPage = React.lazy(() =>
  import('@/pages/app-tools/WeightDivisionPage').then((m) => ({ default: m.WeightDivisionPage }))
);
const CurriculumPage = React.lazy(() =>
  import('@/pages/app-tools/CurriculumPage').then((m) => ({ default: m.CurriculumPage }))
);
const SparringLogPage = React.lazy(() =>
  import('@/pages/app-tools/SparringLogPage').then((m) => ({ default: m.SparringLogPage }))
);
const BeltRoadmapPage = React.lazy(() =>
  import('@/pages/app-tools/BeltRoadmapPage').then((m) => ({ default: m.BeltRoadmapPage }))
);

const LazyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-studio-navy flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  // Superficie pública (LandingLayout)
  {
    path: '/',
    element: <LandingLayout />,
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
    element: (
      <LazyRoute>
        <LoginPage />
      </LazyRoute>
    ),
  },

  // Ruta /registro eliminada: redirige a la raíz /
  { path: '/registro', element: <Navigate to="/" replace /> },

  // App privada del Alumno (AppLayout con bottom-nav móvil)
  {
    path: '/app',
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
