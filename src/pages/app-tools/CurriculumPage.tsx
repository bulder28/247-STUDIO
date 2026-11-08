import React, { useState, useMemo } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, GitBranch, Sparkles, Trophy, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BJJ_CURRICULUM } from '@/shared/domain/curriculum';
import { SkillTreeGraph } from '@/widgets/SkillTreeGraph';
import { useAuth } from '@/app/providers/AuthProvider';
import { calculateFighterElo } from '@/shared/domain/eloCalculator';

export const CurriculumPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [viewMode, setViewMode] = useState<'TREE' | 'LIST'>('TREE');
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');

  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('247_mastered_techniques');
      return saved ? JSON.parse(saved) : ['esc_mount_upa', 'sub_armbar_guard', 'pass_knee_slice'];
    } catch {
      return ['esc_mount_upa', 'pass_knee_slice'];
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

  // Cálculo en tiempo real del ELO y Arquetipo del Atleta
  const eloResult = useMemo(() => {
    return calculateFighterElo(
      userData || { belt: 'WHITE', stripes: 1, alias: 'Guerrero 247' },
      masteredIds,
      (userData as any)?.totalClassesAttended || 24
    );
  }, [userData, masteredIds]);

  const filtered = BJJ_CURRICULUM.filter((t) => {
    if (selectedPillar === 'ALL') return true;
    return t.pillar === selectedPillar;
  });

  return (
    <div className="flex flex-col min-h-[calc(100dvh-120px)] max-w-4xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* 1. Cabecera de Navegación */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-red-500" />
          <h1 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
            Skill Tree & Currículum
          </h1>
        </div>

        {/* Selector de Vista: Árbol RPG vs Lista */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('TREE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'TREE'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Árbol RPG</span>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'LIST'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lista Drills</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjeta ELO Atleta & Arquetipo Marcial */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#16203a] to-[#0a0f1d] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-400/20 via-red-600/20 to-black border border-amber-500/40 flex flex-col items-center justify-center text-center shadow-lg shadow-amber-950/40">
                <span className="font-heading text-2xl sm:text-3xl font-black text-amber-300 leading-none">
                  {eloResult.ovr}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400/80 mt-0.5">
                  OVR ELO
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border border-white/20">
                <Trophy className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                  {eloResult.tierLabel}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {userData?.belt || 'WHITE'} · {userData?.stripes || 0}G
                </span>
              </div>

              <h2 className="font-heading text-lg sm:text-xl font-bold uppercase text-white tracking-tight">
                {eloResult.archetype}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                {eloResult.archetypeDesc}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
            <span className="text-xs font-bold text-gray-300">Maestría Técnica</span>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                {eloResult.totalMastered}
              </span>
              <span className="text-xs text-gray-400">/ {eloResult.totalCurriculum}</span>
              <span className="text-xs font-bold text-emerald-400/80">({eloResult.masteryPercentage}%)</span>
            </div>
            <div className="w-36 bg-black/50 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-red-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${eloResult.masteryPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contenido Principal: Árbol de Habilidades vs Lista */}
      {viewMode === 'TREE' ? (
        <SkillTreeGraph
          userBelt={userData?.belt}
          masteredIds={masteredIds}
          onToggleMastery={toggleMastered}
        />
      ) : (
        <div className="space-y-4">
          {/* Filtros por Pilares */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'Todos los Pilares' },
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
                className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 border transition-all ${
                  selectedPillar === pil.id
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30'
                    : 'bg-[#11192e] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                }`}
              >
                {pil.label}
              </button>
            ))}
          </div>

          {/* Lista de Técnicas */}
          <div className="space-y-2.5">
            {filtered.map((tech) => {
              const isDone = masteredIds.includes(tech.id);
              return (
                <div
                  key={tech.id}
                  onClick={() => toggleMastered(tech.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isDone
                      ? 'bg-gradient-to-r from-emerald-950/40 via-[#11192e] to-[#0a0f1d] border-emerald-500/50 shadow-md'
                      : 'bg-[#11192e] border-white/5 hover:border-white/20'
                  }`}
                >
                  <button type="button" className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{tech.name}</h4>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 shrink-0">
                        {tech.minBelt}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {tech.description}
                    </p>
                    {tech.keyDetails?.length > 0 && (
                      <div className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Clave: {tech.keyDetails[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pie Informativo */}
      <div className="mt-6 p-3 bg-black/40 border border-white/5 rounded-2xl text-xs text-gray-400 text-center flex items-center justify-center gap-2">
        <Award className="w-4 h-4 text-red-500" />
        <span>
          Cada técnica asimilada alimenta tu Fighter Card oficial y certifica tu progreso hacia el siguiente grado con Mario y David.
        </span>
      </div>
    </div>
  );
};
