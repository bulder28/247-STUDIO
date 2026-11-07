import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { Belt, beltLabelEs } from '@/widgets/Belt';

interface BeltRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBelt: string;
  stripes: number;
  totalClassesAttended: number;
}

export const BeltRoadmapModal: React.FC<BeltRoadmapModalProps> = ({
  isOpen,
  onClose,
  currentBelt = 'WHITE',
  stripes = 2,
  totalClassesAttended = 45,
}) => {
  if (!isOpen) return null;

  const beltsOrder = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
  const currentIndex = beltsOrder.indexOf(currentBelt.toUpperCase());

  // IBJJF guidance estimations
  const beltSteps = [
    {
      belt: 'WHITE',
      label: 'Cinturón Blanco',
      desc: 'Supervivencia, defensa personal y asimilación de caídas y marcos.',
      minClasses: '80 - 120 clases',
      timeframe: '1 a 2 años',
    },
    {
      belt: 'BLUE',
      label: 'Cinturón Azul',
      desc: 'Dominio de pases básicos, raspados y juego en guardia abierta.',
      minClasses: '150 - 200 clases',
      timeframe: '2 años mínimo (IBJJF)',
    },
    {
      belt: 'PURPLE',
      label: 'Cinturón Morado',
      desc: 'Desarrollo de estilo personal y fluidez en transiciones de ataque.',
      minClasses: '200+ clases',
      timeframe: '1.5 años mínimo (IBJJF)',
    },
    {
      belt: 'BROWN',
      label: 'Cinturón Marrón',
      desc: 'Refinamiento técnico, sumisiones avanzadas y liderazgo en tatami.',
      minClasses: '250+ clases',
      timeframe: '1 año mínimo (IBJJF)',
    },
    {
      belt: 'BLACK',
      label: 'Cinturón Negro (Faixa Preta)',
      desc: 'Maestría marcial, precisión y comprensión profunda del arte suave.',
      minClasses: '1.000+ clases',
      timeframe: '8 a 12 años de trayectoria',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Hoja de Ruta de Graduaciones BJJ
              </h2>
              <p className="text-xs text-amber-100">Criterios oficiales IBJJF & 247 STUDIO</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Belt belt={currentBelt as any} stripes={stripes} />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Tu Rango Actual
              </span>
              <h3 className="text-base font-bold text-white">
                {beltLabelEs(currentBelt as any)} • {stripes}º Grado
              </h3>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Clases Registradas</span>
            <span className="text-xl font-headline font-black text-amber-400">
              {totalClassesAttended} asistencias
            </span>
          </div>
        </div>

        {/* Belt Progression Timeline */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 py-2">
            {beltSteps.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.belt} className="relative pl-6 sm:pl-8 group">
                  {/* Dot icon */}
                  <div
                    className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      isPast
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse'
                        : 'bg-white border-slate-300 text-transparent'
                    }`}
                  >
                    {isPast && <CheckCircle2 className="w-3 h-3" />}
                    {isCurrent && <Sparkles className="w-3 h-3" />}
                  </div>

                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                        : isPast
                        ? 'bg-slate-50 border-slate-200/80 opacity-80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{step.label}</h4>
                        {isCurrent && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                            EN CURSO
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {step.timeframe}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{step.desc}</p>

                    <div className="text-[11px] font-medium text-slate-500">
                      Requisito medio: <span className="font-bold text-slate-800">{step.minClasses}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Cerrar Hoja de Ruta
          </button>
        </div>
      </div>
    </div>
  );
};
