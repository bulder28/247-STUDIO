import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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

const navItems = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/pasar-lista', label: 'Pasar Lista', icon: ClipboardCheck },
  { to: '/admin/seguimiento', label: 'Seguimiento', icon: CreditCard },
  { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
  { to: '/admin/tarifas', label: 'Tarifas', icon: Tags },
  { to: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
  { to: '/admin/comunicacion', label: 'Comunicación', icon: MessageSquare },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentTitle =
    navItems.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label ?? 'Administración';

  return (
    <div className="min-h-screen bg-studio-navy-deep text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-studio-navy border-r border-white/10 shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <img src="/logo.webp" alt="247 STUDIO" className="w-10 h-10 rounded-lg object-contain" />
          <div>
            <p className="font-headline text-lg tracking-wide uppercase text-white leading-none">
              247 STUDIO
            </p>
            <span className="text-[11px] uppercase tracking-widest text-studio-red font-semibold">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-studio-red text-white shadow-glow-red'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-slate-400 truncate mb-2">{profile?.full_name}</p>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Topbar Mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-studio-navy border-b border-white/10 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img src="/logo.webp" alt="247" className="w-8 h-8 rounded-md object-contain" />
          <span className="font-headline text-lg uppercase tracking-wide">{currentTitle}</span>
        </div>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="w-64 h-full bg-studio-navy p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1 mt-12">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-studio-red text-white' : 'text-slate-300 hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}

