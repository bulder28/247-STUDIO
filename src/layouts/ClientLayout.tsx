import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  CalendarDays,
  MessageSquare,
  Bell,
  User,
  Tags,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const primaryNav = [
  { to: '/app', label: 'Inicio', icon: Home, end: true },
  { to: '/app/horario', label: 'Horario', icon: CalendarDays },
  { to: '/app/foro', label: 'Foro/Chat', icon: MessageSquare },
  { to: '/app/avisos', label: 'Avisos', icon: Bell },
  { to: '/app/perfil', label: 'Perfil', icon: User },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col pb-24 md:pb-0">
      <header className="bg-slate-950/75 backdrop-blur-xl border-b border-white/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-white/5 border border-white/10">
              <img src="/logo.webp" alt="247 STUDIO" className="w-7 h-7 rounded object-contain" />
            </div>
            <div>
              <span className="font-headline text-lg uppercase tracking-wide text-white leading-none block">
                247 STUDIO
              </span>
              <span className="text-[10px] text-studio-red font-semibold tracking-widest uppercase">
                Pinto · Tatami
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-white/[0.03] border border-white/10 p-1">
            {primaryNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-studio-red text-white shadow-glow-red'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NavLink
              to="/app/tarifas"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                  isActive
                    ? 'bg-studio-red border-studio-red text-white shadow-glow-red'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10'
                }`
              }
            >
              <Tags className="w-3.5 h-3.5" />
              <span>Tarifas</span>
            </NavLink>
            <NavLink
              to="/app/faqs"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                  isActive
                    ? 'bg-studio-red border-studio-red text-white shadow-glow-red'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10'
                }`
              }
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">FAQs</span>
            </NavLink>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto animate-studio-in">
        {children}
      </main>

      {/* Dock flotante Mobile */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 shadow-modal flex justify-around py-1.5 px-1 z-30">
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                isActive ? 'bg-studio-red/20 text-studio-red' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

