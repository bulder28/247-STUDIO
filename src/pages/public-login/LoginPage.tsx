import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { KeyRound, Mail } from 'lucide-react';
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

export function getDefaultHomeByRole(role: Role | null): string {
  if (role === 'admin') return '/admin/personal';
  if (role === 'kiosk') return '/kiosk/check-in';
  return '/app/home';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');

  // Guarda: Si el usuario ya está autenticado, redirigir automáticamente
  useEffect(() => {
    if (!authLoading && user) {
      const destination = getSafeRedirect(redirectParam, role) || getDefaultHomeByRole(role);
      navigate(destination, { replace: true });
    }
  }, [user, role, authLoading, redirectParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as Role) || 'student';

      const destination = getSafeRedirect(redirectParam, userRole) || getDefaultHomeByRole(userRole);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      setError('Credenciales no válidas o error de conexión. Verifica tu email y contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as Role) || 'student';

      const destination = getSafeRedirect(redirectParam, userRole) || getDefaultHomeByRole(userRole);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === 'auth/unauthorized-domain') {
        setError('El dominio "247studio.netlify.app" debe agregarse a "Dominios autorizados" en la consola de Firebase Authentication.');
      } else if (firebaseError?.code === 'auth/operation-not-allowed') {
        setError('El proveedor Google no está habilitado en Authentication > Sign-in method de Firebase.');
      } else if (firebaseError?.code === 'auth/popup-closed-by-user') {
        setError('Acceso cancelado: se cerró la ventana de Google antes de finalizar.');
      } else {
        setError(`No se pudo completar el acceso con Google (${firebaseError?.code || 'error desconocido'}).`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin" />
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
            <div role="alert" className="mt-5 rounded-xl bg-brand-accent/15 border border-brand-accent/40 p-3 text-xs font-bold text-brand-accent">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-text/20 bg-white py-3 text-sm font-bold text-brand-text hover:bg-brand-text/5 transition disabled:opacity-50 shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continuar con Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-brand-text/15" />
            <span className="text-[11px] font-headline uppercase tracking-wider text-brand-text/50">o con tu email</span>
            <span className="h-px flex-1 bg-brand-text/15" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-headline font-bold uppercase tracking-wider text-brand-text">
                Contraseña
              </label>
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
              disabled={submitting}
              className="cta-button w-full py-3.5 text-base mt-2"
            >
              {submitting ? 'Verificando…' : 'Entrar a mi Panel'}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-brand-text/10 space-y-2 text-center text-xs">
            <p>
              ¿Aún no eres alumno?{' '}
              <Link to="/reserva-prueba" className="font-bold text-brand-accent hover:underline">
                Reserva tu clase de prueba gratuita
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
    </div>
  );
};