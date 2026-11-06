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
    <div className="min-h-screen bg-studio-navy flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0c0f24] border-b md:border-b-0 md:border-r border-white/10 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-white/10">
            <img src="/logo.svg" alt="247Studio" className="w-10 h-10 rounded-xl shadow" />
            <div>
              <span className="font-black text-sm tracking-widest uppercase text-white block">247Studio</span>
              <span className="text-[10px] text-studio-red font-black block tracking-wider uppercase bg-studio-red/10 px-2 py-0.5 rounded-full inline-block border border-studio-red/20">
                Área Administrador
              </span>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition tracking-wide ${
                      isActive
                        ? 'bg-studio-red text-white shadow-lg shadow-studio-red/20'
                        : 'text-studio-cream/70 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-2">
          <NavLink
            to="/app/home"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-studio-cream/80 hover:bg-white/5 hover:text-white border border-white/10 transition"
          >
            <Shield className="w-4 h-4 text-studio-red" />
            <span>Ver como Alumno</span>
          </NavLink>

          <NavLink
            to="/kiosk/check-in"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-studio-cream/80 hover:bg-white/5 hover:text-white border border-white/10 transition"
          >
            <Tablet className="w-4 h-4 text-studio-cream" />
            <span>Modo Kiosco (Tablet)</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-studio-red hover:bg-studio-red/10 transition"
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
