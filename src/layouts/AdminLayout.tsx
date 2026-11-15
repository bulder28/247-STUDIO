import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Users,
  Tags,
  CalendarDays,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Maximize,
  Minimize,
  Wallet,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navGroups = [
  {
    label: 'Día a día',
    items: [
      { to: '/admin/seguimiento', label: 'Cobros', icon: CreditCard },
      { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/admin/finanzas', label: 'Resumen del mes', icon: Wallet, end: true },
      { to: '/admin/finanzas/gastos', label: 'Gastos', icon: Receipt },
    ],
  },
  {
    label: 'Academia',
    items: [
      { to: '/admin/horarios', label: 'Editor de horarios', icon: CalendarDays },
      { to: '/admin/tarifas', label: 'Editor de tarifas', icon: Tags },
      { to: '/admin/comunicacion', label: 'Crear comunicaciones', icon: MessageSquare },
    ],
  },
  {
    label: 'Dirección',
    items: [
      { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/admin/kpis', label: 'KPIs', icon: BarChart3 },
    ],
  },
];

const dockItems: { to: string; label: string; icon: typeof Users; end?: boolean }[] = [
  { to: '/admin/seguimiento', label: 'Cobros', icon: CreditCard },
  { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
  // Finanzas sustituye a "Resumen" en el dock; el inicio de dirección sigue en el menú "Más"
  { to: '/admin/finanzas', label: 'Finanzas', icon: Wallet },
];

function initialsOf(name?: string | null): string {
  if (!name) return '247';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[11px] font-medium text-slate-500">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm transition-[color,background-color,box-shadow] duration-200 ${
                    isActive
                      ? 'text-studio-cream font-semibold'
                      : 'text-slate-400 font-medium hover:bg-white/[0.08] hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="admin-sidebar-pill"
                        aria-hidden
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-white/[0.07]"
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="admin-sidebar-bar"
                        aria-hidden
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-studio-red"
                      />
                    )}
                    <Icon className="relative z-10 w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-studio-red" />
                    <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  // Panel lateral (escritorio): se puede ocultar y la elección se recuerda en este navegador
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('admin-sidebar-open') !== 'false';
    } catch {
      return true;
    }
  });
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin-sidebar-open', String(next));
      } catch {
        // sin almacenamiento disponible: el panel funciona igual, solo no se recuerda
      }
      return next;
    });
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // El navegador puede bloquear la petición; el botón simplemente no hace nada
    }
  };

  const userChip = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-studio-cream text-slate-950 font-headline text-sm overflow-hidden">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          initialsOf(profile?.full_name)
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{profile?.full_name}</p>
        <p className="text-[11px] text-slate-500 leading-tight">Dirección</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className={`hidden ${sidebarOpen ? 'md:flex' : ''} md:w-60 md:flex-col bg-[#272c35]/80 backdrop-blur-xl border-r border-white/[0.07] shrink-0 sticky top-0 h-screen`}>
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <img src="/logo.webp" alt="" className="w-16 h-16 rounded-xl object-contain" />
          <p className="font-headline text-xl tracking-wide uppercase text-studio-cream leading-none">
            247 Studio
          </p>
        </div>

        <div className="px-3 mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-pressed={isFullscreen}
            className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-xs text-slate-300 transition"
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <Maximize className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate">{isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Ocultar panel lateral"
            aria-label="Ocultar panel lateral"
            className="shrink-0 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-slate-300 transition"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto" aria-label="Navegación de dirección">
          <NavItems />
        </nav>

        <div className="p-3 m-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between gap-2">
          {userChip}
          <button
            onClick={signOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Botón para volver a mostrar el panel lateral (escritorio) */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          title="Mostrar panel lateral"
          aria-label="Mostrar panel lateral"
          className="hidden md:flex fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-[#272c35]/90 backdrop-blur-xl hover:bg-[#2f3540] border border-white/10 text-slate-200 shadow-modal transition"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* Topbar Mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#272c35]/85 backdrop-blur-xl border-b border-white/[0.07] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img src="/logo.webp" alt="" className="w-12 h-12 rounded-lg object-contain" />
          <span className="font-headline text-lg uppercase tracking-wide text-studio-cream">247 Studio</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-[#272c35] border-r border-white/10 p-4 flex flex-col gap-5 animate-studio-in"
            style={{ animationDelay: '0s' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-1 pb-3 border-b border-white/[0.07]">{userChip}</div>
            <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Navegación de dirección">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </nav>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className="flex-1 min-w-0 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12 max-w-6xl w-full mx-auto"
      >
        <motion.div
          // Clave por sección (/admin/finanzas), no por ruta: cambiar de pestaña dentro
          // de una sección no vuelve a montar la página ni a pedir todos los datos
          key={location.pathname.split('/').slice(0, 3).join('/')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {/* Dock Mobile: accesos del día a día + menú completo */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 rounded-2xl bg-[#272c35]/[0.97] backdrop-blur-xl border border-white/10 shadow-modal flex justify-around py-1.5 px-1 z-30"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Accesos rápidos"
      >
        {dockItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                isActive ? 'text-studio-cream' : 'text-slate-300 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute -top-1.5 h-[3px] rounded-full bg-studio-red w-6 transition-[transform,opacity] duration-300 ${
                    isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                  }`}
                />
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-500 hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
