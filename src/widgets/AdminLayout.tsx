import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Scale,
  Shield,
  Swords,
  Tablet,
  Tags,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Global Keyboard Shortcuts
  useGlobalShortcuts({
    onToggleTimer: () => navigate('/admin/cronometro'),
    onToggleWeightCalc: () => navigate('/admin/peso'),
    onToggleCurriculum: () => navigate('/admin/curriculum'),
    onCloseModals: () => {
      setMobileMenuOpen(false);
    },
  });

  const links = [
    { to: '/admin/personal', label: 'Alumnos & Cinturones', shortLabel: 'Alumnos', icon: Users },
    { to: '/admin/asistencia', label: 'Hoja de Asistencia', shortLabel: 'Asistencia', icon: UserCheck },
    { to: '/admin/caja', label: 'Caja y Pagos', shortLabel: 'Caja', icon: CreditCard },
    { to: '/admin/horarios', label: 'Horarios de Tatami', shortLabel: 'Horarios', icon: CalendarDays },
    { to: '/admin/tarifas', label: 'Tarifas & MRR', shortLabel: 'Tarifas', icon: Tags },
    { to: '/admin/leads', label: 'Embudo de Leads', shortLabel: 'Leads', icon: Shield },
    { to: '/admin/alta-alumno', label: 'Alta de Alumno', shortLabel: 'Alta Socio', icon: UserPlus },
  ];

  const tatamiTools = [
    { to: '/admin/cronometro', label: 'Cronómetro Sparring', shortLabel: 'Cronómetro', icon: Swords },
    { to: '/admin/peso', label: 'Calculadora IBJJF', shortLabel: 'Peso IBJJF', icon: Scale },
    { to: '/admin/curriculum', label: 'Currículum & Drills', shortLabel: 'Currículum', icon: BookOpen },
  ];

  const activeLink = links.find((l) => location.pathname.startsWith(l.to)) || tatamiTools.find((l) => location.pathname.startsWith(l.to));

  return (
    <div className="h-[100dvh] md:min-h-screen md:h-auto overflow-hidden md:overflow-visible bg-[#F4F4F5] flex flex-col md:flex-row font-sans text-[#09090B] antialiased selection:bg-brand-accent selection:text-white">
      {/* ======================================================== */}
      {/* 1. HEADER MÓVIL (< 768px) COMPACTO                       */}
      {/* ======================================================== */}
      <header className="md:hidden shrink-0 bg-white border-b border-[#E4E4E7] px-3.5 py-2.5 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain drop-shadow-xs" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-base tracking-tight uppercase text-[#09090B] leading-none">
                {activeLink?.label || 'Panel Admin'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
              247Studio Gestión
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 transition cursor-pointer"
          aria-label={mobileMenuOpen ? 'Cerrar menú de administración' : 'Abrir menú de administración'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ======================================================== */}
      {/* 2. LAUNCHER MÓVIL A PANTALLA COMPLETA (< 768px)          */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#F4F4F5] flex flex-col justify-between p-4 h-[100dvh] overflow-hidden animate-in fade-in duration-150">
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E4E7] shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain" />
              <div>
                <span className="font-headline text-lg tracking-tighter uppercase text-[#09090B] block leading-none">
                  247Studio Admin
                </span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Navegación Móvil Directa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 transition cursor-pointer"
              aria-label="Cerrar panel de navegación"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid de Gestión Operativa (Enlaces directos a cada página) */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1 pb-1.5">
                Páginas de Gestión Operativa
              </p>
              <nav className="grid grid-cols-2 gap-1.5">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname.startsWith(link.to);
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                        isActive
                          ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                          : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                        <span className="truncate">{link.shortLabel}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Herramientas de Tatami como páginas completas */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1 pb-1.5">
                Herramientas de Tatami
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {tatamiTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = location.pathname.startsWith(tool.to);
                  return (
                    <NavLink
                      key={tool.to}
                      to={tool.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-[11px] font-bold border transition ${
                        isActive
                          ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                          : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-zinc-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                      <span>{tool.shortLabel}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Mobile Hub */}
          <div className="pt-2.5 border-t border-[#E4E4E7] grid grid-cols-3 gap-1.5 shrink-0">
            <NavLink
              to="/app/home"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-white border border-[#E4E4E7] text-[#09090B]"
            >
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              <span>Vista Socio</span>
            </NavLink>

            <NavLink
              to="/kiosk/check-in"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-[#09090B] text-white"
            >
              <Tablet className="w-3.5 h-3.5 text-white" />
              <span>Kiosco</span>
            </NavLink>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-rose-50 border border-rose-200 text-brand-accent cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SIDEBAR DESKTOP (>= 768px) SWISS MONOCHROME          */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-[#E4E4E7] p-5 flex-col justify-between shrink-0 shadow-subtle z-20">
        <div>
          {/* Logo y Marca */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#E4E4E7]">
            <div className="relative">
              <img src="/logo.webp" alt="247Studio" className="w-9 h-9 object-contain drop-shadow-xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-xl tracking-tighter uppercase text-[#09090B] block leading-none">
                  247Studio
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                Panel de Gestión
              </span>
            </div>
          </div>

          {/* Menú de Gestión con estilo Swiss Monochrome */}
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-3 pb-2">
              Gestión Operativa
            </p>
            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.to);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#09090B] text-white font-bold shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#09090B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'
                        }`}
                      />
                      <span>{link.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Herramientas de Tatami */}
          <div className="mt-6 pt-5 border-t border-[#E4E4E7]">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-3 pb-2">
              Herramientas de Tatami
            </p>
            <div className="space-y-1">
              {tatamiTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = location.pathname.startsWith(tool.to);
                return (
                  <NavLink
                    key={tool.to}
                    to={tool.to}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#09090B] text-white font-bold shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#09090B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'
                        }`}
                      />
                      <span>{tool.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="mt-8 pt-4 border-t border-[#E4E4E7] flex flex-col gap-1.5">
          <NavLink
            to="/app/home"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-[#09090B] transition"
          >
            <Shield className="w-4 h-4 text-zinc-400" />
            <span>Vista de Alumno</span>
          </NavLink>

          <NavLink
            to="/kiosk/check-in"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-[#09090B] transition"
          >
            <Tablet className="w-4 h-4 text-zinc-400" />
            <span>Modo Kiosco (Tablet)</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-brand-accent hover:bg-brand-accent/5 transition cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 p-3 md:p-8 overflow-y-auto md:overflow-visible"
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ======================================================== */}
      {/* 4. BARRA INFERIOR FIJA MODO TELÉFONO (< 768px)          */}
      {/* ======================================================== */}
      <nav
        aria-label="Navegación rápida de administración móvil"
        className="md:hidden shrink-0 bg-white border-t border-[#E4E4E7] px-2 py-1.5 grid grid-cols-5 gap-1 z-30 shadow-lg"
      >
        <NavLink
          to="/admin/personal"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
            }`
          }
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Alumnos</span>
        </NavLink>

        <NavLink
          to="/admin/asistencia"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
            }`
          }
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>Asistencia</span>
        </NavLink>

        <NavLink
          to="/admin/caja"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
            }`
          }
        >
          <CreditCard className="w-4 h-4 mb-0.5" />
          <span>Caja</span>
        </NavLink>

        <NavLink
          to="/admin/horarios"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
            }`
          }
        >
          <CalendarDays className="w-4 h-4 mb-0.5" />
          <span>Horarios</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            mobileMenuOpen ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span>Pestañas</span>
        </button>
      </nav>

      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};
