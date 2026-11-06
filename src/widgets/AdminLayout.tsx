import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  LogOut,
  Shield,
  Tablet,
  Tags,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuth();

  const links = [
    { to: '/admin/personal', label: 'BBDD Personal', icon: Users },
    { to: '/admin/asistencia', label: 'Hoja de Asistencia', icon: UserCheck },
    { to: '/admin/caja', label: 'Caja y Pagos', icon: CreditCard },
    { to: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
    { to: '/admin/tarifas', label: 'Tarifas', icon: Tags },
    { to: '/admin/leads', label: 'Leads de Prueba', icon: Shield },
    { to: '/admin/alta-alumno', label: 'Alta de Alumno', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-slate-900 antialiased">
      {/* Sidebar Desktop MatGoat Clean */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5 pb-5 border-b border-slate-100">
            <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-xl tracking-tighter uppercase text-slate-900 block leading-none">
                  247Studio
                </span>
                <span className="w-2 h-2 rounded-full bg-brand-accent inline-block" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                Panel Gestión
              </span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              GESTIÓN
            </p>
            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
          <NavLink
            to="/app/home"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Ver como Alumno</span>
          </NavLink>

          <NavLink
            to="/kiosk/check-in"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Tablet className="w-4 h-4 text-slate-500" />
            <span>Modo Kiosco (Tablet)</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};