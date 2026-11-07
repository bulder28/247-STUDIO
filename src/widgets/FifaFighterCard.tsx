import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserDomainModel } from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';

interface FifaFighterCardProps {
  athlete: UserDomainModel;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FifaFighterCard: React.FC<FifaFighterCardProps> = ({
  athlete,
  onClick,
  className = '',
  size = 'md',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const stats = athlete.stats || {
    tecnica: 70,
    fuerza: 65,
    elasticidad: 60,
    guardia: 75,
    pase: 70,
    derribos: 60,
    leglocks: 55,
    finalizacion: 70,
  };

  // 1. Cálculo de Media OVR FIFA
  const { ovr, cardTier } = useMemo(() => {
    const vals = [
      stats.tecnica ?? 65,
      stats.fuerza ?? 60,
      stats.elasticidad ?? 55,
      stats.guardia ?? 70,
      stats.pase ?? 65,
      stats.derribos ?? 55,
      stats.leglocks ?? 50,
      stats.finalizacion ?? 65,
    ];
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

    // Detección de edición de carta FIFA
    if (athlete.belt === 'BLACK' || athlete.pricingTier === 'SF') {
      return { ovr: avg, cardTier: 'ICON_BLACK' as const };
    }
    if (avg >= 75) {
      return { ovr: avg, cardTier: 'GOLD' as const };
    }
    if (avg >= 65) {
      return { ovr: avg, cardTier: 'SILVER' as const };
    }
    return { ovr: avg, cardTier: 'BRONZE' as const };
  }, [stats, athlete.belt, athlete.pricingTier]);

  // 2. Estilos según el tier de la carta (Gold, Icon Black, Silver, Bronze)
  const tierStyles = useMemo(() => {
    switch (cardTier) {
      case 'ICON_BLACK':
        return {
          cardBg: 'from-[#2D303E] via-[#1A1D2E] to-[#0D0F18]',
          border: 'border-[#E5C158]',
          strokeColor: '#E5C158',
          innerBorder: 'border-[#F3E29F]/40',
          textColor: 'text-[#F5E296]',
          numColor: 'text-[#FFFFFF]',
          statNumColor: 'text-[#FFFFFF]',
          statLabelColor: 'text-[#D4AF37]',
          divider: 'border-[#E5C158]/30',
          badgeBg: 'bg-[#D4AF37] text-slate-900',
          glow: 'shadow-[0_15px_35px_rgba(229,193,88,0.25)]',
          badgeText: 'TOTW / SF',
        };
      case 'GOLD':
        return {
          cardBg: 'from-[#F9EBB2] via-[#E2BE64] to-[#B38C32]',
          border: 'border-[#946F19]',
          strokeColor: '#946F19',
          innerBorder: 'border-[#FFF3C4]/60',
          textColor: 'text-[#3E2D07]',
          numColor: 'text-[#2D1F02]',
          statNumColor: 'text-[#2D1F02]',
          statLabelColor: 'text-[#4A370B]',
          divider: 'border-[#8C6713]/30',
          badgeBg: 'bg-[#3E2D07] text-[#F9EBB2]',
          glow: 'shadow-[0_15px_30px_rgba(179,140,50,0.3)]',
          badgeText: 'ORO RARO',
        };
      case 'SILVER':
        return {
          cardBg: 'from-[#F3F4F8] via-[#C9CBD5] to-[#979AA8]',
          border: 'border-[#767988]',
          strokeColor: '#767988',
          innerBorder: 'border-white/70',
          textColor: 'text-[#20222B]',
          numColor: 'text-[#181920]',
          statNumColor: 'text-[#181920]',
          statLabelColor: 'text-[#3B3E4D]',
          divider: 'border-[#767988]/30',
          badgeBg: 'bg-[#20222B] text-white',
          glow: 'shadow-[0_15px_25px_rgba(151,154,168,0.25)]',
          badgeText: 'PLATA',
        };
      case 'BRONZE':
      default:
        return {
          cardBg: 'from-[#E4C9B5] via-[#B88C6D] to-[#825537]',
          border: 'border-[#5A351D]',
          strokeColor: '#5A351D',
          innerBorder: 'border-[#F2DFD2]/50',
          textColor: 'text-[#2B1508]',
          numColor: 'text-[#1E0D03]',
          statNumColor: 'text-[#1E0D03]',
          statLabelColor: 'text-[#3C2010]',
          divider: 'border-[#5A351D]/30',
          badgeBg: 'bg-[#2B1508] text-[#E4C9B5]',
          glow: 'shadow-[0_15px_25px_rgba(130,85,55,0.25)]',
          badgeText: 'BRONCE',
        };
    }
  }, [cardTier]);

  // Posición/Modalidad deportiva
  const positionLabel = athlete.beltSystem === 'KIDS' ? 'KIDS' : athlete.belt === 'BLACK' ? 'PROF' : 'BJJ';

  // 6 Estadísticas clave FUT BJJ
  const coreStats = [
    { label: 'TEC', val: stats.tecnica },
    { label: 'GUA', val: stats.guardia },
    { label: 'PAS', val: stats.pase },
    { label: 'FIN', val: stats.finalizacion },
    { label: 'DER', val: stats.derribos },
    { label: 'FÍS', val: Math.round(((stats.fuerza || 60) + (stats.elasticidad || 60)) / 2) },
  ];

  // Tamaño dinámico del nombre para que jamás se corte ni use puntos suspensivos
  const nameFontSize = useMemo(() => {
    const len = athlete.alias.length;
    if (len > 22) return 'text-sm sm:text-base';
    if (len > 16) return 'text-base sm:text-lg';
    return 'text-lg sm:text-xl';
  }, [athlete.alias]);

  // Escala según tamaño
  const scaleClass = size === 'sm' ? 'w-[220px]' : size === 'lg' ? 'w-[320px]' : 'w-[270px]';

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Carta de luchador de ${athlete.alias}, ${beltLabelEs(athlete.belt)}, media OVR ${ovr}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -6, scale: 1.025 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative select-none cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-[32px] ${scaleClass} ${className}`}
    >
      {/* ======================================================== */}
      {/* SILUETA ESCUDO FIFA ULTIMATE TEAM (SVG MASK & BORDER)    */}
      {/* ======================================================== */}
      <div className={`relative w-full aspect-[1/1.58] ${tierStyles.glow} rounded-[32px]`}>
        <div
          className={`relative w-full h-full p-3 pb-6 rounded-[32px] bg-gradient-to-b ${tierStyles.cardBg} overflow-hidden flex flex-col justify-between`}
          style={{
            clipPath:
              'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)',
          }}
        >
          {/* Reflejo brillante holográfico / Foil sheen en hover */}
          {!shouldReduceMotion && (
            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </div>
          )}

          {/* Textura Láser / Diagonal Sheen estilo FIFA */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)',
            }}
          />

          {/* Marco interno fino */}
          <div
            className={`absolute inset-1.5 rounded-[28px] border ${tierStyles.innerBorder} pointer-events-none`}
            style={{
              clipPath:
                'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)',
            }}
          />

          {/* ======================================================== */}
          {/* PARTE SUPERIOR: OVR, POSICIÓN Y FOTO CENTRAL             */}
          {/* ======================================================== */}
          <div className="relative z-10 pt-2 px-2 flex justify-between items-start">
            {/* Bloque Izquierdo: OVR, Posición e Insignia Química/Estilo */}
            <div className="flex flex-col items-center">
              {/* Número OVR */}
              <span
                className={`font-mono text-4xl sm:text-5xl font-black tracking-tighter leading-none ${tierStyles.numColor} drop-shadow-sm`}
              >
                {ovr}
              </span>

              {/* Posición / Disciplina */}
              <span
                className={`text-xs font-black tracking-wider uppercase mt-0.5 ${tierStyles.textColor}`}
              >
                {positionLabel}
              </span>

              {/* Divisor sutil */}
              <div className={`w-6 h-0.5 my-1.5 border-b ${tierStyles.divider}`} />

              {/* Insignia Química / Estilo de Combate (Icono Cohete/Tatami FUT) */}
              <div
                className={`px-1.5 py-0.5 rounded-md border ${tierStyles.innerBorder} bg-black/20 text-[9px] font-black uppercase tracking-widest ${tierStyles.textColor} shadow-2xs mt-1`}
                title="Estilo de Combate Tatami"
              >
                {athlete.belt === 'BLACK' ? '★ PRO' : '⚡ BJJ'}
              </div>
            </div>

            {/* Foto del Atleta (Recorte Estilo FIFA FUT con fundido) */}
            <div className="relative flex-1 flex justify-center -mt-2 -mr-1">
              <div className="relative w-36 sm:w-40 h-36 sm:h-38 overflow-hidden flex items-end justify-center rounded-2xl">
                {athlete.photoUrl ? (
                  <img
                    src={athlete.photoUrl}
                    alt={athlete.alias}
                    className="w-full h-full object-cover object-top filter contrast-[1.05] drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
                  />
                ) : (
                  <div className="w-28 h-32 rounded-2xl bg-black/10 border border-black/10 flex items-center justify-center text-4xl">
                    🥋
                  </div>
                )}

                {/* Degradado inferior para fundir la foto con la tarjeta */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PARTE INFERIOR: NOMBRE, CINTURÓN Y 6 STATS FIFA          */}
          {/* ======================================================== */}
          <div className="relative z-10 px-2">
            {/* Nombre / Alias del Atleta (Sin cortes ni puntos suspensivos) */}
            <div className="text-center mb-1">
              <h3
                className={`font-headline ${nameFontSize} uppercase tracking-tight font-black leading-tight ${tierStyles.textColor} drop-shadow-sm px-1`}
              >
                {athlete.alias}
              </h3>

              {/* Cinturón Oficial BJJ miniaturizado */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-16">
                  <Belt
                    belt={athlete.belt}
                    stripes={athlete.stripes}
                    decorative
                    className="h-2.5 rounded shadow-2xs"
                  />
                </div>
                <span className={`text-[9px] font-extrabold uppercase ${tierStyles.statLabelColor}`}>
                  {beltLabelEs(athlete.belt)}
                </span>
              </div>
            </div>

            {/* Línea divisoria dorada */}
            <div className={`w-full h-px border-b ${tierStyles.divider} my-1.5`} />

            {/* Rejilla de 6 Estadísticas (FUT Style) */}
            <div className="grid grid-cols-6 gap-1 text-center py-1">
              {coreStats.map((st) => (
                <div key={st.label} className="flex flex-col items-center">
                  <span
                    className={`text-[9px] font-black tracking-tighter ${tierStyles.statLabelColor}`}
                  >
                    {st.label}
                  </span>
                  <span
                    className={`font-mono text-sm font-black leading-none mt-0.5 ${tierStyles.statNumColor}`}
                  >
                    {st.val}
                  </span>
                </div>
              ))}
            </div>

            {/* ======================================================== */}
            {/* INSIGNIAS OFICIALES FIFA FUT EN LA PUNTA INFERIOR        */}
            {/* Centradas en el eje medio para que JAMÁS se corten       */}
            {/* ======================================================== */}
            <div className="mt-2 flex items-center justify-center gap-2">
              {/* Bandera Nacional (España) */}
              <div
                className="w-4.5 h-3 rounded-xs overflow-hidden shadow-2xs border border-black/25 shrink-0"
                title="Madrid / España"
              >
                <div className="h-1 bg-[#AA151B]" />
                <div className="h-1 bg-[#F1BF00]" />
                <div className="h-1 bg-[#AA151B]" />
              </div>

              {/* Insignia Edición / Tarifa */}
              <span
                className={`px-2 py-0.5 rounded-full ${tierStyles.badgeBg} text-[8px] font-mono font-black tracking-wider shadow-2xs truncate max-w-[140px]`}
              >
                {athlete.pricingTier === 'SF' ? '★ SOCIO FUNDADOR' : tierStyles.badgeText}
              </span>

              {/* Escudo Club 247Studio */}
              <div
                className="w-4.5 h-4.5 rounded-full bg-slate-900 border border-[#D4AF37] flex items-center justify-center p-0.5 shadow-2xs shrink-0"
                title="247Studio Pinto"
              >
                <img src="/logo.webp" alt="247" className="w-3.5 h-3.5 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Borde perimetral vectorial SVG continuo para el bisel exacto */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full z-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="14,0 86,0 100,8 100,90 50,100 0,90 0,8"
            fill="none"
            stroke={tierStyles.strokeColor}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </motion.div>
  );
};
