import React, { useEffect, useMemo, useRef, useState } from 'react';
import { prefetchRoutes } from '@/app/router/prefetch';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  Ellipsis,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShieldCheck,
  Tablet,
  Tags,
  UserCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { cn } from '@/shared/lib/utils';

type SidebarMode = 'EXPANDED' | 'MINI';

interface AdminLink {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  adminOnly: boolean;
  group: 'daily' | 'manage';
}

// Ordered by daily use at the front desk: charge, enrol, look up, take attendance.
const ALL_LINKS: AdminLink[] = [
  { to: '/admin/caja', label: 'Caja y cobros', shortLabel: 'Caja', icon: CreditCard, adminOnly: true, group: 'daily' },
  { to: '/admin/alta-alumno', label: 'Alta de alumno', shortLabel: 'Alta', icon: UserPlus, adminOnly: true, group: 'daily' },
  { to: '/admin/personal', label: 'Alumnos y cinturones', shortLabel: 'Alumnos', icon: Users, adminOnly: true, group: 'daily' },
  { to: '/admin/asistencia', label: 'Asistencia', shortLabel: 'Asistencia', icon: UserCheck, adminOnly: false, group: 'daily' },
  { to: '/admin/horarios', label: 'Horarios de tatami', shortLabel: 'Horarios', icon: CalendarDays, adminOnly: false, group: 'manage' },
  { to: '/admin/tarifas', label: 'Tarifas', shortLabel: 'Tarifas', icon: Tags, adminOnly: true, group: 'manage' },
  { to: '/admin/roles', label: 'Equipo y roles', shortLabel: 'Equipo', icon: ShieldCheck, adminOnly: true, group: 'manage' },
];

const GROUP_LABEL: Record<AdminLink['group'], string> = {
  daily: 'Día a día',
  manage: 'Gestión',
};

const todayLabel = () =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(new Date());

