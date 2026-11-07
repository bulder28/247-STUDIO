import React from 'react';
import { ArrowLeft, Award, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

export const BeltRoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const currentBelt = userData?.belt || 'WHITE';
  const stripes = userData?.stripes || 0;
  const totalClassesAttended = (userData as any)?.totalClassesAttended || 28;

  const beltsOrder = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
  const currentIndex = beltsOrder.indexOf(currentBelt.toUpperCase());

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
      desc: 'Maestría marcial, precisión sin esfuerzo y transmisión de valores.',
      minClasses: '1000+ clases',
      timeframe: '8 a 12 años de práctica continuada',
    },
  ];

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
          <Award className="w-4 h-4 text-purple-500" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900">
            Hoja de Ruta de Cinturón
          </h1>
        </div>
        <div className="text-[11px] font-mono text-slate-400 font-bold uppercase">{currentBelt}</div>
      </div>

      {/* Tarjeta de Graduación Actual del Alumno */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl flex items-center justify-between shadow-sm shrink-0 my-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-black">
            {stripes}G
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 block">
              Tu Grado Actual
            </span>
            <h3 className="text-sm sm:text-base font-black tracking-tight">
              {currentBelt} · {stripes} {stripes === 1 ? 'Raya' : 'Rayas'}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Asistencias
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
            {totalClassesAttended} clases
          </span>
        </div>
      </div>

      {/* Escalera de Cinturones IBJJF */}
      <div className="flex-1 min-h-0 my-1 overflow-y-auto space-y-2 pr-1">
        {beltSteps.map((step, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.belt}
              className={`p-3.5 rounded-2xl border transition ${
                isCurrent
                  ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/30 shadow-sm'
                  : isPassed
                  ? 'bg-emerald-50/40 border-emerald-200 opacity-90'
                  : 'bg-white border-slate-200/80 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{step.label}</h4>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{step.timeframe}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 mt-1 pl-6 leading-relaxed">{step.desc}</p>
              <div className="mt-1.5 pl-6 text-[10px] font-mono text-slate-400">
                Volumen estimado: <strong className="text-slate-700">{step.minClasses}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie informativo */}
      <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-500 text-center shrink-0">
        La graduación en 247Studio se otorga por asimilación técnica, respeto en el tatami y constancia.
      </div>
    </div>
  );
};

