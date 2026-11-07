import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  HeartPulse,
  LogOut,
  Scale,
  Search,
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
import { CommandPaletteModal } from '@/widgets/CommandPaletteModal';
import { CurriculumModal } from '@/widgets/CurriculumModal';
import { KokoroAssistant } from '@/widgets/KokoroAssistant';
import { MedicalAlertModal } from '@/widgets/MedicalAlertModal';
import { SparringTimerModal } from '@/widgets/SparringTimerModal';
import { WeightDivisionModal } from '@/widgets/WeightDivisionModal';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuth();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [weightCalcOpen, setWeightCalcOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [medicalOpen, setMedicalOpen] = useState(false);

  // Global Keyboard Shortcuts
  useGlobalShortcuts({
    onToggleCommandPalette: () => setCommandPaletteOpen((prev) => !prev),
    onToggleTimer: () => setTimerOpen((prev) => !prev),
    onToggleWeightCalc: () => setWeightCalcOpen((prev) => !prev),
    onToggleCurriculum: () => setCurriculumOpen((prev) => !prev),
    onCloseModals: () => {
      setCommandPaletteOpen(false);
      setTimerOpen(false);
      setWeightCalcOpen(false);
      setCurriculumOpen(false);
      setMedicalOpen(false);
    },
  });

  const links = [
    { to: '/admin/personal', label: 'Alumnos', icon: Users },
    { to: '/admin/asistencia', label: 'Hoja de Asistencia', icon: UserCheck },
    { to: '/admin/caja', label: 'Caja y Pagos', icon: CreditCard },
    { to: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
    { to: '/admin/tarifas', label: 'Tarifas', icon: Tags },
    { to: '/admin/leads', label: 'Leads de Prueba', icon: Shield },
    { to: '/admin/alta-alumno', label: 'Alta de Alumno', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-slate-900 antialiased">
      {/* Sidebar Desktop MatGoat Clean */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <img src="/logo.webp" alt="247Studio" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-xl tracking-tighter uppercase text-slate-900 block leading-none">
                  247Studio
                </span>
                <span className="w-2 h-2 rounded-full bg-brand-accent inline-block" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                Panel Gestión
              </span>
            </div>
          </div>

          {/* Quick Search Button (Cmd+K) */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="mt-3 w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between text-xs text-slate-500 font-medium transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Buscar comando...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-mono font-bold text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* Menú de Gestión */}
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              GESTIÓN
            </p>
            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Herramientas de Tatami */}
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              TATAMI TOOLS
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setTimerOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition text-left"
              >
                <Swords className="w-4 h-4 text-red-600" />
                <span>Cronómetro Sparring</span>
              </button>

              <button
                type="button"
                onClick={() => setWeightCalcOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition text-left"
              >
                <Scale className="w-4 h-4 text-amber-500" />
                <span>Calculadora Peso IBJJF</span>
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
                onClick={() => setMedicalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition text-left"
              >
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Botiquín y Emergencias</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
          <NavLink
            to="/app/home"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Ver como Alumno</span>
          </NavLink>

          <NavLink
            to="/kiosk/check-in"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Tablet className="w-4 h-4 text-slate-500" />
            <span>Modo Kiosco (Tablet)</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5 transition"
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

      {/* Modales Globales de Tatami */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenTimer={() => setTimerOpen(true)}
        onOpenWeightCalc={() => setWeightCalcOpen(true)}
      />

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
