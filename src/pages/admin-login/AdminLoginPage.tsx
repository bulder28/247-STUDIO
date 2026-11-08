import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { auth } from '@/shared/api/firebase';
import { Role } from '@/shared/domain/types';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificación de email
  const [unverifiedUser, setUnverifiedUser] = useState<any | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Modal recuperación de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Si ya está autenticado como admin, redirigir a panel admin
  useEffect(() => {
    if (!authLoading && user && role === 'admin') {
      navigate('/admin/personal', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedUser(null);
    setVerificationSent(false);
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // Verificación estricta de Custom Claim de Firebase Admin
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as Role) || 'student';

      if (userRole !== 'admin') {
        // Bloqueo y cierre de sesión inmediato (fail-closed)
        await signOut(auth);
        setError(
          'Acceso denegado: Esta consola es de uso exclusivo para la Dirección de 247Studio. Si eres profesor accede por /staff/login o si eres alumno por /login.'
        );
        return;
      }

      // Advertencia de seguridad si el correo de dirección no está verificado
      if (!userCredential.user.emailVerified) {
        setUnverifiedUser(userCredential.user);
      }

      navigate('/admin/personal', { replace: true });
    } catch (err: unknown) {
      console.error('Error en admin login:', err);
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential')
      ) {
        setError('Credenciales de dirección incorrectas. Revisa tu email y contraseña.');
      } else if (msg.includes('too-many-requests')) {
        setError('Demasiados intentos fallidos. Por seguridad, la cuenta se ha bloqueado temporalmente.');
      } else {
        setError('No se pudo verificar la sesión de dirección. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      setVerificationSent(true);
    } catch (err) {
      console.error('Error sending verification email:', err);
      setError('No se pudo enviar el correo de verificación. Inténtalo más tarde.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSubmitting(true);

    try {
      const cleanEmail = resetEmail.trim().toLowerCase();
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      console.error('Error en reset password:', err);
      setResetError('No se pudo procesar la solicitud. Verifica la dirección de correo.');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Fondo decorativo de alta seguridad */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Cabecera Consola de Dirección */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-mono uppercase tracking-widest mb-3">
            <Shield className="w-3.5 h-3.5" /> Consola de Dirección
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            247 STUDIO
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Acceso administrativo reservado a los directores del centro.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {unverifiedUser && !verificationSent && (
          <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email de dirección no verificado</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Recomendamos verificar tu dirección de correo para auditorías de seguridad.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="px-3 py-1.5 bg-amber-500 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider hover:bg-amber-400 transition"
            >
              Reenviar enlace de verificación
            </button>
          </div>
        )}

        {verificationSent && (
          <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Enlace de verificación enviado a tu bandeja de entrada.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Email de Director
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="director@247studio.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition pr-10"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition pr-10 font-mono"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Acceder a Dirección</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">
            ¿Eres profesor o coach?{' '}
            <Link to="/staff/login" className="text-amber-400 hover:text-amber-300 font-bold">
              Entrada Staff →
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            ¿Eres alumno?{' '}
            <Link to="/login" className="text-slate-400 hover:text-white">
              Portal de Alumnos
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Recuperación de Contraseña */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Recuperar Clave
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Ingresa el correo de dirección para recibir el enlace de restablecimiento seguro.
            </p>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Enlace enviado a {resetEmail}. Revisa tu bandeja.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2.5 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-700 transition"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                    {resetError}
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    placeholder="director@247studio.es"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex-1 py-2.5 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
                  >
                    {resetSubmitting ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

