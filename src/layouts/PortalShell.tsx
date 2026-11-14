import type { ComponentType, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface PortalNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

/**
 * Estructura común de los portales de Alumno y Profesor:
 * cabecera translúcida, navegación con marca roja de cinturón y dock móvil.
 */
export function PortalShell({
  roleLabel,
  primaryNav,
  secondaryNav = [],
  children,
}: {
  roleLabel: string;
  primaryNav: PortalNavItem[];
  secondaryNav?: PortalNavItem[];
  children: ReactNode;
}) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <header className="bg-[#272c35]/80 backdrop-blur-xl border-b border-white/[0.07] px-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.webp" alt="" className="w-9 h-9 rounded-xl object-contain shrink-0" />
            <div className="min-w-0">
              <span className="font-headline text-lg uppercase tracking-wide text-studio-cream leading-none block">
                247 Studio
              </span>
              <span className="block text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {roleLabel}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-stretch h-full gap-1" aria-label="Navegación principal">
            {primaryNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative inline-flex items-center gap-2 px-3.5 text-sm transition ${
                    isActive
                      ? 'text-studio-cream font-semibold'
                      : 'text-slate-400 font-medium hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    <span
                      aria-hidden
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-t-full bg-studio-red transition-all duration-300 ${
                        isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {secondaryNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-studio-cream text-slate-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
            <button
              onClick={signOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.06] transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12 max-w-5xl w-full mx-auto">
        {children}
      </main>

      {/* Dock flotante Mobile */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 rounded-2xl bg-[#272c35]/90 backdrop-blur-xl border border-white/10 shadow-modal flex justify-around py-1.5 px-1 z-30"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                isActive ? 'text-studio-cream' : 'text-slate-500 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute -top-1.5 h-[3px] rounded-full bg-studio-red transition-all duration-300 ${
                    isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
