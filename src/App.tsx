import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CoachLayout } from '@/layouts/CoachLayout';
import { ClientLayout } from '@/layouts/ClientLayout';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';

// Carga diferida por pantalla para que en móvil cada rol descargue solo lo suyo
const AdminHomePage = lazy(() =>
  import('@/pages/admin/AdminHomePage').then((m) => ({ default: m.AdminHomePage }))
);
const AdminKpisPage = lazy(() =>
  import('@/pages/admin/AdminKpisPage').then((m) => ({ default: m.AdminKpisPage }))
);
const AdminTrackingPage = lazy(() =>
  import('@/pages/admin/AdminTrackingPage').then((m) => ({ default: m.AdminTrackingPage }))
);
const AdminPacksPage = lazy(() =>
  import('@/pages/admin/AdminPacksPage').then((m) => ({ default: m.AdminPacksPage }))
);
const AdminStudentsPage = lazy(() =>
  import('@/pages/admin/AdminStudentsPage').then((m) => ({ default: m.AdminStudentsPage }))
);
const AdminPlansPage = lazy(() =>
  import('@/pages/admin/AdminPlansPage').then((m) => ({ default: m.AdminPlansPage }))
);
const AdminSchedulePage = lazy(() =>
  import('@/pages/admin/AdminSchedulePage').then((m) => ({ default: m.AdminSchedulePage }))
);
const AdminCommunicationPage = lazy(() =>
  import('@/pages/admin/AdminCommunicationPage').then((m) => ({ default: m.AdminCommunicationPage }))
);
const AdminFinancePage = lazy(() =>
  import('@/pages/admin/finance/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage }))
);
const CoachAttendancePage = lazy(() =>
  import('@/pages/coach/CoachAttendancePage').then((m) => ({ default: m.CoachAttendancePage }))
);
const CoachRatingsPage = lazy(() =>
  import('@/pages/coach/CoachRatingsPage').then((m) => ({ default: m.CoachRatingsPage }))
);
const ScheduleViewPage = lazy(() =>
  import('@/pages/shared/ScheduleViewPage').then((m) => ({ default: m.ScheduleViewPage }))
);
const ForumViewPage = lazy(() =>
  import('@/pages/shared/ForumViewPage').then((m) => ({ default: m.ForumViewPage }))
);
const ClientHomePage = lazy(() =>
  import('@/pages/client/ClientHomePage').then((m) => ({ default: m.ClientHomePage }))
);
const ClientProfilePage = lazy(() =>
  import('@/pages/client/ClientProfilePage').then((m) => ({ default: m.ClientProfilePage }))
);
const ClientPlansPage = lazy(() =>
  import('@/pages/client/ClientPlansPage').then((m) => ({ default: m.ClientPlansPage }))
);
const ClientForumChatPage = lazy(() =>
  import('@/pages/client/ClientForumChatPage').then((m) => ({ default: m.ClientForumChatPage }))
);
const ClientNoticesPage = lazy(() =>
  import('@/pages/client/ClientNoticesFaqsPage').then((m) => ({ default: m.ClientNoticesPage }))
);
const ClientFaqsPage = lazy(() =>
  import('@/pages/client/ClientNoticesFaqsPage').then((m) => ({ default: m.ClientFaqsPage }))
);

function RouteFallback() {
  return (
    <div
      className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs"
      role="status"
      aria-live="polite"
    >
      <span className="w-7 h-7 rounded-full border-2 border-white/15 border-t-studio-red animate-spin" aria-hidden />
      <span>Cargando…</span>
    </div>
  );
}

function AppRoutes() {
  const { user, profile, loading, isPasswordRecovery, signOut } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 text-slate-400 text-sm"
        role="status"
        aria-live="polite"
      >
        <div className="relative">
          <span className="absolute inset-0 rounded-2xl bg-studio-red/30 blur-xl animate-pulse" aria-hidden />
          <img
            src="/logo.webp"
            alt=""
            className="relative w-16 h-16 rounded-2xl object-contain bg-white/5 border border-white/10 p-1.5"
          />
        </div>
        <span className="font-headline uppercase tracking-[0.2em] text-xs text-slate-300">
          Cargando 247 STUDIO
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (profile?.role === 'client' && profile?.status === 'inactive') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl studio-panel border border-white/15 p-7 text-center space-y-4">
          <h1 className="font-headline text-2xl uppercase text-white">Cuenta desactivada</h1>
          <p className="text-sm text-slate-300">
            Tu ficha en <strong>247 STUDIO</strong> figura actualmente en estado de baja.
            Contacta con Mario o David en recepción si deseas reactivar tu acceso.
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-xl studio-btn px-4 py-2.5 text-sm font-semibold text-white transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery || profile?.must_change_password) {
    return <SetPasswordPage />;
  }

  const homeByRole =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'coach'
        ? '/coach'
        : '/app';

  return (
    <Routes>
      {profile?.role === 'admin' && (
        <Route
          path="/admin/*"
          element={
            <AdminLayout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="" element={<AdminHomePage />} />
                  <Route path="kpis" element={<AdminKpisPage />} />
                  <Route path="pasar-lista" element={<CoachAttendancePage />} />
                  <Route path="seguimiento" element={<AdminTrackingPage />} />
                  <Route path="bonos" element={<AdminPacksPage />} />
                  <Route path="alumnos" element={<AdminStudentsPage />} />
                  <Route path="tarifas" element={<AdminPlansPage />} />
                  <Route path="horarios" element={<AdminSchedulePage />} />
                  <Route path="comunicacion" element={<AdminCommunicationPage />} />
                  <Route path="finanzas" element={<AdminFinancePage tab="resumen" />} />
                  <Route path="finanzas/gastos" element={<AdminFinancePage tab="gastos" />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Suspense>
            </AdminLayout>
          }
        />
      )}
      {profile?.role === 'coach' && (
        <Route
          path="/coach/*"
          element={
            <CoachLayout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="" element={<CoachAttendancePage />} />
                  <Route path="horario" element={<ScheduleViewPage />} />
                  <Route path="foro" element={<ForumViewPage />} />
                  <Route path="valorar" element={<CoachRatingsPage />} />
                  <Route path="*" element={<Navigate to="/coach" replace />} />
                </Routes>
              </Suspense>
            </CoachLayout>
          }
        />
      )}
      {profile?.role === 'client' && (
        <Route
          path="/app/*"
          element={
            <ClientLayout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="" element={<ClientHomePage />} />
                  <Route path="horario" element={<ScheduleViewPage />} />
                  <Route path="tarifas" element={<ClientPlansPage />} />
                  <Route path="foro" element={<ClientForumChatPage />} />
                  <Route path="avisos" element={<ClientNoticesPage />} />
                  <Route path="faqs" element={<ClientFaqsPage />} />
                  <Route path="perfil" element={<ClientProfilePage />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </Suspense>
            </ClientLayout>
          }
        />
      )}
      <Route path="*" element={<Navigate to={homeByRole} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <PwaInstallBanner />
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
