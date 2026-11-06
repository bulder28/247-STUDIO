import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
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
      setError('No se pudo completar el acceso con Google. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-studio-navy flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-navy flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-studio-navy-light/90 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:opacity-90 transition">
            <img src="/logo.svg" alt="247Studio" className="w-14 h-14 mx-auto mb-3 rounded-2xl shadow-lg" />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">247Studio WebApp</h1>
          <p className="text-xs text-studio-cream/70 mt-1">Acceso a alumnos y administración</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-studio-red/15 border border-studio-red/40 rounded-xl text-xs text-studio-red font-bold">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2.5 disabled:opacity-50 mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continuar con Google
        </button>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-[#1a203f] px-3 text-[10px] uppercase font-bold text-studio-cream/50">
            o con tu correo
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-studio-cream/50 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alumno@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 bg-studio-navy border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-studio-red transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-studio-cream/50 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-studio-navy border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-studio-red transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/20 disabled:opacity-50"
          >
            {submitting ? 'Accediendo...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
          <p className="text-xs text-studio-cream/80">
            ¿Primera vez en 247Studio?{' '}
            <Link to="/reserva-prueba" className="text-studio-red hover:underline font-bold">
              Reserva una clase de prueba gratis
            </Link>
          </p>
          <p className="text-xs text-studio-cream/60">
            <Link to="/" className="text-studio-cream/70 hover:text-white underline">
              ← Volver a la página principal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
