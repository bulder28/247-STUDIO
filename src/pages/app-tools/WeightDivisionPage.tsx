import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Gender,
  WeightOrganization,
  calculateWeightDivision,
} from '@/shared/domain/weightClasses';

export const WeightDivisionPage: React.FC = () => {
  const navigate = useNavigate();
  const [weightKg, setWeightKg] = useState<number>(75.0);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [org, setOrg] = useState<WeightOrganization>('IBJJF_GI');
  const [gender, setGender] = useState<Gender>('MALE');

  const wearingGi = org === 'IBJJF_GI';
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
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] max-w-2xl mx-auto justify-between animate-in fade-in duration-200">
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
          <Scale className="w-4 h-4 text-brand-accent" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#09090B]">
            Calculadora de Peso IBJJF
          </h1>
        </div>
        <div className="text-[11px] font-mono text-zinc-400">Oficial</div>
      </div>

      {/* Controles de Configuración */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm shrink-0">
        {/* Toggle Género y Organización */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Género
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#F4F4F5] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setGender('MALE')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  gender === 'MALE' ? 'bg-white text-[#09090B] shadow-xs' : 'text-zinc-500'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setGender('FEMALE')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  gender === 'FEMALE' ? 'bg-white text-[#09090B] shadow-xs' : 'text-zinc-500'
                }`}
              >
                Femenino
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Modalidad
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#F4F4F5] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOrg('IBJJF_GI')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  org === 'IBJJF_GI' ? 'bg-white text-[#09090B] shadow-xs' : 'text-zinc-500'
                }`}
              >
                Con Kimono
              </button>
              <button
                type="button"
                onClick={() => setOrg('IBJJF_NOGI')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  org === 'IBJJF_NOGI' ? 'bg-white text-[#09090B] shadow-xs' : 'text-zinc-500'
                }`}
              >
                No-Gi / Grapp.
              </button>
            </div>
          </div>
        </div>

        {/* Input de Peso */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Peso en Báscula ({unit.toUpperCase()})
            </label>
            <div className="flex gap-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => handleUnitToggle('kg')}
                className={`px-2 py-0.5 rounded ${unit === 'kg' ? 'bg-[#09090B] text-white' : 'text-zinc-400'}`}
              >
                KG
              </button>
              <button
                type="button"
                onClick={() => handleUnitToggle('lbs')}
                className={`px-2 py-0.5 rounded ${unit === 'lbs' ? 'bg-[#09090B] text-white' : 'text-zinc-400'}`}
              >
                LBS
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
              className="w-full text-2xl font-black font-mono px-3.5 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl focus:outline-none focus:border-[#09090B] text-[#09090B]"
            />
          </div>
        </div>
      </div>

      {/* Tarjeta de Resultado Oficial */}
      <div className="flex-1 min-h-0 my-2 sm:my-3 bg-[#09090B] text-white rounded-3xl p-5 flex flex-col justify-center items-center shadow-lg text-center relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold block">
            {org === 'IBJJF_GI' ? 'Reglamento IBJJF GI (Con Kimono)' : 'Reglamento IBJJF No-Gi'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-black uppercase tracking-tight text-white">
            {result.division.nameEs}
          </h2>
          <p className="text-xs text-zinc-300 font-medium">
            Límite máximo permitido: <strong className="text-white font-mono">{result.division.maxWeightKg} kg</strong>
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-zinc-200">{result.cutSafetyAdvice}</span>
          </div>
        </div>
      </div>

      {/* Nota oficial */}
      <div className="p-3 bg-white border border-[#E4E4E7] rounded-xl text-[11px] text-zinc-500 text-center shrink-0">
        Pesaje oficial con kimono puesto y cinturón atado justo antes del primer combate.
      </div>
    </div>
  );
};
