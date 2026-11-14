import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ClipboardCheck, CalendarDays, Megaphone, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const coachNav = [
  { to: '/coach', label: 'Pasar Lista', icon: ClipboardCheck, end: true },
  { to: '/coach/horario', label: 'Horario', icon: CalendarDays },
  { to: '/coach/foro', label: 'Foro', icon: Megaphone },
];

export function CoachLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-studio-navy-deep text-slate-100 flex flex-col pb-20 md:pb-0">
      <header className="bg-studio-navy border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="247" className="w-8 h-8 rounded-md object-contain" />
          <div>
            <p className="font-headline text-lg uppercase tracking-wide text-white leading-none">
              247 STUDIO
            </p>
            <span className="text-[10px] uppercase tracking-widest text-studio-red font-semibold">
              Profesor · {profile?.full_name}
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {coachNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">{children}</main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-studio-navy border-t border-white/10 flex justify-around py-2 z-30">
        {coachNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium ${
                isActive ? 'text-studio-red' : 'text-slate-400'
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

