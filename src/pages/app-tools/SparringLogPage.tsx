import React, { useState } from 'react';
import { Activity, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  SparringEntry,
  calculateCombatVolume,
} from '@/shared/domain/fightRecord';

export const SparringLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SparringEntry[]>(() => {
    try {
      const saved = localStorage.getItem('247_sparring_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'sample_1',
        dateStr: new Date().toISOString().split('T')[0],
        roundsCount: 5,
        minutesPerRound: 5,
        submissionsApplied: ['Palanca de Brazo (Armbar)'],
        submissionsConceded: ['Triángulo (Triangle Choke)'],
        intensityRpe: 8,
        partnersNotes: 'Rolls intensos con Carlos y David.',
        technicalReflection: 'Mantener codos más cerrados en la media guardia.',
      },
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [roundsCount, setRoundsCount] = useState(5);
  const [minutesPerRound, setMinutesPerRound] = useState(5);
  const [intensityRpe, setIntensityRpe] = useState(7);
  const [notes, setNotes] = useState('');

  const volume = calculateCombatVolume(entries);

  const handleSaveEntry = () => {
    const newEntry: SparringEntry = {
      id: `sp_${Date.now()}`,
      dateStr: new Date().toISOString().split('T')[0],
      roundsCount,
      minutesPerRound,
      submissionsApplied: [],
      submissionsConceded: [],
      intensityRpe,
      partnersNotes: notes.trim(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    try {
      localStorage.setItem('247_sparring_logs', JSON.stringify(updated));
    } catch {}
    setIsAdding(false);
    setNotes('');
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    try {
      localStorage.setItem('247_sparring_logs', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] max-w-3xl mx-auto justify-between animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7] shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#09090B] bg-white border border-[#E4E4E7] px-3 py-1.5 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-accent" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#09090B]">
            Diario de Sparring
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#09090B] text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancelar' : 'Nuevo'}</span>
        </button>
      </div>

      {/* Resumen de Volumen (Compacto) */}
      <div className="grid grid-cols-3 gap-2 my-2 shrink-0">
        <div className="p-3 bg-white border border-[#E4E4E7] rounded-2xl text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Sesiones
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-[#09090B]">{entries.length}</span>
        </div>
        <div className="p-3 bg-white border border-[#E4E4E7] rounded-2xl text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Asaltos
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-[#09090B]">{volume.totalRounds}</span>
        </div>
        <div className="p-3 bg-white border border-[#E4E4E7] rounded-2xl text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Minutos Tatami
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-brand-accent">{volume.totalMatMinutes}m</span>
        </div>
      </div>

      {/* Formulario Rápido si isAdding */}
      {isAdding ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 space-y-3 shadow-sm shrink-0 my-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#09090B]">Registrar Sesión</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Rounds</label>
              <input
                type="number"
                min="1"
                max="30"
                value={roundsCount}
                onChange={(e) => setRoundsCount(parseInt(e.target.value) || 1)}
                className="w-full text-center font-bold px-2 py-1.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Min / Round</label>
              <input
                type="number"
                min="1"
                max="20"
                value={minutesPerRound}
                onChange={(e) => setMinutesPerRound(parseInt(e.target.value) || 1)}
                className="w-full text-center font-bold px-2 py-1.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">RPE (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={intensityRpe}
                onChange={(e) => setIntensityRpe(parseInt(e.target.value) || 1)}
                className="w-full text-center font-bold px-2 py-1.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Notas / Sensaciones</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Rolls con Carlos, buen trabajo de paso de media guardia..."
              className="w-full px-3 py-1.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveEntry}
            className="w-full py-2 bg-brand-accent hover:bg-brand-accent-dark text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Guardar Sesión
          </button>
        </div>
      ) : null}

      {/* Lista de Sesiones */}
      <div className="flex-1 min-h-0 my-1 overflow-y-auto space-y-2 pr-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="p-3 bg-white border border-[#E4E4E7] rounded-2xl flex items-center justify-between gap-3 shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#09090B]">
                  {entry.roundsCount} rounds × {entry.minutesPerRound} min
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FFE4E6] text-[#9F1239] rounded-md font-bold">
                  RPE {entry.intensityRpe}/10
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{entry.partnersNotes || 'Sin notas adicionales'}</p>
              <span className="text-[9px] font-mono text-zinc-400 mt-1 block">{entry.dateStr}</span>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(entry.id)}
              className="p-1.5 text-zinc-300 hover:text-brand-accent transition"
              title="Eliminar registro"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Pie informativo */}
      <div className="p-2.5 bg-white border border-[#E4E4E7] rounded-xl text-[11px] text-zinc-500 text-center shrink-0">
        Registra cada asalto y acumula volumen real de combate en tu preparación.
      </div>
    </div>
  );
};
