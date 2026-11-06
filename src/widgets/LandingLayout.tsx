import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const LandingLayout: React.FC = () => {
  const { user, userData, role } = useAuth();

  const getPanelLink = () => {
    if (role === 'admin') return '/admin/personal';
    if (role === 'kiosk') return '/kiosk/check-in';
    return '/app/home';
  };

  return (
    <div className="min-h-screen bg-studio-navy text-white flex flex-col">
      <header className="sticky top-0 z-40 bg-studio-navy border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="w-9 h-9" />
            <span className="font-display text-[1.65rem] text-white">247Studio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[15px] font-medium text-studio-cream">
            <a href="/#programas" className="hover:text-white">Programas</a>
            <a href="/#horario" className="hover:text-white">Horario</a>
            <a href="/#instructores" className="hover:text-white">Instructores</a>
            <a
              href="https://www.247studiobjj.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white inline-flex items-center gap-1.5"
            >
              <span>Web oficial</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to={getPanelLink()}
                className="rounded-xl bg-studio-red px-4 py-2.5 text-sm font-bold text-white hover:bg-studio-red-dark"
              >
                <span>{userData ? `Hola, ${userData.alias} — Ir a mi panel` : 'Ir a mi panel'}</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 hover:border-white/40"
                >
                  Acceder
                </Link>
                <Link
                  to="/reserva-prueba"
                  className="hidden sm:inline-flex rounded-xl bg-studio-red px-4 py-2 text-sm font-bold text-white hover:bg-studio-red-dark transition"
                >
                  Clase de prueba
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-studio-navy-deep">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="w-8 h-8" />
              <span className="font-display text-2xl text-white">247Studio</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-studio-cream/75">
              Brazilian jiu-jitsu, grappling, MMA y lucha en Madrid.
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-studio-cream">
            <li><Link to="/reserva-prueba" className="hover:text-white">Reservar clase de prueba</Link></li>
            <li><Link to="/login" className="hover:text-white">Acceso alumnos</Link></li>
            <li><Link to="/privacidad" className="hover:text-white text-xs opacity-70">Política de privacidad</Link></li>
            <li><Link to="/terminos" className="hover:text-white text-xs opacity-70">Términos y condiciones</Link></li>
          </ul>

          <ul className="space-y-2.5 text-sm text-studio-cream">
            <li>
              <a
                href="https://www.247studiobjj.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white inline-flex items-center gap-1.5"
              >
                <span>247studiobjj.com</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
              </a>
            </li>
            <li className="text-studio-cream/60">© {new Date().getFullYear()} 247Studio</li>
          </ul>
        </div>
      </footer>
    </div>
  );
};
