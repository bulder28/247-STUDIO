import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { BJJ_CURRICULUM } from '@/shared/domain/curriculum';

interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('247_mastered_techniques');
      return saved ? JSON.parse(saved) : ['esc_mount_upa', 'sub_armbar_guard'];
    } catch {
      return ['esc_mount_upa'];
    }
  });

  if (!isOpen) return null;

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('247_mastered_techniques', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filtered = BJJ_CURRICULUM.filter((t) => {
    if (selectedPillar === 'ALL') return true;
    return t.pillar === selectedPillar;
  });

  const progressPercent = Math.round((masteredIds.length / BJJ_CURRICULUM.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Currículum Técnico BJJ & Drills
              </h2>
              <p className="text-xs text-slate-400">Programa formativo oficial de 247 STUDIO</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Tu Progreso Técnico Asimilado</span>
              <span className="font-black text-amber-600">
                {masteredIds.length} / {BJJ_CURRICULUM.length} Técnicas ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'ESCAPES', label: '🛡️ Escapes' },
            { id: 'PASSES', label: '⚡ Pases' },
            { id: 'SWEEPS', label: '🔄 Raspados' },
            { id: 'SUBMISSIONS', label: '🥋 Sumisiones' },
            { id: 'TAKEDOWNS', label: '🤼 Derribos' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedPillar(pill.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition border ${
                selectedPillar === pill.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Technique List */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100">
          {filtered.map((item) => {
            const isMastered = masteredIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleMastered(item.id)}
                className={`pt-3 first:pt-0 p-3 rounded-2xl cursor-pointer transition border ${
                  isMastered
                    ? 'bg-emerald-50/50 border-emerald-200/80'
                    : 'bg-white hover:bg-slate-50 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                    >
                      {isMastered ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold ${
                            isMastered ? 'text-emerald-950 line-through decoration-emerald-500' : 'text-slate-900'
                          }`}
                        >
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {item.difficulty}
                        </span>
                      </div>
                      {item.nameOriginal && (
                        <span className="text-[11px] text-slate-400 block italic">
                          {item.nameOriginal}
                        </span>
                      )}
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Key details */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.keyDetails.map((detail, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium"
                          >
                            • {detail}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Cerrar Currículum
          </button>
        </div>
      </div>
    </div>
  );
};
