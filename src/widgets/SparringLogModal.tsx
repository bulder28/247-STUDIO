import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Swords,
  X,
} from 'lucide-react';
import {
  SUBMISSION_OPTIONS,
  SparringEntry,
  calculateCombatVolume,
} from '@/shared/domain/fightRecord';

interface SparringLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SparringLogModal: React.FC<SparringLogModalProps> = ({
  isOpen,
  onClose,
}) => {
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
  const [selectedSubApplied, setSelectedSubApplied] = useState<string>('');
  const [selectedSubConceded, setSelectedSubConceded] = useState<string>('');
  const [subsAppliedList, setSubsAppliedList] = useState<string[]>([]);
  const [subsConcededList, setSubsConcededList] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const volume = calculateCombatVolume(entries);

  const handleSaveEntry = () => {
    const newEntry: SparringEntry = {
      id: `sp_${Date.now()}`,
      dateStr: new Date().toISOString().split('T')[0],
      roundsCount,
      minutesPerRound,
      submissionsApplied: subsAppliedList,
      submissionsConceded: subsConcededList,
      intensityRpe,
      technicalReflection: notes,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    try {
      localStorage.setItem('247_sparring_logs', JSON.stringify(updated));
    } catch {}

    setIsAdding(false);
    setSubsAppliedList([]);
    setSubsConcededList([]);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Diario de Sparring & Combate
              </h2>
              <p className="text-xs text-slate-400">Registro de rondas, tiempo de mat y finalizaciones</p>
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

        {/* Volume Stats Summary */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-center">
          <div className="p-2 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Rondas</span>
            <span className="text-xl font-headline font-black text-slate-900">{volume.totalRounds}</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Minutos de Tatami</span>
            <span className="text-xl font-headline font-black text-red-600">{volume.totalMatMinutes}m</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Finalizaciones</span>
            <span className="text-xl font-headline font-black text-amber-500">{volume.totalSubmissions}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!isAdding ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historial de Sesiones</h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Sparring de Hoy</span>
                </button>
              </div>

              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {entry.dateStr}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                          {entry.roundsCount} rondas × {entry.minutesPerRound}m
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                          RPE {entry.intensityRpe}/10
                        </span>
                      </div>
                    </div>

                    {/* Submissions */}
                    {entry.submissionsApplied.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <span className="text-emerald-700 font-bold">Conseguidas:</span>
                        {entry.submissionsApplied.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.submissionsConceded.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <span className="text-red-700 font-bold">A mejorar:</span>
                        {entry.submissionsConceded.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium"
                          >
                            Tap: {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.technicalReflection && (
                      <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200/60">
                        &quot;{entry.technicalReflection}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Registrar Nueva Sesión de Combate</h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Rondas Roladas</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={roundsCount}
                    onChange={(e) => setRoundsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Minutos / Ronda</label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={minutesPerRound}
                    onChange={(e) => setMinutesPerRound(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Intensidad RPE (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={intensityRpe}
                    onChange={(e) => setIntensityRpe(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Submissions Applied */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sumisiones Conseguidas</label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubApplied}
                    onChange={(e) => setSelectedSubApplied(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Selecciona técnica conseguida...</option>
                    {SUBMISSION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSubApplied && !subsAppliedList.includes(selectedSubApplied)) {
                        setSubsAppliedList([...subsAppliedList, selectedSubApplied]);
                        setSelectedSubApplied('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Añadir
                  </button>
                </div>
                {subsAppliedList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {subsAppliedList.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setSubsAppliedList(subsAppliedList.filter((_, i) => i !== idx))}
                          className="text-emerald-900 hover:text-black ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions Conceded */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Sumisiones Encajadas (Aprender y Corregir)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubConceded}
                    onChange={(e) => setSelectedSubConceded(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Selecciona técnica encajada...</option>
                    {SUBMISSION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSubConceded && !subsConcededList.includes(selectedSubConceded)) {
                        setSubsConcededList([...subsConcededList, selectedSubConceded]);
                        setSelectedSubConceded('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Añadir
                  </button>
                </div>
                {subsConcededList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {subsConcededList.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold flex items-center gap-1"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setSubsConcededList(subsConcededList.filter((_, i) => i !== idx))}
                          className="text-red-900 hover:text-black ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Reflexión Técnica / Qué mejorar
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Cuidar el brazo derecho en la entrada a guardia profunda..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEntry}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                >
                  Guardar Sesión
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Cerrar Diario
          </button>
        </div>
      </div>
    </div>
  );
};
