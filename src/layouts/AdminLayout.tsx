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
  ClipboardCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navGroups = [
  {
    label: 'Día a día',
    items: [
      { to: '/admin/pasar-lista', label: 'Pasar lista', icon: ClipboardCheck },
      { to: '/admin/seguimiento', label: 'Cobros', icon: CreditCard },
      { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
    ],
  },
  {
    label: 'Academia',
    items: [
      { to: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
      { to: '/admin/tarifas', label: 'Tarifas', icon: Tags },
      { to: '/admin/comunicacion', label: 'Comunicación', icon: MessageSquare },
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

const dockItems = [
  { to: '/admin/pasar-lista', label: 'Lista', icon: ClipboardCheck },
  { to: '/admin/seguimiento', label: 'Cobros', icon: CreditCard },
  { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
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
                  `group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'text-studio-cream font-semibold'
                      : 'text-slate-400 font-medium hover:bg-white/[0.03] hover:text-slate-100'
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
                    <Icon className="relative z-10 w-4 h-4 shrink-0" />
                    <span className="relative z-10">{label}</span>
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
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      <aside className="hidden md:flex md:w-60 md:flex-col bg-[#272c35]/80 backdrop-blur-xl border-r border-white/[0.07] shrink-0 sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <img src="/logo.webp" alt="" className="w-10 h-10 rounded-xl object-contain" />
          <p className="font-headline text-xl tracking-wide uppercase text-studio-cream leading-none">
            247 Studio
          </p>
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

      {/* Topbar Mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#272c35]/85 backdrop-blur-xl border-b border-white/[0.07] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img src="/logo.webp" alt="" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-headline text-lg uppercase tracking-wide text-studio-cream">247 Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {/* Dock Mobile: accesos del día a día + menú completo */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 rounded-2xl bg-[#272c35]/92 backdrop-blur-xl border border-white/10 shadow-modal flex justify-around py-1.5 px-1 z-30"
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
