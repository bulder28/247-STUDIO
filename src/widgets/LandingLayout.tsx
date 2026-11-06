import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ExternalLink, MessageCircle, MapPin } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const LandingLayout: React.FC = () => {
  const { user, userData, role } = useAuth();

  const getPanelLink = () => {
    if (role === 'admin') return '/admin/personal';
    if (role === 'kiosk') return '/kiosk/check-in';
    return '/app/home';
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex flex-col font-sans">
      {/* Cabecera cristalizada sobre fondo tatami cálido */}
      <header className="sticky top-0 z-50 bg-brand-background/90 backdrop-blur-md border-b border-brand-text/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2.5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.webp" alt="247Studio" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-headline text-2xl tracking-tighter uppercase text-brand-text block leading-none">
                247STUDIO
              </span>
              <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-brand-accent block mt-0.5">
                Unlimited Grappling
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold tracking-tight text-brand-text">
            <a href="/#programas" className="hover:text-brand-accent transition-colors">Programas</a>
            <a href="/#filosofia" className="hover:text-brand-accent transition-colors">Filosofía</a>
            <a href="/#horario" className="hover:text-brand-accent transition-colors">Horarios</a>
            <a href="/#instructores" className="hover:text-brand-accent transition-colors">Instructores</a>
            <a
              href="https://www.247studiobjj.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-accent inline-flex items-center gap-1 transition-colors opacity-80"
            >
              <span>Web oficial</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to={getPanelLink()}
                className="inline-flex items-center justify-center rounded-xl bg-brand-accent px-4 py-2 text-xs sm:text-sm font-headline tracking-tight text-white hover:bg-brand-accent-dark transition shadow-sm"
              >
                <span>{userData ? `Mi Panel (${userData.alias})` : 'Mi Panel'}</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="cta-soft py-2 px-3.5 text-xs sm:text-sm"
                >
                  Acceder
                </Link>
                <Link
                  to="/reserva-prueba"
                  className="cta-button py-2 px-4 text-xs sm:text-sm hidden sm:inline-flex"
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

      {/* Pie de página con contraste en tinta oscura oficial */}
      <footer className="bg-brand-text text-brand-background border-t border-brand-background/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="247Studio" className="w-10 h-10 object-contain brightness-110" />
              <div>
                <span className="font-headline text-2xl tracking-tighter uppercase text-white block leading-none">
                  247STUDIO
                </span>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-brand-accent block mt-0.5">
                  Unlimited Grappling
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-background/80">
              Academia de Brazilian Jiu-Jitsu, Grappling, MMA y Lucha en Pinto, Madrid Sur. Clases para niños y adultos.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-brand-background/70">
              <MapPin className="w-4 h-4 text-brand-accent shrink-0" />
              <span>c/ Sisones 2, Nave 30, 28320 Pinto (Madrid)</span>
            </div>
          </div>

          <div>
            <h4 className="font-headline uppercase tracking-wider text-sm text-white mb-3">
              Acceso Rápido
            </h4>
            <ul className="space-y-2 text-sm text-brand-background/80">
              <li><Link to="/reserva-prueba" className="hover:text-white transition-colors">Reserva tu clase gratis</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Área privada de alumnos</Link></li>
              <li><a href="/#horario" className="hover:text-white transition-colors">Horario semanal</a></li>
              <li><a href="/#programas" className="hover:text-white transition-colors">Programas</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline uppercase tracking-wider text-sm text-white mb-3">
              Contacto
            </h4>
            <ul className="space-y-2 text-sm text-brand-background/80">
              <li>
                <a
                  href="https://wa.me/34677528185?text=Hola%2C%20quiero%20reservar%20una%20clase%20de%20prueba."
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp 247</span>
                </a>
              </li>
              <li>
                <a href="mailto:studio247bjj@gmail.com" className="hover:text-white transition-colors">
                  studio247bjj@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/_247studio"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram @_247studio
                </a>
              </li>
              <li className="pt-2">
                <Link to="/terminos" className="text-xs text-brand-background/60 hover:text-white">
                  Términos y Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-background/10 py-4 text-center text-xs text-brand-background/60">
          <p>© {new Date().getFullYear()} 247Studio | Unlimited Grappling. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};