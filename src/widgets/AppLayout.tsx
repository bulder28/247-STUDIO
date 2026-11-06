import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CreditCard,
  HelpCircle,
  Home,
  Image,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

export const AppLayout: React.FC = () => {
  const { userData, role, logout } = useAuth();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Menú que refleja exactamente la barra lateral del PowerPoint de Mario (Diapositivas 4 a 12)
  const navItems = [
    { to: '/app/home', label: 'Home', icon: Home, badge: null },
    { to: '/app/perfil', label: 'Personal Info', icon: User, badge: null },
    { to: '/app/programas', label: 'Programas / Tarifas', icon: CreditCard, badge: null },
    { to: '/app/horario', label: 'Horario', icon: Calendar, badge: null },
    { to: '/app/avisos', label: 'Avisos', icon: Bell, badge: '3' },
    { to: '/app/foro', label: 'Foro', icon: MessageSquare, badge: null },
    { to: '/app/faqs', label: 'FAQs', icon: HelpCircle, badge: null },
    { to: '/app/media', label: 'Media', icon: Image, badge: null },
  ];

  const isOk = userData?.paymentStatusCache === 'OK';
  const isGrace = userData?.paymentStatusCache === 'GRACE';
  const isNok = userData?.paymentStatusCache === 'NOK';

  const statusColor = isOk
    ? 'bg-emerald-500'
    : isGrace
    ? 'bg-amber-500'
    : 'bg-brand-accent';

  const statusText = isOk
    ? 'Pago OK'
    : isGrace
    ? 'Período de Gracia'
    : isNok
    ? 'Pago Pendiente'
    : 'Activo';

  return (
    <div className="min-h-screen bg-brand-text flex flex-col md:flex-row text-white font-sans">
      {/* ======================================================== */}
      {/* 1. BARRA LATERAL (SIDEBAR) FIJA - DESKTOP / TABLET       */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-[#141624] border-r border-white/10 flex-col justify-between shrink-0 h-screen sticky top-0">
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Logo y Encabezado del Área Cliente (Como en Slide 4 de Mario) */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="247Studio" className="w-10 h-10 object-contain brightness-110" />
              <div>
                <span className="font-headline text-xl tracking-tighter uppercase text-white block leading-none">
                  247STUDIO
                </span>
                <span className="text-[10px] font-headline font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded inline-block border border-brand-accent/20 mt-1">
                  Área Cliente
                </span>
              </div>
            </div>

            {/* Ficha Resumen de Estado del Atleta */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">
                  {userData?.alias || 'Atleta 247'}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-background/80">
                  <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
                  {statusText}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-brand-background/60">
                <span>{userData?.belt ? `Cinturón ${userData.belt}` : (userData?.beltSystem === 'KIDS' ? 'Kids' : 'Adulto BJJ')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-mono">
                  Socio #{userData?.uid?.slice(0, 5) || '247'}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Navegación del PowerPoint */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition tracking-wide ${
                    isActive
                      ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/25'
                      : 'text-brand-background/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-accent/30 text-white font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Pie de Barra Lateral */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-[#0e101b]">
          {/* Botón Acceso Rápido QR de Check-in */}
          <button
            onClick={() => setQrModalOpen(true)}
            className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
          >
            <QrCode className="w-4 h-4 text-brand-background" />
            <span>Ver Pase QR Check-in</span>
          </button>

          {role === 'admin' && (
            <NavLink
              to="/admin/personal"
              className="w-full py-2 px-3 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-brand-accent/30"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Panel Administrador</span>
            </NavLink>
          )}

          <button
            onClick={logout}
            className="w-full py-2 px-3 text-brand-background/60 hover:text-brand-accent hover:bg-brand-accent/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. HEADER MÓVIL CON BOTÓN DE MENÚ LATERAL                */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 bg-[#141624]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
            title="Abrir Menú Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/logo.webp" alt="247Studio Logo" className="w-8 h-8 object-contain" />
          <div>
            <span className="font-headline text-base tracking-tighter uppercase text-white block leading-none">
              247STUDIO
            </span>
            <span className="text-[10px] text-brand-accent font-headline font-bold block uppercase mt-0.5">
              Área Cliente
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQrModalOpen(true)}
            className="p-2 rounded-xl bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
            title="Mi QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-white/5 text-brand-background/70 hover:text-brand-accent"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. DRAWER DESPLEGABLE MÓVIL                             */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 bg-[#141624] border-r border-white/10 h-full flex flex-col justify-between z-10 p-5 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
                  <span className="font-headline text-lg tracking-tighter uppercase text-white">
                    247Studio
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-brand-background hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-brand-accent text-white shadow-lg'
                          : 'text-brand-background/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-accent/30 text-white font-mono">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setQrModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Pase QR Check-in</span>
              </button>

              <button
                onClick={logout}
                className="w-full py-2 px-3 text-brand-accent rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CONTENIDO PRINCIPAL                                    */}
      {/* ======================================================== */}
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* ======================================================== */}
      {/* 5. MODAL DE PASE QR (SI SE ABRE DESDE EL SIDEBAR)        */}
      {/* ======================================================== */}
      {qrModalOpen && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1A1D2E] border border-white/15 rounded-3xl p-6 relative shadow-2xl">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-brand-background hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-headline uppercase tracking-tight text-white mb-4 text-center">
              Pase Digital 247Studio
            </h3>
            <QrCodePassCard user={userData} />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. BOTTOM BAR RÁPIDA EN MÓVIL                             */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141624]/95 backdrop-blur-md border-t border-white/10 md:hidden px-2 py-2">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition text-[10px] font-bold ${
                  isActive
                    ? 'text-brand-accent font-black'
                    : 'text-brand-background/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};