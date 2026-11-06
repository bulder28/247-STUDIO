import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowRight, ExternalLink, User } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const LandingLayout: React.FC = () => {
  const { user, userData, role } = useAuth();

  const getPanelLink = () => {
    if (role === 'admin') return '/admin/personal';
    if (role === 'kiosk') return '/kiosk/check-in';
    return '/app/home';
  };

  return (
    <div className="min-h-screen bg-studio-navy text-white flex flex-col justify-between">
      {/* Header Landing */}
      <header className="sticky top-0 z-40 bg-studio-navy/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="247Studio Logo" className="w-9 h-9 rounded-xl shadow transition group-hover:scale-105" />
            <div>
              <span className="font-black text-base tracking-widest uppercase text-white block">247Studio</span>
              <span className="text-[10px] text-studio-cream/70 font-semibold block tracking-wider">BJJ & Grappling Academy</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-studio-cream/80">
            <a href="/#programas" className="hover:text-white transition">Programas</a>
            <a href="/#horario" className="hover:text-white transition">Horario</a>
            <a href="/#instructores" className="hover:text-white transition">Instructores</a>
            <a href="https://www.247studiobjj.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center gap-1">
              <span>Web Oficial</span>
              <ExternalLink className="w-3 h-3 text-studio-cream/50" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={getPanelLink()}
                className="py-2 px-4 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-studio-red/20 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  {userData ? `Hola, ${userData.alias} — Ir a mi panel` : 'Ir a mi panel'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="py-2 px-3.5 rounded-xl border border-white/15 text-xs font-bold text-studio-cream hover:text-white hover:bg-white/5 transition"
                >
                  Acceder
                </Link>
                <Link
                  to="/reserva-prueba"
                  className="hidden sm:inline-flex py-2 px-4 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-studio-red/20"
                >
                  Clase de Prueba
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer Landing */}
      <footer className="bg-studio-navy-light/80 border-t border-white/10 px-4 sm:px-8 py-10 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
              <img src="/logo.svg" alt="247Studio" className="w-7 h-7 rounded-lg" />
              <span className="font-black text-sm uppercase tracking-wider text-white">247Studio BJJ</span>
            </div>
            <p className="text-xs text-studio-cream/60 max-w-sm">
              Academia especializada en Brazilian Jiu-Jitsu, Grappling, MMA y Lucha en Madrid.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-studio-cream/70 font-semibold">
            <a
              href="https://www.247studiobjj.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-studio-cream hover:text-white font-bold flex items-center gap-1 underline underline-offset-4"
            >
              <span>Web oficial (247studiobjj.com)</span>
              <ExternalLink className="w-3 h-3 text-studio-cream/60" />
            </a>
            <Link to="/reserva-prueba" className="hover:text-white transition">Reserva de Prueba</Link>
            <Link to="/login" className="hover:text-white transition">Acceso Alumnos</Link>
          </div>

          <div className="text-xs text-studio-cream/50">
            © {new Date().getFullYear()} 247Studio. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
