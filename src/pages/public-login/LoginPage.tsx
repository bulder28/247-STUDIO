import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { CheckCircle2, KeyRound, Mail, X } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Belt } from '@/widgets/Belt';
import { auth } from '@/shared/api/firebase';
import { Role } from '@/shared/domain/types';

export function getSafeRedirect(redirectParam: string | null, role: Role | null): string | null {
  if (!redirectParam) return null;
  const decoded = decodeURIComponent(redirectParam).trim();

  // Prohibir open redirect: rechazar absolutas (http, https, //)
  if (
    decoded.startsWith('http://') ||
    decoded.startsWith('https://') ||
    decoded.startsWith('//')
  ) {
    return null;
  }

  // Whitelist de prefijos permitidos
  const isWhitelisted =
    decoded.startsWith('/app') ||
    decoded.startsWith('/admin') ||
    decoded.startsWith('/kiosk');

  if (!isWhitelisted) return null;

  // Validación de coincidencia de rol
  if (role === 'student' && !decoded.startsWith('/app')) {
    return null;
  }
  if (role === 'kiosk' && !decoded.startsWith('/kiosk')) {
    return null;
  }

  return decoded;
}

export function getDefaultHomeByRole(role: Role | null, isMobile = false): string {
  if (role === 'kiosk') return '/kiosk/check-in';
  if (role === 'coach') return '/admin/asistencia';
  if (role === 'admin') return '/admin/personal';
  if (isMobile) {
    // En smartphone/móvil, tanto atletas como staff entran al horario y carnet virtual QR
    return '/app/horario';
  }
  return '/app/home';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  return isMobileUA || (isTouch && window.innerWidth <= 768);
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para modal de recuperación de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');

  // Guarda: Si el usuario ya está autenticado, redirigir automáticamente
  useEffect(() => {
    if (user && role) {
      const destination = getSafeRedirect(redirectParam, role) || getDefaultHomeByRole(role, isMobileDevice());
      navigate(destination, { replace: true });
    }
  }, [user, role, redirectParam, navigate]);

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
      console.error('Error enviando reseteo de contraseña:', err);
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === 'auth/user-not-found') {
        setResetError('No existe ninguna cuenta registrada con este correo.');
      } else if (firebaseError?.code === 'auth/invalid-email') {
        setResetError('El formato del correo electrónico no es válido.');
      } else {
        setResetError('No se pudo enviar el correo de recuperación. Inténtalo de nuevo.');
      }
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as Role) || 'student';

      const destination = getSafeRedirect(redirectParam, userRole) || getDefaultHomeByRole(userRole, isMobileDevice());
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      setError('Credenciales no válidas o error de conexión. Verifica tu email y contraseña.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-background flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-headline font-bold uppercase tracking-widest text-brand-text/70 animate-pulse">
          Conectando con 247Studio...
        </p>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-xl border border-brand-text/25 bg-white py-3 pl-10 pr-4 text-sm text-brand-text placeholder-brand-text/40 focus:border-brand-text focus:outline-none';

  return (
    <div className="min-h-screen bg-brand-background lg:grid lg:grid-cols-12">
      {/* Lado de marca con fondo oscuro marcial */}
      <div className="lg:col-span-5 bg-brand-text text-brand-background px-6 pt-10 pb-12 sm:px-12 flex flex-col justify-between relative overflow-hidden">
        {/* Fondo sutil marcial */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img src="/herobackground.webp" alt="" className="w-full h-full object-cover filter grayscale" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/logo.webp" alt="247Studio" className="h-10 w-10 object-contain brightness-110" />
            <div>
              <span className="font-headline text-2xl uppercase tracking-tighter text-white block leading-none">
                247STUDIO
              </span>
              <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-brand-accent block mt-0.5">
                Área de Alumnos
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 my-10 lg:my-0">
          <span className="text-xs font-headline font-bold uppercase tracking-widest text-brand-accent block mb-2">
            Portal Oficial de Miembros
          </span>
          <h1 className="font-headline text-5xl sm:text-6xl uppercase text-white tracking-tight leading-[0.95]">
            Vuelves al <br />Tatami.
          </h1>
          <p className="mt-4 text-sm text-brand-background/80 max-w-sm leading-relaxed">
            Consulta tus asistencias, reservas de clase, estado de cuota y pase QR para el kiosco.
          </p>
          <div className="mt-6 max-w-xs">
            <Belt belt="WHITE" stripes={0} decorative />
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-brand-background/10 flex items-center justify-between text-xs text-brand-background/60">
          <span>Pinto, Madrid Sur</span>
          <span>© 247Studio</span>
        </div>
      </div>

      {/* Formulario en panel cálido tatami */}
      <div className="lg:col-span-7 bg-brand-background px-6 py-12 sm:px-12 flex items-center justify-center">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-brand-text/15 shadow-xl">
          <h2 className="font-headline text-3xl sm:text-4xl uppercase tracking-tight text-brand-text">
            Iniciar Sesión
          </h2>
          <p className="text-xs text-brand-text/75 mt-1">
            Introduce tus credenciales para acceder a tu panel.
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs font-bold text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-headline font-bold uppercase tracking-wider text-brand-text">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-text/40" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError(null);
                    setResetSuccess(false);
                    setShowResetModal(true);
                  }}
                  className="text-xs text-brand-accent hover:underline font-semibold cursor-pointer"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-text/40" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={emailSubmitting}
              className="cta-button w-full py-3.5 text-base mt-2"
            >
              {emailSubmitting ? 'Verificando…' : 'Entrar a mi Panel'}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-brand-text/10 space-y-2 text-center text-xs">
            <p className="text-xs text-brand-text/80">
              ¿Quieres probar una clase gratis?{' '}
              <Link to="/reserva-prueba" className="font-bold text-brand-accent hover:underline block sm:inline mt-0.5">
                Reserva tu clase de prueba →
              </Link>
            </p>
            <p className="text-xs text-brand-text/80">
              ¿Nuevo alumno?{' '}
              <Link to="/registro" className="font-bold text-slate-800 hover:underline block sm:inline mt-0.5">
                Crear cuenta de alumno →
              </Link>
            </p>
            <p>
              <Link to="/" className="text-brand-text/60 hover:text-brand-text">
                ← Volver a la portada principal
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal MatGoat para Recuperación de Contraseña */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-slate-900 uppercase tracking-wide">
                Recuperar Contraseña
              </h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 leading-relaxed">
                    <p className="font-bold mb-1">¡Correo enviado con éxito!</p>
                    <p>
                      Hemos enviado un enlace seguro a{' '}
                      <span className="font-semibold underline">{resetEmail || email}</span>.
                      Revisa tu bandeja de entrada o spam para restablecer tu clave.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Entendido, volver al login
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Introduce el correo electrónico vinculado a tu cuenta en 247Studio y te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>

                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {resetError}
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-brand-accent/25 disabled:opacity-50 cursor-pointer"
                  >
                    {resetSubmitting ? 'Enviando…' : 'Enviar Enlace'}
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