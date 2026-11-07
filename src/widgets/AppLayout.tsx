import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CreditCard,
  HeartPulse,
  HelpCircle,
  Home,
  Image,
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
import { BeltRoadmapModal } from '@/widgets/BeltRoadmapModal';
import { CurriculumModal } from '@/widgets/CurriculumModal';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';
import { MedicalAlertModal } from '@/widgets/MedicalAlertModal';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';
import { SparringLogModal } from '@/widgets/SparringLogModal';
import { SparringTimerModal } from '@/widgets/SparringTimerModal';
import { WeightDivisionModal } from '@/widgets/WeightDivisionModal';

export const AppLayout: React.FC = () => {
  const { userData, role, logout } = useAuth();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Tatami modals state
  const [timerOpen, setTimerOpen] = useState(false);
  const [weightCalcOpen, setWeightCalcOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [sparringLogOpen, setSparringLogOpen] = useState(false);
  const [beltRoadmapOpen, setBeltRoadmapOpen] = useState(false);
  const [medicalOpen, setMedicalOpen] = useState(false);

  // Global Keyboard Shortcuts
  useGlobalShortcuts({
    onToggleTimer: () => setTimerOpen((prev) => !prev),
    onToggleWeightCalc: () => setWeightCalcOpen((prev) => !prev),
    onToggleCurriculum: () => setCurriculumOpen((prev) => !prev),
    onCloseModals: () => {
      setTimerOpen(false);
      setWeightCalcOpen(false);
      setCurriculumOpen(false);
      setSparringLogOpen(false);
      setBeltRoadmapOpen(false);
      setMedicalOpen(false);
      setQrModalOpen(false);
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
    return 'Área Cliente';
  };

  const navSections = [
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. BARRA LATERAL (SIDEBAR) ESTILO MATGOAT - ULTRA LIMPIA  */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 h-screen sticky top-0">
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5">
          {/* Logo MatGoat Style con identidad 247Studio */}
          <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-slate-100">
            <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-2xl tracking-tighter text-slate-900 uppercase leading-none">
                247STUDIO
              </span>
              <span className="w-2 h-2 rounded-full bg-brand-accent inline-block -mt-2" />
            </div>
          </div>

          {/* Menú agrupado por categorías estilo Linear / Vercel */}
          <nav className="space-y-4">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {sec.title && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 pb-1.5 pt-1">
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
                            ? 'bg-slate-900 text-white font-bold shadow-subtle'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Herramientas de Tatami en Sidebar Alumno */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1 pt-1">
                TATAMI TOOLS
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setTimerOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition text-left"
                >
                  <Swords className="w-4 h-4 text-red-500" />
                  <span>Cronómetro Sparring</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWeightCalcOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition text-left"
                >
                  <Scale className="w-4 h-4 text-amber-500" />
                  <span>Calculadora de Peso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurriculumOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left"
                >
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>Currículum BJJ & Drills</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSparringLogOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition text-left"
                >
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Diario de Sparring</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBeltRoadmapOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                >
                  <Award className="w-4 h-4 text-purple-500" />
                  <span>Hoja de Ruta Cinturón</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedicalOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition text-left"
                >
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Primeros Auxilios</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Footer del Sidebar MatGoat Style */}
        <div className="p-4 border-t border-slate-100 space-y-1.5 bg-slate-50/50">
          <a
            href="https://wa.me/34677528185?text=Hola%2C%20necesito%20ayuda%20con%20la%20app%20de%20247Studio."
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition rounded-lg hover:bg-slate-100"
          >
            <QuestionIcon className="w-4 h-4 text-amber-500" />
            <span>¿Necesitas ayuda?</span>
          </a>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-brand-accent transition rounded-lg hover:bg-brand-accent/5"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. ÁREA PRINCIPAL CON HEADER SUPERIOR MATGOAT            */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior estilo Linear / Apple con migas limpias y acciones */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
              <span className="text-slate-400 font-mono text-xs hidden sm:inline">247Studio</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-headline tracking-wide uppercase text-slate-900 font-black text-sm sm:text-base">
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
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
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
                <DropdownMenuItem onClick={() => setQrModalOpen(true)} className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-brand-accent" />
                  <span>Ver Pase QR Tatami</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimerOpen(true)} className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-rose-500" />
                  <span>Cronómetro Sparring</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWeightCalcOpen(true)} className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-500" />
                  <span>Calculadora de Peso IBJJF</span>
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
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ======================================================== */}
      {/* 4. MENÚ MÓVIL DESPLEGABLE (DRAWER)                      */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 bg-white border-r border-slate-200 h-full flex flex-col justify-between z-10 p-5 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
                  <span className="font-headline text-2xl uppercase tracking-tighter text-slate-900">
                    247Studio
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-4">
                {navSections.map((sec, sIdx) => (
                  <div key={sIdx}>
                    {sec.title && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
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
                            onClick={() => setMobileDrawerOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                              isActive ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-100 text-slate-700">
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

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setQrModalOpen(true);
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2 rounded-xl transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-brand-accent" />
                <span>Ver mi Pase QR</span>
              </button>

              <button
                onClick={logout}
                className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-brand-accent flex items-center justify-center gap-2 rounded-xl border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
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

      {/* ======================================================== */}
      {/* 6. MODALES GLOBALES DE TATAMI & TOOLS                     */}
      {/* ======================================================== */}
      <SparringTimerModal
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
      />

      <WeightDivisionModal
        isOpen={weightCalcOpen}
        onClose={() => setWeightCalcOpen(false)}
      />

      <CurriculumModal
        isOpen={curriculumOpen}
        onClose={() => setCurriculumOpen(false)}
      />

      <SparringLogModal
        isOpen={sparringLogOpen}
        onClose={() => setSparringLogOpen(false)}
      />

      <BeltRoadmapModal
        isOpen={beltRoadmapOpen}
        onClose={() => setBeltRoadmapOpen(false)}
        currentBelt={userData?.belt || 'WHITE'}
        stripes={userData?.stripes || 0}
        totalClassesAttended={(userData as any)?.totalClassesAttended || 25}
      />

      <MedicalAlertModal
        isOpen={medicalOpen}
        onClose={() => setMedicalOpen(false)}
      />

      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};
