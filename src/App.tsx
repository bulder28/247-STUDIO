import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CoachLayout } from '@/layouts/CoachLayout';
import { ClientLayout } from '@/layouts/ClientLayout';
import { AdminHomePage } from '@/pages/admin/AdminHomePage';
import { AdminKpisPage } from '@/pages/admin/AdminKpisPage';
import { AdminTrackingPage } from '@/pages/admin/AdminTrackingPage';
import { AdminStudentsPage } from '@/pages/admin/AdminStudentsPage';
import { AdminPlansPage } from '@/pages/admin/AdminPlansPage';
import { AdminSchedulePage } from '@/pages/admin/AdminSchedulePage';
import { AdminCommunicationPage } from '@/pages/admin/AdminCommunicationPage';
import { CoachAttendancePage } from '@/pages/coach/CoachAttendancePage';
import { ScheduleViewPage } from '@/pages/shared/ScheduleViewPage';
import { ForumViewPage } from '@/pages/shared/ForumViewPage';
import { ClientHomePage } from '@/pages/client/ClientHomePage';
import { ClientProfilePage } from '@/pages/client/ClientProfilePage';
import { ClientPlansPage } from '@/pages/client/ClientPlansPage';
import { ClientForumChatPage } from '@/pages/client/ClientForumChatPage';
import { ClientNoticesPage, ClientFaqsPage } from '@/pages/client/ClientNoticesFaqsPage';

function AppRoutes() {
  const { user, profile, loading, isPasswordRecovery, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-navy-deep text-slate-400 text-sm">
        Cargando 247 STUDIO...
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
      <div className="min-h-screen flex items-center justify-center bg-studio-navy-deep px-4">
        <div className="w-full max-w-md rounded-2xl bg-studio-navy border border-white/15 p-7 text-center space-y-4">
          <h1 className="font-headline text-2xl uppercase text-white">Cuenta desactivada</h1>
          <p className="text-sm text-slate-300">
            Tu ficha en <strong>247 STUDIO</strong> figura actualmente en estado de baja.
            Contacta con Mario o David en recepción si deseas reactivar tu acceso.
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2.5 text-sm font-semibold text-white transition"
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
              <Routes>
                <Route path="" element={<AdminHomePage />} />
                <Route path="kpis" element={<AdminKpisPage />} />
                <Route path="pasar-lista" element={<CoachAttendancePage />} />
                <Route path="seguimiento" element={<AdminTrackingPage />} />
                <Route path="alumnos" element={<AdminStudentsPage />} />
                <Route path="tarifas" element={<AdminPlansPage />} />
                <Route path="horarios" element={<AdminSchedulePage />} />
                <Route path="comunicacion" element={<AdminCommunicationPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminLayout>
          }
        />
      )}
      {profile?.role === 'coach' && (
        <Route
          path="/coach/*"
          element={
            <CoachLayout>
              <Routes>
                <Route path="" element={<CoachAttendancePage />} />
                <Route path="horario" element={<ScheduleViewPage />} />
                <Route path="foro" element={<ForumViewPage />} />
                <Route path="*" element={<Navigate to="/coach" replace />} />
              </Routes>
            </CoachLayout>
          }
        />
      )}
      {profile?.role === 'client' && (
        <Route
          path="/app/*"
          element={
            <ClientLayout>
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
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
