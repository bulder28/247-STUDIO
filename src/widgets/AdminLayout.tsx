import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  HeartPulse,
  LogOut,
  Scale,
  Shield,
  Swords,
  Tablet,
  Tags,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { CurriculumModal } from '@/widgets/CurriculumModal';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';
import { MedicalAlertModal } from '@/widgets/MedicalAlertModal';
import { SparringTimerModal } from '@/widgets/SparringTimerModal';
import { WeightDivisionModal } from '@/widgets/WeightDivisionModal';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const [timerOpen, setTimerOpen] = useState(false);
  const [weightCalcOpen, setWeightCalcOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
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
      setMedicalOpen(false);
    },
  });

  const links = [
    { to: '/admin/personal', label: 'Alumnos & Cinturones', icon: Users },
    { to: '/admin/asistencia', label: 'Hoja de Asistencia', icon: UserCheck },
    { to: '/admin/caja', label: 'Caja y Pagos', icon: CreditCard },
    { to: '/admin/horarios', label: 'Horarios de Tatami', icon: CalendarDays },
    { to: '/admin/tarifas', label: 'Tarifas & MRR', icon: Tags },
    { to: '/admin/leads', label: 'Embudo de Leads', icon: Shield },
    { to: '/admin/alta-alumno', label: 'Alta de Alumno', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-slate-900 antialiased selection:bg-brand-accent selection:text-white">
      {/* Sidebar Desktop Linear/Apple Clean */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 shadow-subtle z-20">
        <div>
          {/* Logo y Marca */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="relative">
              <img src="/logo.webp" alt="247Studio" className="w-9 h-9 object-contain drop-shadow-xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
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

          {/* Menú de Gestión con estilo Linear */}
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 pb-2">
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
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
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
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 pb-2">
              Herramientas de Tatami
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setTimerOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-red-50/80 hover:text-red-700 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Swords className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                  <span>Cronómetro Sparring</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-red-100">
                  Alt+T
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWeightCalcOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50/80 hover:text-amber-800 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Scale className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Calculadora IBJJF</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-amber-100">
                  Alt+W
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurriculumOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>Currículum & Drills</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-blue-100">
                  Alt+C
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMedicalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50/80 hover:text-rose-700 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <HeartPulse className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  <span>Botiquín Tatami</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-rose-100">
                  SOS
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
          <NavLink
            to="/app/home"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Vista de Alumno</span>
          </NavLink>

          <NavLink
            to="/kiosk/check-in"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Tablet className="w-4 h-4 text-slate-400" />
            <span>Modo Kiosco (Tablet)</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5 transition cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Modales Globales de Tatami */}
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

      <MedicalAlertModal
        isOpen={medicalOpen}
        onClose={() => setMedicalOpen(false)}
      />

      {/* Asistente Inteligente KOKORO */}
      <KokoroAssistant />
    </div>
  );
};
