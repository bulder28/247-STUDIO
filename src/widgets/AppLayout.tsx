import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Home,
  Image,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Shield,
  User,
  UserPlus,
  X,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { getMadridTimeComponents } from '@/shared/domain/schedule';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  badgeColor?: string;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export type SidebarMode = 'EXPANDED' | 'MINI' | 'CLOSED';

export const AppLayout: React.FC = () => {
  const { userData, role, logout } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [todayBookingSummary, setTodayBookingSummary] = useState<string | undefined>(undefined);

  // Cotejar reserva de hoy al abrir el Carnet Virtual (QR)
  useEffect(() => {
    if (!qrModalOpen || !userData?.uid) return;
    const todayStr = getMadridTimeComponents(new Date()).dateStr;
    const fetchTodayBooking = async () => {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('uid', '==', userData.uid),
          where('date', '==', todayStr)
        );
        const snap = await getDocs(q);
        const active = snap.docs
          .map((d) => d.data())
          .find((b) => b.status === 'BOOKED' || b.status === 'WAITLISTED');

        if (active && active.scheduleId) {
          const schedSnap = await getDoc(doc(db, 'schedules', active.scheduleId));
          const schedData = schedSnap.exists() ? schedSnap.data() : null;
          if (schedData) {
            setTodayBookingSummary(
              `Reserva confirmada hoy: ${schedData.program} a las ${schedData.startTime} en ${schedData.room || 'Tatami Principal'}.`
            );
          } else {
            setTodayBookingSummary('Reserva confirmada para hoy. Torno habilitado para cotejo de acceso.');
          }
        } else {
          setTodayBookingSummary(undefined);
        }
      } catch (err) {
        console.error('Error fetching today booking for QR card:', err);
        setTodayBookingSummary(undefined);
      }
    };
    fetchTodayBooking();
  }, [qrModalOpen, userData?.uid]);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    try {
      const saved = localStorage.getItem('247_sidebar_mode') as SidebarMode | null;
      if (saved === 'EXPANDED' || saved === 'MINI' || saved === 'CLOSED') return saved;
    } catch {}
    return 'EXPANDED';
  });

  const updateSidebarMode = (mode: SidebarMode) => {
    setSidebarMode(mode);
    try {
      localStorage.setItem('247_sidebar_mode', mode);
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
    setMobileDrawerOpen(false);
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Global Keyboard Shortcuts (Atajos rápidos de teclado)
  useGlobalShortcuts({
    onCloseModals: () => {
      setQrModalOpen(false);
      setMobileDrawerOpen(false);
    },
  });

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/app/home')) return 'Hoy';
    if (path.includes('/app/horario')) return 'Clases';
    if (path.includes('/app/progreso')) return 'Progreso';
    if (path.includes('/app/pagos')) return 'Pagos';
    if (path.includes('/app/perfil')) return 'Yo';
    if (path.includes('/app/avisos')) return 'Avisos';
    if (path.includes('/app/foro')) return 'Foro';
    if (path.includes('/app/faqs')) return 'Preguntas frecuentes';
    if (path.includes('/app/media')) return 'Fotos y vídeos';
    return 'Mi cuenta';
  };

  const navSections: NavSection[] = [
    {
      title: null,
      items: [
        { to: '/app/home', label: 'Hoy', icon: Home, badge: null },
        { to: '/app/horario', label: 'Clases', icon: Calendar, badge: null },
        { to: '/app/progreso', label: 'Progreso', icon: Activity, badge: null },
        { to: '/app/pagos', label: 'Pagos', icon: CreditCard, badge: null },
        { to: '/app/perfil', label: 'Yo', icon: User, badge: null },
      ],
    },
    {
      title: 'Comunidad',
      items: [
        { to: '/app/avisos', label: 'Avisos', icon: Bell, badge: null },
        { to: '/app/foro', label: 'Foro', icon: MessageSquare, badge: null },
        { to: '/app/media', label: 'Fotos y vídeos', icon: Image, badge: null },
        { to: '/app/faqs', label: 'Preguntas frecuentes', icon: HelpCircle, badge: null },
      ],
    },
    ...(role === 'admin' || role === 'coach'
      ? [
          {
            title: 'Gestión',
            items: [{ to: '/admin/personal', label: 'Panel del gimnasio', icon: Shield, badge: null }],
          },
        ]
      : []),
  ];

  const isCalendarPage = location.pathname.includes('/app/horario');
  const isMini = sidebarMode === 'MINI';
  const isClosed = sidebarMode === 'CLOSED';

  return (
    <div className="h-[100dvh] md:min-h-screen md:h-auto overflow-hidden md:overflow-visible bg-[#F8F9FA] flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. BARRA LATERAL (SIDEBAR) MINIMIZABLE Y CERRABLE         */}
      {/* ======================================================== */}
      {!isClosed && (
        <aside
          className={`hidden md:flex ${
            isMini ? 'md:w-[72px]' : 'md:w-64'
          } bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 h-screen sticky top-0 shadow-subtle z-20 transition-all duration-200`}
        >
          <div className={`flex-1 flex flex-col overflow-y-auto ${isMini ? 'px-2 py-4' : 'px-4 py-5'}`}>
            {/* Cabecera del Sidebar con controles de Minimizar / Cerrar */}
            <div
              className={`flex items-center ${
                isMini ? 'justify-center pb-3 mb-2' : 'justify-between px-2 pb-4 mb-2'
              } border-b border-slate-100`}
            >
              {isMini ? (
                <button
                  type="button"
                  onClick={() => updateSidebarMode('EXPANDED')}
                  title="Expandir panel lateral (Ctrl+B)"
                  className="p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
                >
                  <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain" />
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline text-2xl tracking-tighter text-slate-900 uppercase leading-none">
                        247STUDIO
                      </span>
                      <span className="w-2 h-2 rounded-full bg-brand-accent inline-block -mt-2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateSidebarMode('MINI')}
                      title="Minimizar a iconos (Ctrl+B)"
                      aria-label="Minimizar barra lateral"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSidebarMode('CLOSED')}
                      title="Cerrar panel lateral para pantalla completa"
                      aria-label="Cerrar barra lateral"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Botón rápido de expandir cuando está en modo MINI */}
            {isMini && (
              <div className="flex flex-col items-center gap-1 mb-3 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => updateSidebarMode('EXPANDED')}
                  title="Expandir menú lateral"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSidebarMode('CLOSED')}
                  title="Ocultar barra lateral por completo"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Menú agrupado por categorías con soporte EXPANDED / MINI */}
            <nav className={isMini ? 'space-y-2' : 'space-y-4'}>
              {navSections.map((sec, sIdx) => (
                <div key={sIdx}>
                  {!isMini && sec.title && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 pb-1.5 pt-1">
                      {sec.title}
                    </p>
                  )}
                  {isMini && sIdx > 0 && <div className="my-1.5 border-t border-slate-100" />}
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.to);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          title={isMini ? item.label : undefined}
                          className={`flex items-center ${
                            isMini ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                          } rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                            isActive
                              ? 'bg-slate-900 text-white font-bold shadow-subtle'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`}
                        >
                          <div className={`flex items-center ${isMini ? 'justify-center' : 'gap-2.5'}`}>
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                            {!isMini && <span>{item.label}</span>}
                          </div>
                          {!isMini && item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isMini && item.badge && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-accent" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer del Sidebar */}
          <div className={`${isMini ? 'p-2' : 'p-4'} border-t border-slate-100 space-y-1.5 bg-slate-50/50`}>
            <a
              href="https://wa.me/34677528185?text=Hola%2C%20necesito%20ayuda%20con%20la%20app%20de%20247Studio."
              target="_blank"
              rel="noreferrer"
              title="¿Necesitas ayuda?"
              className={`flex items-center ${
                isMini ? 'justify-center p-2.5' : 'gap-2 px-3 py-2'
              } text-xs font-medium text-slate-500 hover:text-slate-900 transition rounded-lg hover:bg-slate-100`}
            >
              <QuestionIcon className="w-4 h-4 text-amber-500 shrink-0" />
              {!isMini && <span>¿Necesitas ayuda?</span>}
            </a>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className={`flex w-full items-center ${
                isMini ? 'justify-center p-2.5' : 'gap-2 px-3 py-2'
              } text-xs font-medium text-slate-500 hover:text-brand-accent transition rounded-lg hover:bg-brand-accent/5 cursor-pointer`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isMini && <span>Cerrar sesión</span>}
            </button>
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* 2. ÁREA PRINCIPAL CON HEADER SUPERIOR MATGOAT            */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Barra superior estilo Linear / Apple con control de Sidebar y acciones */}
        <header className="shrink-0 sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/70 px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-2.5">
            {/* Botón Menú Móvil (< 768px) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Abrir menú de páginas"
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Botón Control de Panel Lateral en Escritorio (>= 768px) */}
            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateSidebarMode(sidebarMode === 'EXPANDED' ? 'MINI' : 'EXPANDED')
                }
                title={
                  sidebarMode === 'EXPANDED'
                    ? 'Minimizar panel lateral (Ctrl+B)'
                    : 'Expandir panel lateral (Ctrl+B)'
                }
                aria-label="Alternar tamaño del panel lateral"
                className="p-2 rounded-xl border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {sidebarMode === 'CLOSED' ? (
                  <>
                    <PanelLeftOpen className="w-4 h-4 text-brand-accent" />
                    <span className="hidden lg:inline">Menú</span>
                  </>
                ) : sidebarMode === 'MINI' ? (
                  <PanelLeftOpen className="w-4 h-4 text-slate-700" />
                ) : (
                  <PanelLeft className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {sidebarMode !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={() => updateSidebarMode('CLOSED')}
                  title="Cerrar panel lateral para ganar máximo espacio"
                  aria-label="Ocultar panel lateral"
                  className="p-2 rounded-xl border border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
              <span className="text-slate-400 font-mono text-xs hidden sm:inline">247Studio</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-headline tracking-wide uppercase text-slate-900 font-black text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">
                {getPageTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Acción Rápida */}
            {role === 'admin' ? (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 shadow-2xs">
                <Link to="/admin/alta-alumno">
                  <UserPlus className="w-3.5 h-3.5 text-brand-accent" />
                  <span>+ Alta Alumno</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrModalOpen(true)}
                className="inline-flex gap-1.5 shadow-2xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-accent" />
                <span>Pase QR</span>
              </Button>
            )}

            {/* Notificaciones */}
            <Link
              to="/app/avisos"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Avisos"
            >
              <Bell className="w-4 h-4" />
            </Link>

            {/* Radix Dropdown Menu con Avatar de usuario e indicador online */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-2xl hover:bg-slate-100/80 transition cursor-pointer border border-transparent hover:border-slate-200 outline-none"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-slate-200 ring-2 ring-white shadow-xs">
                      {userData?.photoUrl && <AvatarImage src={userData.photoUrl} alt={userData?.alias || ''} />}
                      <AvatarFallback className="bg-slate-900 text-amber-400 font-black text-[11px]">
                        {userData?.alias?.slice(0, 2).toUpperCase() || '24'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {userData?.alias || 'Atleta'}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-none capitalize">
                      {role === 'admin' ? 'Profesor / Admin' : 'Atleta'}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-black text-slate-900">{userData?.alias || 'Atleta'}</p>
                    <p className="text-[11px] font-normal text-slate-500 truncate">{userData?.contactEmail || ''}</p>
                    <div className="pt-1 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-wider py-0">
                        {userData?.belt || 'WHITE'} · {userData?.stripes || 0}G
                      </Badge>
                      <Badge variant={role === 'admin' ? 'destructive' : 'secondary'} className="text-[9px] py-0">
                        {role === 'admin' ? 'Coach' : 'Atleta'}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/perfil" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Mi Perfil & Stats</span>
                  </Link>
                </DropdownMenuItem>
                {role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/personal" className="flex items-center gap-2 font-bold text-slate-900">
                        <Shield className="w-4 h-4 text-brand-accent" />
                        <span>Panel Admin / Alumnos</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 3. CONTENIDO DE PÁGINA (OUTLET)                          */}
        {/* ======================================================== */}
        <main
          ref={mainRef}
          className={`flex-1 min-h-0 overflow-y-auto md:overflow-visible p-3 sm:p-6 lg:p-8 ${
            isCalendarPage || sidebarMode !== 'EXPANDED' ? 'max-w-[1600px]' : 'max-w-7xl'
          } w-full mx-auto transition-all duration-200`}
        >
          <Outlet />
        </main>

        {/* ======================================================== */}
        {/* 3.5 BARRA INFERIOR FIJA MODO TELÉFONO (< 768px)          */}
        {/* ======================================================== */}
        <nav
          aria-label="Navegación principal"
          className="md:hidden shrink-0 bg-white border-t border-slate-200/90 px-1 pt-1 pb-2 grid grid-cols-5 z-30"
        >
          <NavLink
            to="/app/home"
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? 'text-studio-navy font-semibold' : 'text-slate-600'
              }`
            }
          >
            <Home className="w-6 h-6" aria-hidden="true" />
            <span>Hoy</span>
          </NavLink>
          <NavLink
            to="/app/horario"
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? 'text-studio-navy font-semibold' : 'text-slate-600'
              }`
            }
          >
            <Calendar className="w-6 h-6" aria-hidden="true" />
            <span>Clases</span>
          </NavLink>
          <NavLink
            to="/app/progreso"
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? 'text-studio-navy font-semibold' : 'text-slate-600'
              }`
            }
          >
            <Activity className="w-6 h-6" aria-hidden="true" />
            <span>Progreso</span>
          </NavLink>
          <NavLink
            to="/app/pagos"
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? 'text-studio-navy font-semibold' : 'text-slate-600'
              }`
            }
          >
            <CreditCard className="w-6 h-6" aria-hidden="true" />
            <span>Pagos</span>
          </NavLink>
          <NavLink
            to="/app/perfil"
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? 'text-studio-navy font-semibold' : 'text-slate-600'
              }`
            }
          >
            <User className="w-6 h-6" aria-hidden="true" />
            <span>Yo</span>
          </NavLink>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* 4. LAUNCHER MÓVIL A PANTALLA COMPLETA: CADA PESTAÑA ABRE SU PÁGINA */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#F8F9FA] flex flex-col justify-between p-4 h-[100dvh] overflow-hidden animate-in fade-in duration-150">
          {/* Cabecera compacta */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain" />
              <div>
                <span className="font-headline text-lg uppercase tracking-tighter text-slate-900 block leading-none">
                  247Studio
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
                  Navegación Móvil Directa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Cerrar menú móvil"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Secciones de Navegación Móvil */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {sec.title && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pb-1">
                    {sec.title}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                          isActive
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-brand-accent'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-800 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pie compacto del Launcher Móvil */}
          <div className="pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setQrModalOpen(true);
              }}
              className="py-2.5 text-xs font-bold text-white bg-slate-900 flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Mi Pase QR</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="py-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL PASE QR CON RADIX DIALOG                        */}
      {/* ======================================================== */}
      <Dialog open={qrModalOpen && !!userData} onOpenChange={(open) => setQrModalOpen(open)}>
        <DialogContent className="max-w-sm p-0 bg-transparent border-0 shadow-none">
          {userData && (
            <QrCodePassCard
              user={userData}
              todayBookingText={todayBookingSummary}
              onClose={() => setQrModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};
