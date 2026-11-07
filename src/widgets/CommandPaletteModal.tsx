import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  Download,
  LogOut,
  Scale,
  Search,
  Sparkles,
  Swords,
  Tablet,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTimer?: () => void;
  onOpenWeightCalc?: () => void;
  onOpenKokoro?: () => void;
  onExportCsv?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: 'Navegación' | 'Tatami Tools' | 'Acciones Rápidas';
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenTimer,
  onOpenWeightCalc,
  onOpenKokoro,
  onExportCsv,
}) => {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isAdmin = role === 'admin';

  const commands: CommandItem[] = [
    // Tatami Tools
    {
      id: 'sparring-timer',
      title: 'Cronómetro de Sparring / Rondas',
      subtitle: 'Reloj oficial de dojo con campanas y descansos',
      icon: <Swords className="w-4 h-4 text-red-500" />,
      category: 'Tatami Tools',
      action: () => {
        onClose();
        onOpenTimer?.();
      },
    },
    {
      id: 'weight-calculator',
      title: 'Calculadora de Peso IBJJF / ADCC',
      subtitle: 'Comprueba tu categoría y margen con kimono',
      icon: <Scale className="w-4 h-4 text-amber-500" />,
      category: 'Tatami Tools',
      action: () => {
        onClose();
        onOpenWeightCalc?.();
      },
    },
    {
      id: 'kokoro-ai',
      title: 'Consultar a KOKORO AI Copiloto',
      subtitle: 'Preguntas sobre caja, retención, tatami y kaizen',
      icon: <Sparkles className="w-4 h-4 text-brand-accent" />,
      category: 'Tatami Tools',
      action: () => {
        onClose();
        onOpenKokoro?.();
      },
    },

    // Navegación
    ...(isAdmin
      ? [
          {
            id: 'nav-alumnos',
            title: 'Alumnos (Censo Oficial)',
            subtitle: 'Directorio de atletas, cinturones y fichas',
            icon: <Users className="w-4 h-4 text-blue-500" />,
            category: 'Navegación' as const,
            action: () => {
              navigate('/admin/personal');
              onClose();
            },
          },
          {
            id: 'nav-asistencia',
            title: 'Asistencia y Graduaciones',
            subtitle: 'Roll-call de clases y ascensos de grado',
            icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
            category: 'Navegación' as const,
            action: () => {
              navigate('/admin/asistencia');
              onClose();
            },
          },
          {
            id: 'nav-caja',
            title: 'Caja Diaria y Facturación',
            subtitle: 'Registro de cobros efectivo, tarjeta y cuotas',
            icon: <CreditCard className="w-4 h-4 text-purple-500" />,
            category: 'Navegación' as const,
            action: () => {
              navigate('/admin/caja');
              onClose();
            },
          },
          {
            id: 'nav-horarios',
            title: 'Horarios de Clases',
            subtitle: 'Configuración semanal y excepciones',
            icon: <Calendar className="w-4 h-4 text-orange-500" />,
            category: 'Navegación' as const,
            action: () => {
              navigate('/admin/horarios');
              onClose();
            },
          },
          {
            id: 'nav-leads',
            title: 'Leads y Clases de Prueba',
            subtitle: 'Gestión de visitantes y conversiones',
            icon: <UserPlus className="w-4 h-4 text-pink-500" />,
            category: 'Navegación' as const,
            action: () => {
              navigate('/admin/leads');
              onClose();
            },
          },
        ]
      : []),

    {
      id: 'nav-kiosk',
      title: 'Pantalla Kiosco Check-in (Tablet)',
      subtitle: 'Modo recepción para entrada por QR en tatami',
      icon: <Tablet className="w-4 h-4 text-indigo-500" />,
      category: 'Navegación',
      action: () => {
        navigate('/kiosk');
        onClose();
      },
    },

    // Acciones Rápidas
    ...(isAdmin && onExportCsv
      ? [
          {
            id: 'export-csv',
            title: 'Exportar Censo de Alumnos (CSV)',
            subtitle: 'Descarga inmediata para Excel de todos los atletas',
            icon: <Download className="w-4 h-4 text-emerald-600" />,
            category: 'Acciones Rápidas' as const,
            action: () => {
              onClose();
              onExportCsv();
            },
          },
        ]
      : []),
    {
      id: 'action-logout',
      title: 'Cerrar Sesión Segura',
      subtitle: 'Salir de la cuenta de 247 Studio',
      icon: <LogOut className="w-4 h-4 text-red-500" />,
      category: 'Acciones Rápidas',
      action: () => {
        onClose();
        logout();
      },
    },
  ];

  const filteredCommands = commands.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Escribe un comando o busca una sección... (↑↓ para navegar, Enter para abrir)"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-mono font-bold">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No se encontraron comandos para &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition ${
                    isSelected ? 'bg-amber-500/10 border border-amber-400/40 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>247 Studio Command Navigator</span>
          <div className="flex items-center gap-2">
            <span>Presiona</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
              Ctrl+K
            </kbd>
            <span>en cualquier lugar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