export const AdminLayout: React.FC = () => {
  const { logout, role, user } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    prefetchRoutes('admin');
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    try {
      const saved = localStorage.getItem('247_admin_sidebar_mode');
      if (saved === 'EXPANDED' || saved === 'MINI') return saved;
    } catch {}
    return 'EXPANDED';
  });
  const mini = sidebarMode === 'MINI';

  const updateSidebarMode = (mode: SidebarMode) => {
    setSidebarMode(mode);
    try {
      localStorage.setItem('247_admin_sidebar_mode', mode);
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        updateSidebarMode(sidebarMode === 'EXPANDED' ? 'MINI' : 'EXPANDED');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarMode]);

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useGlobalShortcuts({
    onCloseModals: () => {
      setMobileMenuOpen(false);
    },
  });

  const links = useMemo(() => ALL_LINKS.filter((l) => !l.adminOnly || role === 'admin'), [role]);
  const activeLink = links.find((l) => location.pathname.startsWith(l.to));
  const quickLinks = links.slice(0, 4);
  const staffName = user?.displayName || user?.email || 'Equipo 247';
  const roleLabel = role === 'admin' ? 'Administrador' : 'Entrenador';

  const groups = (['daily', 'manage'] as const)
    .map((g) => ({ id: g, items: links.filter((l) => l.group === g) }))
    .filter((g) => g.items.length > 0);

  // Labels show from lg up (rail is icon-only on narrower tablets) unless the user minimised it.
  const labelCls = mini ? 'hidden' : 'hidden lg:inline';

  const railItem = (isActive: boolean) =>
    cn(
      'group flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
      mini ? 'justify-center px-0' : 'justify-center lg:justify-start',
      isActive ? 'bg-studio-red text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
    );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-brand-sand-light font-sans text-slate-900 antialiased selection:bg-studio-red selection:text-white md:block md:h-auto md:min-h-screen md:overflow-visible">
      {/* Mobile header (< 768px) */}
      <header className="z-30 flex shrink-0 items-center justify-between bg-studio-navy-deep px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="247Studio" className="h-8 w-8 object-contain" />
          <span className="font-headline text-lg uppercase leading-none tracking-tight text-white">
            {activeLink?.label ?? 'Panel de gestión'}
          </span>
        </div>
        <span className="text-xs font-semibold text-white/70 first-letter:uppercase">{todayLabel()}</span>
      </header>

      {/* Mobile full-screen launcher */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col justify-between overflow-hidden bg-studio-navy-deep p-4 md:hidden">
          <div className="flex shrink-0 items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="247Studio" className="h-9 w-9 object-contain" />
              <span className="font-headline text-xl uppercase leading-none tracking-tight text-white">
                247Studio
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white"
              aria-label="Cerrar menú de administración"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Secciones de administración" className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
            {groups.map((g) => (
              <div key={g.id}>
                <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                  {GROUP_LABEL[g.id]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname.startsWith(link.to);
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex min-h-14 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold',
                          isActive ? 'bg-studio-red text-white' : 'bg-white/10 text-white/90'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{link.shortLabel}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="grid shrink-0 grid-cols-3 gap-2 pt-3">
            <NavLink
              to="/app/home"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold text-white"
            >
              <Shield className="h-4 w-4" />
              <span>Vista alumno</span>
            </NavLink>
            <NavLink
              to="/kiosk/check-in"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold text-white"
            >
              <Tablet className="h-4 w-4" />
              <span>Kiosco</span>
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold text-rose-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* Side rail (>= 768px) */}
      <aside
        aria-label="Navegación de administración"
        className={cn(
          'hidden shrink-0 flex-col justify-between bg-studio-navy-deep px-3 py-5 transition-[width] duration-200 md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex',
          mini ? 'md:w-20' : 'md:w-20 lg:w-64'
        )}
      >
        <div className="min-h-0 overflow-y-auto">
          <div className={cn('flex items-center gap-3 px-1 pb-5', mini ? 'justify-center' : 'justify-center lg:justify-start lg:px-2')}>
            <img src="/logo.webp" alt="247Studio" className="h-10 w-10 shrink-0 object-contain" />
            <div className={cn('min-w-0', labelCls)}>
              <span className="block font-headline text-2xl uppercase leading-none tracking-tight text-white">
                247Studio
              </span>
              <span className="mt-1 block text-xs font-medium text-white/60">Panel de gestión</span>
            </div>
          </div>

          <nav className="space-y-5">
            {groups.map((g) => (
              <div key={g.id}>
                <p className={cn('px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-white/55', labelCls)}>
                  {GROUP_LABEL[g.id]}
                </p>
                <div className="space-y-1">
                  {g.items.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname.startsWith(link.to);
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        title={link.label}
                        aria-label={link.label}
                        className={railItem(isActive)}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className={labelCls}>{link.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-5 space-y-1 border-t border-white/10 pt-4">
          <NavLink to="/app/home" title="Vista de alumno" aria-label="Vista de alumno" className={railItem(false)}>
            <Shield className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={labelCls}>Vista de alumno</span>
          </NavLink>
          <NavLink to="/kiosk/check-in" title="Modo kiosco" aria-label="Modo kiosco" className={railItem(false)}>
            <Tablet className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={labelCls}>Modo kiosco</span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className={cn(railItem(false), 'w-full cursor-pointer text-left')}
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={labelCls}>Cerrar sesión</span>
          </button>
          <button
            type="button"
            onClick={() => updateSidebarMode(mini ? 'EXPANDED' : 'MINI')}
            title={mini ? 'Expandir menú (Ctrl+B)' : 'Reducir menú (Ctrl+B)'}
            aria-label={mini ? 'Expandir menú' : 'Reducir menú'}
            className={cn(railItem(false), 'hidden w-full cursor-pointer text-left lg:flex', mini && 'lg:justify-center')}
          >
            {mini ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span className={labelCls}>Reducir menú</span>
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className={cn('flex min-h-0 flex-1 flex-col md:block', mini ? 'md:pl-20' : 'md:pl-20 lg:pl-64')}>
        <div className="hidden items-center justify-between px-6 pt-5 md:flex lg:px-8">
          <span className="text-sm font-semibold text-slate-600 first-letter:uppercase">{todayLabel()}</span>
          <span className="flex items-center gap-2.5 rounded-full border border-studio-navy/10 bg-white py-1.5 pl-4 pr-1.5 text-sm font-semibold text-studio-navy">
            <span className="max-w-[16rem] truncate">{staffName}</span>
            <span className="rounded-full bg-studio-navy px-2.5 py-1 text-xs font-semibold text-white">{roleLabel}</span>
          </span>
        </div>

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:overflow-visible md:px-6 md:py-5 lg:px-8">
          <div className="mx-auto max-w-[1360px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom bar (< 768px) */}
      <nav
        aria-label="Navegación rápida de administración"
        className="z-30 grid shrink-0 grid-cols-5 gap-1 bg-studio-navy-deep px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
      >
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors',
                  isActive ? 'bg-studio-red text-white' : 'text-white/75'
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{link.shortLabel}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-expanded={mobileMenuOpen}
          className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-white/75"
        >
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
};
