import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ArrowRight, KeyRound, Lock, Mail, ShieldAlert, UserCheck } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { auth } from '@/shared/api/firebase';
import { Role } from '@/shared/domain/types';

export const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal recuperación de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Si ya está autenticado como coach o admin, redirigir a asistencia
  useEffect(() => {
    if (!authLoading && user && (role === 'coach' || role === 'admin')) {
      navigate('/admin/asistencia', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // Verificación estricta de Custom Claim
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as Role) || 'student';

      if (userRole !== 'coach' && userRole !== 'admin') {
        // Bloqueo y cierre de sesión inmediato
        await signOut(auth);
        setError(
          'Esta entrada es exclusiva para el equipo técnico y profesores de 247Studio. Si eres alumno, por favor accede desde el portal de alumnos (/login).'
        );
        return;
      }

      navigate('/admin/asistencia', { replace: true });
    } catch (err: unknown) {
      console.error('Error en staff login:', err);
      const fbErr = err as { code?: string };
      if (fbErr?.code === 'auth/invalid-credential' || fbErr?.code === 'auth/user-not-found' || fbErr?.code === 'auth/wrong-password') {
        setError('Correo electrónico o contraseña incorrectos.');
      } else {
        setError('No se pudo verificar el acceso. Comprueba tu conexión o contacta con administración.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setResetError('Por favor introduce tu dirección de correo electrónico.');
      return;
    }

    setResetSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      setResetError('No se pudo enviar el correo de recuperación. Verifica el correo indicado.');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col justify-between p-4 sm:p-8 font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Cabecera */}
      <header className="max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-xs">
            247
          </div>
          <span className="font-headline font-black text-lg tracking-wider text-white uppercase group-hover:text-amber-400 transition">
            247Studio
          </span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
          <UserCheck className="w-3 h-3" /> Equipo Técnico
        </div>
      </header>

      {/* Tarjeta de Inicio de Sesión */}
      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-black uppercase tracking-tight text-white">
              Portal de Profesores
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pase de lista, gestión de tatami y herramientas técnicas de clase.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Correo Electrónico de Profesor
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="profesor@247studio.com"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Tatami</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-xs text-slate-400">
              ¿Eres alumno?{' '}
              <Link to="/login" className="text-amber-400 font-bold hover:underline">
                Acceder al portal de atletas →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Modal de Recuperación */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Recuperar Contraseña de Staff</h3>
            <p className="text-xs text-slate-400">
              Introduce tu correo corporativo y te enviaremos un enlace oficial de restablecimiento.
            </p>
            {resetSuccess ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                ✓ Correo enviado. Revisa tu bandeja de entrada o spam.
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail || email}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="profesor@247studio.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
                {resetError && <span className="text-xs text-rose-400">{resetError}</span>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400"
                  >
                    {resetSubmitting ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Pie */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-600 pb-2">
        247Studio Pinto · Sistema de Gestión de Tatami
      </footer>
    </div>
  );
};
