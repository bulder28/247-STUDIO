import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  ClipboardCheck,
  CreditCard,
  Users,
  CalendarDays,
  Tags,
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  User,
  CornerDownLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StudentHit {
  id: string;
  full_name: string;
  alias: string | null;
  status: string;
}

const ROUTE_ITEMS = [
  { to: '/admin/pasar-lista', label: 'Pasar lista', group: 'Día a día', icon: ClipboardCheck },
  { to: '/admin/seguimiento', label: 'Cobros', group: 'Día a día', icon: CreditCard },
  { to: '/admin/alumnos', label: 'Alumnos', group: 'Día a día', icon: Users },
  { to: '/admin/horarios', label: 'Horarios', group: 'Academia', icon: CalendarDays },
  { to: '/admin/tarifas', label: 'Tarifas', group: 'Academia', icon: Tags },
  { to: '/admin/comunicacion', label: 'Comunicación', group: 'Academia', icon: MessageSquare },
  { to: '/admin', label: 'Resumen', group: 'Dirección', icon: LayoutDashboard },
  { to: '/admin/kpis', label: 'KPIs', group: 'Dirección', icon: BarChart3 },
];

export function AdminCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIdx(0);
      return;
    }
    if (students.length > 0) return;
    supabase
      .from('profiles')
      .select('id, full_name, alias, status')
      .eq('role', 'client')
      .order('full_name')
      .then(({ data }) => {
        if (data) setStudents(data as StudentHit[]);
      });
  }, [open, students.length]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedRoutes = ROUTE_ITEMS.filter(
      (r) => !q || r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)
    ).map((r) => ({
      kind: 'route' as const,
      id: r.to,
      title: r.label,
      subtitle: r.group,
      to: r.to,
      icon: r.icon,
    }));

    const matchedStudents = (
      q
        ? students.filter(
            (s) =>
              s.full_name.toLowerCase().includes(q) ||
              (s.alias ?? '').toLowerCase().includes(q)
          )
        : students
    )
      .slice(0, q ? 8 : 4)
      .map((s) => ({
        kind: 'student' as const,
        id: s.id,
        title: s.full_name,
        subtitle: s.alias ? `“${s.alias}” · ${s.status}` : `Alumno · ${s.status}`,
        to: `/admin/alumnos?q=${encodeURIComponent(s.full_name)}`,
        icon: User,
      }));

    return [...matchedRoutes, ...matchedStudents];
  }, [query, students]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const selectEntry = (entry: (typeof entries)[number] | undefined) => {
    if (!entry) return;
    onClose();
    navigate(entry.to);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-start justify-center pt-[14vh] px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl studio-panel border border-white/15 shadow-modal overflow-hidden"
            role="dialog"
            aria-label="Buscador rápido"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose();
                  else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(entries.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    selectEntry(entries[activeIdx]);
                  }
                }}
                placeholder="Ir a pestaña o buscar alumno..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 rounded">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
              {entries.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Sin resultados para &ldquo;{query}&rdquo;.
                </p>
              ) : (
                entries.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => selectEntry(item)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`grid place-items-center w-7 h-7 rounded-lg shrink-0 ${
                            item.kind === 'student'
                              ? 'bg-studio-red/20 text-red-300'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                        </div>
                      </div>
                      {active && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

