import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Scale,
  X,
} from 'lucide-react';
import {
  Gender,
  WeightOrganization,
  calculateWeightDivision,
} from '@/shared/domain/weightClasses';

interface WeightDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWeightKg?: number;
}

export const WeightDivisionModal: React.FC<WeightDivisionModalProps> = ({
  isOpen,
  onClose,
  defaultWeightKg = 73.5,
}) => {
  const [weightKg, setWeightKg] = useState<number>(defaultWeightKg);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [org, setOrg] = useState<WeightOrganization>('IBJJF_GI');
  const [gender, setGender] = useState<Gender>('MALE');
  const [wearingGi, setWearingGi] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentWeightInKg = unit === 'lbs' ? Math.round((weightKg / 2.20462) * 10) / 10 : weightKg;
  const result = calculateWeightDivision(currentWeightInKg, org, gender, wearingGi);

  const handleUnitToggle = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === unit) return;
    if (newUnit === 'lbs') {
      setWeightKg(Math.round(weightKg * 2.20462 * 10) / 10);
    } else {
      setWeightKg(Math.round((weightKg / 2.20462) * 10) / 10);
    }
    setUnit(newUnit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Calculadora de Categoría de Peso
              </h2>
              <p className="text-xs text-slate-400">IBJJF Gi, No-Gi y ADCC Oficial</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Selector de Organización */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reglamento de Competición
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'IBJJF_GI', label: 'IBJJF Gi (Con Kimono)' },
                { id: 'IBJJF_NOGI', label: 'IBJJF No-Gi' },
                { id: 'ADCC', label: 'ADCC Submission' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOrg(item.id as WeightOrganization)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border text-center ${
                    org === item.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Género y Unidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                División
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setGender('MALE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    gender === 'MALE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setGender('FEMALE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    gender === 'FEMALE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Femenino
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Unidad de Masa
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('kg')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    unit === 'kg' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Kilogramos (kg)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('lbs')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    unit === 'lbs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Libras (lbs)
                </button>
              </div>
            </div>
          </div>

          {/* Peso Actual */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tu Peso Actual ({unit.toUpperCase()})
              </label>
              <span className="text-xl font-black font-headline text-slate-900">
                {weightKg} {unit}
              </span>
            </div>

            <input
              type="range"
              min={unit === 'kg' ? 40 : 88}
              max={unit === 'kg' ? 120 : 265}
              step={0.5}
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            {org === 'IBJJF_GI' && (
              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-200/80">
                <input
                  type="checkbox"
                  checked={wearingGi}
                  onChange={(e) => setWearingGi(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Ya me estoy pesando con el kimono puesto (+2.2 kg incluidos)
                </span>
              </label>
            )}
          </div>

          {/* Resultado de la División */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-2 border-amber-300/80 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 inline-block mb-1">
                  Tu Categoría Oficial
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-headline uppercase tracking-tight">
                  {result.division.nameEs} ({result.division.name})
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-medium">Límite oficial</span>
                <span className="text-base font-black text-slate-800">
                  {result.isUnlimited ? 'Sin límite' : `${result.division.maxWeightKg} kg`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Peso proyectado en tatami:</span>
                <span className="font-bold text-slate-900">{result.actualWeightKg} kg</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Margen respecto al límite:</span>
                <span
                  className={`font-bold ${
                    result.weightDiffKg < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {result.isUnlimited
                    ? 'Libre'
                    : result.weightDiffKg >= 0
                    ? `+${result.weightDiffKg} kg de margen`
                    : `${result.weightDiffKg} kg (Sobrecargo)`}
                </span>
              </div>
            </div>

            {/* Consejo Médico / Kaizen */}
            <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs flex items-start gap-2 text-slate-700">
              {result.weightDiffKg < 0 ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{result.cutSafetyAdvice}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md"
          >
            Entendido, volver al tatami
          </button>
        </div>
      </div>
    </div>
  );
};
