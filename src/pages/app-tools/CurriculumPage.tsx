import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BJJ_CURRICULUM } from '@/shared/domain/curriculum';

export const CurriculumPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('247_mastered_techniques');
      return saved ? JSON.parse(saved) : ['esc_mount_upa', 'sub_armbar_guard'];
    } catch {
      return ['esc_mount_upa'];
    }
  });

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
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] max-w-3xl mx-auto justify-between animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900">
            Currículum BJJ & Drills
          </h1>
        </div>
        <div className="text-[11px] font-mono text-slate-400">{progressPercent}%</div>
      </div>

      {/* Barra de Progreso y Filtros */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-2.5 shadow-sm shrink-0 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Técnicas Asimiladas</span>
          <span className="font-mono font-bold text-blue-600">
            {masteredIds.length} / {BJJ_CURRICULUM.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Filtros por Pilares */}
        <div className="flex gap-1 overflow-x-auto pt-1 pb-0.5">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'ESCAPES', label: 'Escapes' },
            { id: 'PASSES', label: 'Pases' },
            { id: 'SWEEPS', label: 'Raspados' },
            { id: 'SUBMISSIONS', label: 'Sumisiones' },
            { id: 'TAKEDOWNS', label: 'Derribos' },
          ].map((pil) => (
            <button
              key={pil.id}
              type="button"
              onClick={() => setSelectedPillar(pil.id)}
              className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg shrink-0 border transition ${
                selectedPillar === pil.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {pil.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Técnicas del Currículum */}
      <div className="flex-1 min-h-0 my-2 overflow-y-auto space-y-2 pr-1">
        {filtered.map((tech) => {
          const isDone = masteredIds.includes(tech.id);
          return (
            <div
              key={tech.id}
              onClick={() => toggleMastered(tech.id)}
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                  : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300'
              }`}
            >
              <button type="button" className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{tech.name}</h4>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                    {tech.minBelt}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tech.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie informativo */}
      <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-500 text-center shrink-0">
        Pulsa sobre cada técnica para marcarla como asimilada y actualizar tu progreso formativo.
      </div>
    </div>
  );
};
