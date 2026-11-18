import type { ComponentType, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface PortalNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  badgeCount?: number;
  ringBell?: boolean;
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
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <header className="bg-[#272c35]/80 backdrop-blur-xl border-b border-white/[0.07] px-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.webp" alt="" className="w-14 h-14 rounded-xl object-contain shrink-0" />
            <div className="min-w-0">
              <span className="font-headline text-lg uppercase tracking-wide text-studio-cream leading-none block">
                247 Studio
              </span>
              <span className="block text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                {roleLabel}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-stretch h-full gap-1" aria-label="Navegación principal">
            {primaryNav.map(({ to, label, icon: Icon, end, badgeCount, ringBell }) => {
              const hasBadge = (badgeCount ?? 0) > 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  aria-label={hasBadge ? `${label} (${badgeCount} sin leer)` : label}
                  className={({ isActive }) =>
                    `group relative inline-flex items-center gap-2 px-3.5 text-sm transition-[color,background-color] duration-200 ${isActive
                      ? 'text-studio-cream font-semibold'
                      : 'text-slate-400 font-medium hover:text-white hover:bg-white/[0.06] rounded-xl'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative inline-flex shrink-0">
                        <Icon
                          className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:text-studio-red ${
                            hasBadge && ringBell ? 'bell-ring text-studio-cream' : hasBadge ? 'text-studio-cream' : ''
                          }`}
                        />
                        {hasBadge && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-hidden>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-studio-red opacity-80" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-studio-red ring-2 ring-[#272c35]" />
                          </span>
                        )}
                      </span>
                      <span>{label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="portal-nav-bar"
                          aria-hidden
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-t-full bg-studio-red"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {secondaryNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-2.5 py-2 rounded-xl text-xs font-medium transition ${isActive
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
              className="grid place-items-center min-h-11 min-w-11 ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12 max-w-5xl w-full mx-auto">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {/* Dock flotante Mobile */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 rounded-2xl bg-[#272c35]/[0.97] backdrop-blur-xl border border-white/10 shadow-modal flex justify-around py-1.5 px-1 z-30"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        {primaryNav.map(({ to, label, icon: Icon, end, badgeCount, ringBell }) => {
          const hasBadge = (badgeCount ?? 0) > 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={hasBadge ? `${label} (${badgeCount} sin leer)` : label}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px] px-3 py-1.5 rounded-xl text-[11px] font-medium active:scale-95 transition ${isActive ? 'text-studio-cream bg-white/[0.07]' : 'text-slate-300 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={`absolute -top-1.5 h-[3px] rounded-full bg-studio-red w-6 transition-[transform,opacity] duration-300 ${isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                      }`}
                  />
                  <span className="relative inline-flex shrink-0">
                    <Icon
                      className={`w-5 h-5 ${
                        hasBadge && ringBell ? 'bell-ring text-studio-cream' : hasBadge ? 'text-studio-cream' : ''
                      }`}
                    />
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-hidden>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-studio-red opacity-80" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-studio-red ring-2 ring-[#272c35]" />
                      </span>
                    )}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
