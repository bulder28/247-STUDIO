import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CreditCard,
  HelpCircle,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  Scale,
  Shield,
  Swords,
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

export const AppLayout: React.FC = () => {
  const { userData, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Global Keyboard Shortcuts (Atajos rápidos de teclado con navegación directa)
  useGlobalShortcuts({
    onToggleTimer: () => navigate('/app/cronometro'),
    onToggleWeightCalc: () => navigate('/app/peso'),
    onToggleCurriculum: () => navigate('/app/curriculum'),
    onCloseModals: () => {
      setQrModalOpen(false);
      setMobileDrawerOpen(false);
    },
  });

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/app/home')) return 'Bienvenido';
    if (path.includes('/app/historial')) return 'Historial & Asistencia';
    if (path.includes('/app/horario')) return 'Mi Calendario & Horarios';
    if (path.includes('/app/perfil')) return 'Personal Info';
    if (path.includes('/app/programas')) return 'Programas & Tarifas';
    if (path.includes('/app/avisos')) return 'Avisos & Comunicados';
    if (path.includes('/app/foro')) return 'Foro de la Comunidad';
    if (path.includes('/app/faqs')) return 'Preguntas Frecuentes';
    if (path.includes('/app/media')) return 'Media & Galería';
    if (path.includes('/app/cronometro')) return 'Cronómetro Sparring';
    if (path.includes('/app/peso')) return 'Calculadora Peso IBJJF';
    if (path.includes('/app/curriculum')) return 'Currículum BJJ & Drills';
    if (path.includes('/app/sparring')) return 'Diario de Sparring';
    if (path.includes('/app/cinturon')) return 'Hoja de Ruta de Cinturón';
    return 'Área Cliente';
  };

  const navSections: NavSection[] = [
    {
      title: null,
      items: [{ to: '/app/home', label: 'Bienvenido', icon: Home, badge: null }],
    },
    {
      title: 'ENTRENAMIENTO',
      items: [
        { to: '/app/historial', label: 'Historial', icon: Activity, badge: null },
        { to: '/app/horario', label: 'Mi Calendario', icon: Calendar, badge: null },
        { to: '/app/programas', label: 'Programas & Tarifas', icon: CreditCard, badge: null },
      ],
    },
    {
      title: 'CONTENIDO',
      items: [
        { to: '/app/avisos', label: 'Mensajes / Avisos', icon: Bell, badge: '3', badgeColor: 'bg-slate-800 text-white' },
        { to: '/app/foro', label: 'Foro Comunidad', icon: MessageSquare, badge: null },
        { to: '/app/media', label: 'Media', icon: Image, badge: null },
        { to: '/app/faqs', label: 'Recursos / FAQs', icon: HelpCircle, badge: null },
      ],
    },
    {
      title: 'TATAMI TOOLS',
      items: [
        { to: '/app/cronometro', label: 'Cronómetro Sparring', icon: Swords, badge: null },
        { to: '/app/peso', label: 'Calculadora de Peso', icon: Scale, badge: null },
        { to: '/app/curriculum', label: 'Currículum BJJ & Drills', icon: BookOpen, badge: null },
        { to: '/app/sparring', label: 'Diario de Sparring', icon: Activity, badge: null },
        { to: '/app/cinturon', label: 'Hoja de Ruta Cinturón', icon: Award, badge: null },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        { to: '/app/perfil', label: 'Personal Info', icon: User, badge: null },
        ...(role === 'admin'
          ? [{ to: '/admin/personal', label: 'Profesor / Admin', icon: Shield, badge: '→', badgeColor: 'text-brand-accent font-bold' }]
          : []),
      ],
    },
  ];

  return (
    <div className="h-[100dvh] md:min-h-screen md:h-auto overflow-hidden md:overflow-visible bg-[#F4F4F5] flex flex-col md:flex-row text-[#09090B] font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. BARRA LATERAL (SIDEBAR) SWISS MONOCHROME + VERMILION   */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-[#E4E4E7] flex-col justify-between shrink-0 h-screen sticky top-0 shadow-subtle z-20">
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5">
          {/* Logo con identidad Swiss Monochrome 247Studio */}
          <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-[#E4E4E7]">
            <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-2xl tracking-tighter text-[#09090B] uppercase leading-none">
                247STUDIO
              </span>
              <span className="w-2 h-2 rounded-full bg-brand-accent inline-block -mt-2" />
            </div>
          </div>

          {/* Menú agrupado por categorías con enlaces directos a cada página */}
          <nav className="space-y-4">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {sec.title && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-3 pb-1.5 pt-1">
                    {sec.title}
                  </p>
                )}
                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-[#09090B] text-white font-bold shadow-subtle'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#09090B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-zinc-100 text-zinc-700'}`}>
                            {item.badge}
                          </span>
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
        <div className="p-4 border-t border-[#E4E4E7] space-y-1.5 bg-zinc-50/50">
          <a
            href="https://wa.me/34677528185?text=Hola%2C%20necesito%20ayuda%20con%20la%20app%20de%20247Studio."
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-[#09090B] transition rounded-lg hover:bg-zinc-100"
          >
            <QuestionIcon className="w-4 h-4 text-zinc-400" />
            <span>¿Necesitas ayuda?</span>
          </a>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-brand-accent transition rounded-lg hover:bg-brand-accent/5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. ÁREA PRINCIPAL CON HEADER SUPERIOR SWISS MONOCHROME   */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Barra superior estilo Suizo con migas limpias y acciones */}
        <header className="shrink-0 sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#E4E4E7] px-3.5 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Abrir menú de páginas"
              className="md:hidden p-2 rounded-xl border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700">
              <span className="text-zinc-400 font-mono text-xs hidden sm:inline">247Studio</span>
              <span className="text-zinc-300 hidden sm:inline">/</span>
              <span className="font-headline tracking-wide uppercase text-[#09090B] font-black text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">
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

            {/* Notificaciones con pastilla numérica */}
            <Link
              to="/app/avisos"
              className="relative p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-[#09090B] transition"
              title="Avisos"
            >
              <Bell className="w-4 h-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center font-bold">
                3
              </Badge>
            </Link>

            {/* Radix Dropdown Menu con Avatar de usuario e indicador online */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-2xl hover:bg-zinc-100 transition cursor-pointer border border-transparent hover:border-[#E4E4E7] outline-none"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-[#E4E4E7] ring-2 ring-white shadow-xs">
                      {userData?.photoUrl && <AvatarImage src={userData.photoUrl} alt={userData?.alias || ''} />}
                      <AvatarFallback className="bg-[#09090B] text-white font-black text-[11px]">
                        {userData?.alias?.slice(0, 2).toUpperCase() || '24'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="text-xs font-bold text-[#09090B] block leading-tight">
                      {userData?.alias || 'Atleta'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block leading-none capitalize">
                      {role === 'admin' ? 'Profesor / Admin' : 'Atleta'}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-black text-[#09090B]">{userData?.alias || 'Atleta'}</p>
                    <p className="text-[11px] font-normal text-zinc-500 truncate">{userData?.contactEmail || ''}</p>
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
                    <User className="w-4 h-4 text-zinc-500" />
                    <span>Mi Perfil & Stats</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQrModalOpen(true)} className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-brand-accent" />
                  <span>Ver Pase QR Tatami</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/cronometro" className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-zinc-500" />
                    <span>Cronómetro Sparring</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/peso" className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-zinc-500" />
                    <span>Calculadora de Peso IBJJF</span>
                  </Link>
                </DropdownMenuItem>
                {role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/personal" className="flex items-center gap-2 font-bold text-[#09090B]">
                        <Shield className="w-4 h-4 text-brand-accent" />
                        <span>Panel Admin / Alumnos</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-brand-accent focus:text-brand-accent-dark focus:bg-rose-50">
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
          className="flex-1 min-h-0 overflow-y-auto md:overflow-visible p-3 sm:p-8 max-w-7xl w-full mx-auto"
        >
          <Outlet />
        </main>

        {/* ======================================================== */}
        {/* 3.5 BARRA INFERIOR FIJA MODO TELÉFONO (< 768px)          */}
        {/* ======================================================== */}
        <nav
          aria-label="Navegación principal móvil"
          className="md:hidden shrink-0 bg-white border-t border-[#E4E4E7] px-2 py-1.5 grid grid-cols-5 gap-1 z-30 shadow-lg"
        >
          <NavLink
            to="/app/home"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
                isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
              }`
            }
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span>Inicio</span>
          </NavLink>

          <NavLink
            to="/app/horario"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
                isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
              }`
            }
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span>Calendario</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black text-white bg-[#09090B] shadow-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 mb-0.5 text-white" />
            <span>Pase QR</span>
          </button>

          <NavLink
            to="/app/historial"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
                isActive ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
              }`
            }
          >
            <Activity className="w-4 h-4 mb-0.5" />
            <span>Historial</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
              mobileDrawerOpen ? 'text-brand-accent bg-rose-50/80' : 'text-zinc-500 hover:text-[#09090B]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mb-0.5" />
            <span>Páginas</span>
          </button>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* 4. LAUNCHER MÓVIL A PANTALLA COMPLETA: CADA PESTAÑA ABRE SU PÁGINA */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#F4F4F5] flex flex-col justify-between p-4 h-[100dvh] overflow-hidden animate-in fade-in duration-150">
          {/* Cabecera compacta */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E4E7] shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="247Studio" className="w-7 h-7 object-contain" />
              <div>
                <span className="font-headline text-lg uppercase tracking-tighter text-[#09090B] block leading-none">
                  247Studio
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block">
                  Navegación Móvil Directa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Cerrar menú móvil"
              className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Secciones de Navegación Móvil */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {sec.title && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1 pb-1">
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
                            ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                            : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-zinc-100 text-[#09090B] shrink-0">
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
          <div className="pt-2.5 border-t border-[#E4E4E7] grid grid-cols-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setQrModalOpen(true);
              }}
              className="py-2.5 text-xs font-bold text-white bg-[#09090B] flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Mi Pase QR</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="py-2.5 text-xs font-bold text-brand-accent bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
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
            <QrCodePassCard user={userData} onClose={() => setQrModalOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};
