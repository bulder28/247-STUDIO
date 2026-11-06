import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, CreditCard, Home, LogOut, User } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const AppLayout: React.FC = () => {
  const { userData, logout } = useAuth();

  const navItems = [
    { to: '/app/home', label: 'Inicio', icon: Home },
    { to: '/app/horario', label: 'Horarios', icon: Calendar },
    { to: '/app/programas', label: 'Tarifa y Pago', icon: CreditCard },
    { to: '/app/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-studio-navy flex flex-col justify-between pb-20 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-studio-navy/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="247Studio Logo" className="w-8 h-8 rounded-lg shadow" />
          <div>
            <span className="font-black text-sm tracking-widest uppercase text-white block">247Studio</span>
            <span className="text-[10px] text-studio-cream/70 font-semibold block tracking-wider">BJJ & Grappling Academy</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userData && (
            <span className="text-xs font-bold text-studio-cream hidden sm:inline-block">
              {userData.alias}
            </span>
          )}
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 rounded-xl bg-white/5 hover:bg-studio-red/20 text-studio-cream hover:text-studio-red border border-white/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Bottom Bar para PWA / Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-studio-navy-light/95 backdrop-blur-md border-t border-white/10 md:hidden px-2 py-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition text-[11px] font-bold ${
                    isActive
                      ? 'text-studio-red font-black'
                      : 'text-studio-cream/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
