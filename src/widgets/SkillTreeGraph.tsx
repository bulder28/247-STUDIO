import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Hammer,
  Target,
  Swords,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  X,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { BJJ_CURRICULUM, CurriculumTechnique } from '@/shared/domain/curriculum';
import { Belt } from '@/shared/domain/types';
import { dojoAudio } from '@/shared/utils/audioEffects';

interface SkillTreeGraphProps {
  userBelt?: Belt;
  masteredIds: string[];
  onToggleMastery: (techId: string) => void;
  className?: string;
}

interface PillarMeta {
  id: CurriculumTechnique['pillar'];
  label: string;
  icon: React.ElementType;
  accentColor: string;
  badgeBg: string;
}

const PILLARS: PillarMeta[] = [
  {
    id: 'ESCAPES',
    label: 'Escapes & Defensa',
    icon: Shield,
    accentColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'SWEEPS',
    label: 'Raspados & Inversiones',
    icon: Zap,
    accentColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'PASSES',
    label: 'Pases de Guardia',
    icon: Hammer,
    accentColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'SUBMISSIONS',
    label: 'Sumisiones & Llaves',
    icon: Target,
    accentColor: 'text-red-400 border-red-500/40 bg-red-950/40',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  {
    id: 'TAKEDOWNS',
    label: 'Derribos & Lucha en Pie',
    icon: Swords,
    accentColor: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
];

const BELT_LEVELS: Partial<Record<Belt, number>> = {
  WHITE: 1,
  BLUE: 2,
  PURPLE: 3,
  BROWN: 4,
  BLACK: 5,
};

export const SkillTreeGraph: React.FC<SkillTreeGraphProps> = ({
  userBelt = 'WHITE',
  masteredIds,
  onToggleMastery,
  className = '',
}) => {
  const [selectedPillar, setSelectedPillar] = useState<CurriculumTechnique['pillar']>('ESCAPES');
  const [activeTechnique, setActiveTechnique] = useState<CurriculumTechnique | null>(null);

  const userLevel = BELT_LEVELS[userBelt] || 1;

  // Filtrar técnicas por pilar activo
  const techniquesInPillar = BJJ_CURRICULUM.filter((t) => t.pillar === selectedPillar);

  // Agrupar por nivel de dificultad
  const fundamentals = techniquesInPillar.filter((t) => t.difficulty === 'FUNDAMENTALS');
  const intermediates = techniquesInPillar.filter((t) => t.difficulty === 'INTERMEDIATE');
  const advanced = techniquesInPillar.filter((t) => t.difficulty === 'ADVANCED');

  const masteredSet = new Set(masteredIds);

  const handleNodeClick = (tech: CurriculumTechnique) => {
    setActiveTechnique(tech);
  };

  const handleToggle = (tech: CurriculumTechnique, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isNowDone = !masteredSet.has(tech.id);
    if (isNowDone) {
      dojoAudio.triggerHaptic('success');
      dojoAudio.playRoundBell();
    } else {
      dojoAudio.triggerHaptic('light');
    }
    onToggleMastery(tech.id);
  };

  const currentPillarMeta = PILLARS.find((p) => p.id === selectedPillar)!;

  const pillarMasteredCount = techniquesInPillar.filter((t) => masteredSet.has(t.id)).length;
  const pillarPercent =
    techniquesInPillar.length > 0
      ? Math.round((pillarMasteredCount / techniquesInPillar.length) * 100)
      : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Selector de Pilares Marciales */}
      <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-md">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const isSelected = selectedPillar === pillar.id;
          const count = BJJ_CURRICULUM.filter(
            (t) => t.pillar === pillar.id && masteredSet.has(t.id)
          ).length;
          const total = BJJ_CURRICULUM.filter((t) => t.pillar === pillar.id).length;

          return (
            <button
              key={pillar.id}
              onClick={() => setSelectedPillar(pillar.id)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-lg text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold tracking-tight text-center line-clamp-1">
                {pillar.label.split(' ')[0]}
              </span>
              <span className="text-[9px] font-mono opacity-70">
                {count}/{total}
              </span>
              {isSelected && (
                <motion.div
                  layoutId="pillar-indicator"
                  className="absolute -bottom-1 w-6 h-1 bg-red-600 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Barra de Maestría del Pilar */}
      <div className="bg-[#11192e] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${currentPillarMeta.accentColor}`}>
            <currentPillarMeta.icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <span>{currentPillarMeta.label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentPillarMeta.badgeBg}`}>
                {pillarPercent}% DOMINADO
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              {pillarMasteredCount} de {techniquesInPillar.length} técnicas asimiladas en este sendero
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Impulsa tu OVR</span>
        </div>
      </div>

      {/* 3. El Árbol de Habilidades (Niveles Conectados) */}
      <div className="space-y-6 relative py-2">
        {/* Nivel 1: Fundamentos */}
        {fundamentals.length > 0 && (
          <SkillTierGroup
            title="Nivel I: Fundamentos del Tatami"
            subtitle="Técnicas base de supervivencia y control"
            badge="Cinturón Blanco / Azul"
            techniques={fundamentals}
            masteredSet={masteredSet}
            onSelect={handleNodeClick}
            onToggle={handleToggle}
            userLevel={userLevel}
            tierLevel={1}
          />
        )}

        {/* Línea conectora entre niveles */}
        {intermediates.length > 0 && <ConnectorLine />}

        {/* Nivel 2: Intermedio */}
        {intermediates.length > 0 && (
          <SkillTierGroup
            title="Nivel II: Dinámica & Encadenamientos"
            subtitle="Transiciones ofensivas y control posicional"
            badge="Cinturón Azul / Morado"
            techniques={intermediates}
            masteredSet={masteredSet}
            onSelect={handleNodeClick}
            onToggle={handleToggle}
            userLevel={userLevel}
            tierLevel={2}
          />
        )}

        {/* Línea conectora entre niveles */}
        {advanced.length > 0 && <ConnectorLine />}

        {/* Nivel 3: Avanzado */}
        {advanced.length > 0 && (
          <SkillTierGroup
            title="Nivel III: Maestría & Ataques Asimétricos"
            subtitle="Llaves de alta palanca, leglocks y contras directas"
            badge="Cinturón Morado / Marrón / Negro"
            techniques={advanced}
            masteredSet={masteredSet}
            onSelect={handleNodeClick}
            onToggle={handleToggle}
            userLevel={userLevel}
            tierLevel={3}
          />
        )}
      </div>

      {/* 4. Modal / Drawer de Detalle Técnico con Claves del Coach Mario & David */}
      <AnimatePresence>
        {activeTechnique && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveTechnique(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#11192e] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveTechnique(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 uppercase">
                  {activeTechnique.pillar}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Min. {activeTechnique.minBelt}
                </span>
              </div>

              <h2 className="font-heading text-2xl font-bold uppercase text-white tracking-tight mb-1">
                {activeTechnique.name}
              </h2>

              {activeTechnique.nameOriginal && (
                <p className="text-xs font-mono text-amber-400 mb-4">
                  {activeTechnique.nameOriginal}
                </p>
              )}

              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {activeTechnique.description}
              </p>

              {/* Claves del Coach (Mario & David) */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <Flame className="w-4 h-4" />
                  <span>Claves de Ejecución (Dojo Tips):</span>
                </div>
                <ul className="space-y-2">
                  {activeTechnique.keyDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                      <ChevronRight className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón de Asimilación */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleToggle(activeTechnique);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                    masteredSet.has(activeTechnique.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {masteredSet.has(activeTechnique.id)
                      ? 'Técnica Asimilada (Desmarcar)'
                      : 'Marcar como Dominada (+ELO)'}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Grupo de Nivel en el Skill Tree
 */
const SkillTierGroup: React.FC<{
  title: string;
  subtitle: string;
  badge: string;
  techniques: CurriculumTechnique[];
  masteredSet: Set<string>;
  onSelect: (t: CurriculumTechnique) => void;
  onToggle: (t: CurriculumTechnique, e: React.MouseEvent) => void;
  userLevel: number;
  tierLevel: number;
}> = ({
  title,
  subtitle,
  badge,
  techniques,
  masteredSet,
  onSelect,
  onToggle,
  userLevel,
  tierLevel,
}) => {
  const isLockedForUser = userLevel < tierLevel;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <span>{title}</span>
            {isLockedForUser && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                <Lock className="w-2.5 h-2.5" /> Grado Avanzado
              </span>
            )}
          </h4>
          <p className="text-[10px] text-gray-400">{subtitle}</p>
        </div>
        <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">{badge}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {techniques.map((tech) => {
          const isMastered = masteredSet.has(tech.id);

          return (
            <motion.div
              key={tech.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(tech)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isMastered
                  ? 'bg-gradient-to-r from-emerald-950/40 via-[#11192e] to-[#0a0f1d] border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                  : 'bg-[#11192e] border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 pr-2">
                <button
                  type="button"
                  onClick={(e) => onToggle(tech, e)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isMastered
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:border-white/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                    {tech.name}
                  </h5>
                  <p className="text-[10px] text-gray-400 line-clamp-1">
                    {tech.nameOriginal || tech.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(tech);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const ConnectorLine: React.FC = () => (
  <div className="flex items-center justify-center py-1">
    <div className="w-0.5 h-6 bg-gradient-to-b from-white/20 to-white/5 rounded-full" />
  </div>
);
