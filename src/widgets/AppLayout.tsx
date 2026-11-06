import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Activity,
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
  Shield,
  User,
  UserPlus,
  X,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

export const AppLayout: React.FC = () => {
  const { userData, role, logout } = useAuth();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
          <div className="flex items-center gap-2.5 px-2 pb-5 mb-2 border-b border-slate-100">
            <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-2xl tracking-tighter text-slate-900 uppercase leading-none">
                247STUDIO
              </span>
              <span className="w-2 h-2 rounded-full bg-brand-accent inline-block -mt-2" />
            </div>
          </div>

          {/* Menú agrupado por categorías como MatGoat */}
          <nav className="space-y-4">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {sec.title && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1 pt-1">
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
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
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
        {/* Barra superior estilo MatGoat con migas, acciones y avatar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
              <Home className="w-4 h-4 text-slate-400" />
              <span>{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Acción Rápida estilo MatGoat */}
            {role === 'admin' ? (
              <Link
                to="/admin/alta-alumno"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Añadir Alumno</span>
              </Link>
            ) : (
              <button
                onClick={() => setQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-accent" />
                <span>Ver Pase QR</span>
              </button>
            )}

            {/* Notificaciones con pastilla numérica */}
            <Link
              to="/app/avisos"
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Avisos"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-slate-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </Link>

            {/* Avatar de usuario con indicador online */}
            <Link to="/app/perfil" className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="relative">
                {userData?.photoUrl ? (
                  <img src={userData.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    {userData?.alias ? userData.alias.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
            </Link>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 3. CONTENIDO PRINCIPAL                                    */}
        {/* ======================================================== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-20 md:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ======================================================== */}
      {/* 4. DRAWER MÓVIL                                           */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
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
      {/* 5. MODAL PASE QR                                          */}
      {/* ======================================================== */}
      {qrModalOpen && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm relative">
            <QrCodePassCard user={userData} onClose={() => setQrModalOpen(false)} />
          </div>
        </div>
      )}
      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};