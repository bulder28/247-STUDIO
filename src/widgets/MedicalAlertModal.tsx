import React from 'react';
import {
  HeartPulse,
  PhoneCall,
  X,
} from 'lucide-react';

interface MedicalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicalAlertModal: React.FC<MedicalAlertModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-red-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Protocolos de Emergencia & Primeros Auxilios
              </h2>
              <p className="text-xs text-red-100">Seguridad sagrada del tatami en 247 STUDIO</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-red-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Urgencias Rápidas */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block">
                Teléfono de Urgencias
              </span>
              <span className="text-lg font-black text-red-900">112 Emergencias Madrid</span>
              <p className="text-[11px] text-red-600 mt-0.5">
                Centro de Salud Pinto: C/ Manuel de Falla s/n
              </p>
            </div>
            <a
              href="tel:112"
              className="p-3 bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 transition"
            >
              <PhoneCall className="w-5 h-5" />
            </a>
          </div>

          {/* Protocolos específicos de BJJ */}
          <div className="space-y-3">
            {[
              {
                title: '🩸 Sangrado o Cortes en Tatami',
                action: 'Detener el combate al instante.',
                steps:
                  'El atleta debe abandonar la lona. Limpiar la herida con clorhexidina y vendar antes de volver. Desinfectar inmediatamente la lona con desinfectante de tatami.',
              },
              {
                title: '👂 Hematoma Auricular (Oreja de Coliflor)',
                action: 'Aplicar hielo y compresión.',
                steps:
                  'Hielo envuelto durante 15 min. No volver a rolar sin casquillo protector o drenaje aséptico por profesional médico en las primeras 24 horas.',
              },
              {
                title: '💥 Golpe en Cabeza o Mareo (Conmoción)',
                action: 'Retirada obligatoria del tatami.',
                steps:
                  'Prohibido continuar rolando esa sesión. Vigilar pupilas y orientación. Si hay náuseas o visión borrosa, acudir a urgencias.',
              },
              {
                title: '🦴 Hiperextensión / Luxación Articular',
                action: 'Inmovilización pasiva y frío.',
                steps:
                  'No manipular ni intentar recolocar la articulación a la fuerza. Reposo en posición neutra y evaluación médica.',
              },
            ].map((p, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                <div className="text-[11px] font-bold text-red-600">{p.action}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{p.steps}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
