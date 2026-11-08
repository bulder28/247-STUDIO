import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
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
  const { logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'EXPANDED' | 'MINI' | 'CLOSED'>(() => {
    try {
      const saved = localStorage.getItem('247_admin_sidebar_mode') as 'EXPANDED' | 'MINI' | 'CLOSED' | null;
      if (saved === 'EXPANDED' || saved === 'MINI' || saved === 'CLOSED') return saved;
    } catch {}
    return 'EXPANDED';
  });

  const updateSidebarMode = (mode: 'EXPANDED' | 'MINI' | 'CLOSED') => {
    setSidebarMode(mode);
    try {
      localStorage.setItem('247_admin_sidebar_mode', mode);
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        updateSidebarMode(sidebarMode === 'EXPANDED' ? 'MINI' : 'EXPANDED');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarMode]);

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

  const allLinks = [
    { to: '/admin/personal', label: 'Alumnos & Cinturones', shortLabel: 'Alumnos', icon: Users, adminOnly: false },
    { to: '/admin/asistencia', label: 'Hoja de Asistencia', shortLabel: 'Asistencia', icon: UserCheck, adminOnly: false },
    { to: '/admin/caja', label: 'Caja y Pagos', shortLabel: 'Caja', icon: CreditCard, adminOnly: true },
    { to: '/admin/horarios', label: 'Horarios de Tatami', shortLabel: 'Horarios', icon: CalendarDays, adminOnly: false },
    { to: '/admin/tarifas', label: 'Tarifas & MRR', shortLabel: 'Tarifas', icon: Tags, adminOnly: true },
    { to: '/admin/leads', label: 'Embudo de Leads', shortLabel: 'Leads', icon: Shield, adminOnly: false },
    { to: '/admin/alta-alumno', label: 'Alta de Alumno', shortLabel: 'Alta Socio', icon: UserPlus, adminOnly: false },
  ];

  const links = allLinks.filter((l) => !l.adminOnly || role === 'admin');

  const tatamiTools = [
    { to: '/admin/cronometro', label: 'Cronómetro Sparring', shortLabel: 'Cronómetro', icon: Swords },
    { to: '/admin/peso', label: 'Calculadora IBJJF', shortLabel: 'Peso IBJJF', icon: Scale },
    { to: '/admin/curriculum', label: 'Currículum & Drills', shortLabel: 'Currículum', icon: BookOpen },
  ];

  const activeLink = links.find((l) => location.pathname.startsWith(l.to)) || tatamiTools.find((l) => location.pathname.startsWith(l.to));

  return (
    <div className="h-[100dvh] md:min-h-screen md:h-auto overflow-hidden md:overflow-visible bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-slate-900 antialiased selection:bg-brand-accent selection:text-white">
      {/* ======================================================== */}
      {/* 1. HEADER MÓVIL (< 768px) COMPACTO                       */}
      {/* ======================================================== */}
      <header className="md:hidden shrink-0 bg-white border-b border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain drop-shadow-xs" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-base tracking-tight uppercase text-slate-900 leading-none">
                {activeLink?.label || 'Panel Admin'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              247Studio Gestión
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 md:hidden bg-[#F8F9FA] flex flex-col justify-between p-4 h-[100dvh] overflow-hidden animate-in fade-in duration-150">
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain" />
              <div>
                <span className="font-headline text-lg tracking-tighter uppercase text-slate-900 block leading-none">
                  247Studio Admin
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Navegación Móvil Directa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 transition cursor-pointer"
              aria-label="Cerrar panel de navegación"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid de Gestión Operativa (Enlaces directos a cada página) */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pb-1.5">
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
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-brand-accent'}`} />
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pb-1.5">
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
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-brand-accent'}`} />
                      <span>{tool.shortLabel}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Mobile Hub */}
          <div className="pt-2.5 border-t border-slate-200/80 grid grid-cols-3 gap-1.5 shrink-0">
            <NavLink
              to="/app/home"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Vista Socio</span>
            </NavLink>

            <NavLink
              to="/kiosk/check-in"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white"
            >
              <Tablet className="w-3.5 h-3.5 text-amber-400" />
              <span>Kiosco</span>
            </NavLink>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SIDEBAR DESKTOP (>= 768px) MINIMIZABLE Y CERRABLE     */}
      {/* ======================================================== */}
      {sidebarMode !== 'CLOSED' && (
        <aside
          className={`hidden md:flex ${
            sidebarMode === 'MINI' ? 'md:w-[72px] p-3' : 'md:w-64 p-5'
          } bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 shadow-subtle z-20 transition-all duration-200`}
        >
          <div>
            {/* Logo y Marca con controles de Minimizar / Cerrar */}
            <div
              className={`flex items-center ${
                sidebarMode === 'MINI' ? 'justify-center pb-3' : 'justify-between pb-4'
              } border-b border-slate-100`}
            >
              {sidebarMode === 'MINI' ? (
                <button
                  type="button"
                  onClick={() => updateSidebarMode('EXPANDED')}
                  title="Expandir panel de gestión (Ctrl+B)"
                  className="p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain drop-shadow-xs" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline text-xl tracking-tighter uppercase text-slate-900 block leading-none">
                          247Studio
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                        Panel de Gestión
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateSidebarMode('MINI')}
                      title="Minimizar a iconos (Ctrl+B)"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSidebarMode('CLOSED')}
                      title="Cerrar panel lateral para pantalla completa"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {sidebarMode === 'MINI' && (
              <div className="flex flex-col items-center gap-1 mt-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => updateSidebarMode('EXPANDED')}
                  title="Expandir menú"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSidebarMode('CLOSED')}
                  title="Ocultar barra lateral"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Menú de Gestión */}
            <div className="mt-4">
              {sidebarMode !== 'MINI' && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 pb-2">
                  Gestión Operativa
                </p>
              )}
              <nav className="space-y-1">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname.startsWith(link.to);
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      title={sidebarMode === 'MINI' ? link.label : undefined}
                      className={`flex items-center ${
                        sidebarMode === 'MINI' ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                      } rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className={`flex items-center ${sidebarMode === 'MINI' ? 'justify-center' : 'gap-2.5'}`}>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        {sidebarMode !== 'MINI' && <span>{link.label}</span>}
                      </div>
                      {sidebarMode !== 'MINI' && isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Herramientas de Tatami */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              {sidebarMode !== 'MINI' && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 pb-2">
                  Herramientas de Tatami
                </p>
              )}
              <div className="space-y-1">
                {tatamiTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = location.pathname.startsWith(tool.to);
                  return (
                    <NavLink
                      key={tool.to}
                      to={tool.to}
                      title={sidebarMode === 'MINI' ? tool.label : undefined}
                      className={`flex items-center ${
                        sidebarMode === 'MINI' ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                      } rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className={`flex items-center ${sidebarMode === 'MINI' ? 'justify-center' : 'gap-2.5'}`}>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        {sidebarMode !== 'MINI' && <span>{tool.label}</span>}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Sidebar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
            <NavLink
              to="/app/home"
              title="Vista de Alumno"
              className={`flex items-center ${
                sidebarMode === 'MINI' ? 'justify-center p-2.5' : 'gap-2 px-3.5 py-2'
              } rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition`}
            >
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              {sidebarMode !== 'MINI' && <span>Vista de Alumno</span>}
            </NavLink>

            <NavLink
              to="/kiosk/check-in"
              title="Modo Kiosco (Tablet)"
              className={`flex items-center ${
                sidebarMode === 'MINI' ? 'justify-center p-2.5' : 'gap-2 px-3.5 py-2'
              } rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition`}
            >
              <Tablet className="w-4 h-4 text-slate-400 shrink-0" />
              {sidebarMode !== 'MINI' && <span>Modo Kiosco (Tablet)</span>}
            </NavLink>

            <button
              onClick={logout}
              title="Cerrar Sesión"
              className={`flex items-center ${
                sidebarMode === 'MINI' ? 'justify-center p-2.5' : 'gap-2 px-3.5 py-2'
              } rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5 transition cursor-pointer text-left`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarMode !== 'MINI' && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Admin Viewport */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 p-3 md:p-6 lg:p-8 overflow-y-auto md:overflow-visible"
      >
        {/* Barra rápida superior en escritorio cuando el panel lateral está minimizado o cerrado */}
        <div className="hidden md:flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSidebarMode(sidebarMode === 'EXPANDED' ? 'MINI' : 'EXPANDED')}
              title={
                sidebarMode === 'EXPANDED'
                  ? 'Minimizar panel lateral (Ctrl+B)'
                  : 'Expandir panel lateral (Ctrl+B)'
              }
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
            >
              {sidebarMode === 'CLOSED' ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-brand-accent" />
                  <span>Mostrar Menú</span>
                </>
              ) : sidebarMode === 'MINI' ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-slate-700" />
                  <span>Expandir Menú</span>
                </>
              ) : (
                <>
                  <PanelLeft className="w-4 h-4 text-slate-500" />
                  <span>Minimizar Menú</span>
                </>
              )}
            </button>

            {sidebarMode !== 'CLOSED' && (
              <button
                type="button"
                onClick={() => updateSidebarMode('CLOSED')}
                title="Cerrar panel lateral para usar el 100% de la pantalla"
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-2xs"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Ocultar</span>
              </button>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Atajo rápido: <strong className="text-slate-600">Ctrl + B</strong>
          </span>
        </div>

        <div
          className={`${
            location.pathname.includes('/admin/horarios') || sidebarMode !== 'EXPANDED'
              ? 'max-w-[1600px]'
              : 'max-w-7xl'
          } mx-auto transition-all duration-200`}
        >
          <Outlet />
        </div>
      </main>

      {/* ======================================================== */}
      {/* 4. BARRA INFERIOR FIJA MODO TELÉFONO (< 768px)          */}
      {/* ======================================================== */}
      <nav
        aria-label="Navegación rápida de administración móvil"
        className="md:hidden shrink-0 bg-white border-t border-slate-200/90 px-2 py-1.5 grid grid-cols-5 gap-1 z-30 shadow-lg"
      >
        <NavLink
          to="/admin/personal"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              isActive ? 'text-brand-accent bg-rose-50/70' : 'text-slate-500 hover:text-slate-900'
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
              isActive ? 'text-brand-accent bg-rose-50/70' : 'text-slate-500 hover:text-slate-900'
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
              isActive ? 'text-brand-accent bg-rose-50/70' : 'text-slate-500 hover:text-slate-900'
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
              isActive ? 'text-brand-accent bg-rose-50/70' : 'text-slate-500 hover:text-slate-900'
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
            mobileMenuOpen ? 'text-brand-accent bg-rose-50/70' : 'text-slate-500 hover:text-slate-900'
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
