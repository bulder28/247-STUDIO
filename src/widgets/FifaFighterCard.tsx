import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserDomainModel } from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';
import { calculateFighterElo } from '@/shared/domain/eloCalculator';

interface FifaFighterCardProps {
  athlete: UserDomainModel;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const FifaFighterCard: React.FC<FifaFighterCardProps> = ({
  athlete,
  onClick,
  className = '',
  size = 'sm',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [imageError, setImageError] = React.useState(false);

  // Cálculo de ELO y estadísticas ponderadas con el Skill Tree
  const eloResult = useMemo(() => {
    let savedMastered: string[] = [];
    try {
      const saved = localStorage.getItem('247_mastered_techniques');
      if (saved) savedMastered = JSON.parse(saved);
    } catch {
      // Ignorar fallo de almacenamiento
    }
    return calculateFighterElo(
      athlete,
      savedMastered,
      (athlete as unknown as { totalClassesAttended?: number }).totalClassesAttended || 24
    );
  }, [athlete]);

  const stats = athlete.stats || eloResult.stats;
  const ovr = eloResult.ovr;
  const cardTier = eloResult.tier;

  // Estilos según el tier de la carta (Gold, Icon Black, Silver, Bronze)
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
          glow: 'shadow-[0_8px_20px_rgba(229,193,88,0.22)]',
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
          glow: 'shadow-[0_8px_20px_rgba(179,140,50,0.25)]',
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
          glow: 'shadow-[0_8px_18px_rgba(151,154,168,0.2)]',
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
          glow: 'shadow-[0_8px_18px_rgba(130,85,55,0.2)]',
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

  // Escala compacta proporcional para que quepan todos los atributos sin recortarse
  const scaleClass =
    size === 'xs'
      ? 'w-[115px] sm:w-[125px]'
      : size === 'sm'
      ? 'w-[130px] min-[400px]:w-[142px] sm:w-[155px]'
      : size === 'lg'
      ? 'w-[200px] sm:w-[220px]'
      : 'w-[160px] sm:w-[175px]';

  const isCompact = size === 'xs' || size === 'sm';

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
      whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative select-none cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-[20px] ${scaleClass} ${className}`}
    >
      {/* Silueta Escudo FIFA Ultimate Team */}
      <div className={`relative w-full aspect-[1/1.56] ${tierStyles.glow} rounded-[20px]`}>
        <div
          className={`relative w-full h-full p-2 pb-2.5 rounded-[20px] bg-gradient-to-b ${tierStyles.cardBg} overflow-hidden flex flex-col justify-between`}
          style={{
            clipPath: 'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)',
          }}
        >
          {/* Reflejo brillante holográfico / Sheen en hover */}
          {!shouldReduceMotion && (
            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </div>
          )}

          {/* Textura Láser Diagonal */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.4) 8px, rgba(255,255,255,0.4) 16px)',
            }}
          />

          {/* Marco interno fino */}
          <div
            className={`absolute inset-0.5 rounded-[18px] border ${tierStyles.innerBorder} pointer-events-none`}
            style={{
              clipPath: 'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)',
            }}
          />

          {/* PARTE SUPERIOR: OVR, POSICIÓN Y FOTO CENTRAL */}
          <div className="relative z-10 pt-0.5 px-1 flex justify-between items-start gap-1">
            {/* Bloque OVR y Posición */}
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`font-mono text-2xl min-[400px]:text-3xl font-black tracking-tighter leading-none ${tierStyles.numColor} drop-shadow-sm`}
              >
                {ovr}
              </span>
              <span
                className={`text-[8px] min-[400px]:text-[9px] font-black tracking-wider uppercase mt-0.5 ${tierStyles.textColor}`}
              >
                {positionLabel}
              </span>
              <div className={`w-4 h-px my-0.5 border-b ${tierStyles.divider}`} />
              <div
                className={`px-1 py-0.2 rounded border ${tierStyles.innerBorder} bg-black/25 text-[7px] font-black uppercase tracking-wider ${tierStyles.textColor}`}
              >
                {athlete.belt === 'BLACK' ? '★ PRO' : '⚡ BJJ'}
              </div>
            </div>

            {/* Foto del Atleta / Avatar Marcial Fallback Robusto */}
            <div className="relative flex-1 flex justify-center items-end h-16 min-[400px]:h-18 overflow-hidden rounded-xl">
              {athlete.photoUrl && !imageError ? (
                <img
                  src={athlete.photoUrl}
                  alt={athlete.alias}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-top filter contrast-[1.05] drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                />
              ) : (
                <div className="w-12 min-[400px]:w-14 h-14 min-[400px]:h-16 rounded-xl bg-black/20 border border-black/10 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl min-[400px]:text-2xl filter drop-shadow">🥋</span>
                  <span className="text-[7px] font-black uppercase tracking-wider opacity-70 mt-0.5 font-mono">
                    {athlete.alias.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Degradado inferior para fundir el avatar */}
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* PARTE INFERIOR: NOMBRE, CINTURÓN, 6 STATS Y SELLOS */}
          <div className="relative z-10 px-1 mt-auto">
            {/* Nombre / Alias del Atleta */}
            <div className="text-center mb-0.5">
              <h3
                className={`font-black uppercase tracking-tight leading-tight ${tierStyles.textColor} drop-shadow-sm truncate ${
                  isCompact ? 'text-[10px] min-[400px]:text-[11px]' : 'text-xs'
                }`}
                title={athlete.alias}
              >
                {athlete.alias}
              </h3>

              {/* Cinturón Oficial BJJ miniaturizado */}
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <div className="w-10 min-[400px]:w-12">
                  <Belt
                    belt={athlete.belt}
                    stripes={athlete.stripes}
                    decorative
                    className="h-2 rounded shadow-2xs"
                  />
                </div>
                <span className={`text-[7.5px] font-extrabold uppercase ${tierStyles.statLabelColor}`}>
                  {beltLabelEs(athlete.belt)}
                </span>
                <span
                  className={`text-[6.5px] font-mono font-black uppercase tracking-wider px-1 py-0.2 rounded-full ${tierStyles.badgeBg} truncate max-w-[70px]`}
                  title={eloResult.archetype}
                >
                  {eloResult.archetype.split('/')[0].trim()}
                </span>
              </div>
            </div>

            {/* Divisor */}
            <div className={`w-full h-px border-b ${tierStyles.divider} my-0.5`} />

            {/* Rejilla de 6 Estadísticas (FUT Style) */}
            <div className="grid grid-cols-6 gap-0.5 text-center py-0.5">
              {coreStats.map((st) => (
                <div key={st.label} className="flex flex-col items-center">
                  <span
                    className={`text-[7px] min-[400px]:text-[7.5px] font-black tracking-tighter ${tierStyles.statLabelColor}`}
                  >
                    {st.label}
                  </span>
                  <span
                    className={`font-mono text-[10px] min-[400px]:text-[11px] font-black leading-none mt-0.5 ${tierStyles.statNumColor}`}
                  >
                    {st.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Insignias en la punta inferior */}
            <div className="mt-1 flex items-center justify-center gap-1.5 pb-0.5">
              {/* Bandera España */}
              <div
                className="w-3.5 h-2.5 rounded-2xs overflow-hidden shadow-2xs border border-black/25 shrink-0"
                title="Madrid / España"
              >
                <div className="h-0.8 bg-[#AA151B]" />
                <div className="h-0.9 bg-[#F1BF00]" />
                <div className="h-0.8 bg-[#AA151B]" />
              </div>

              {/* Insignia Edición / Tarifa */}
              <span
                className={`px-1.5 py-0.2 rounded-full ${tierStyles.badgeBg} text-[6.5px] min-[400px]:text-[7px] font-mono font-black tracking-wider shadow-2xs truncate max-w-[85px]`}
              >
                {athlete.pricingTier === 'SF' ? '★ FUNDADOR' : tierStyles.badgeText}
              </span>

              {/* Escudo Club 247Studio */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-[#D4AF37] flex items-center justify-center p-0.5 shadow-2xs shrink-0"
                title="247Studio Pinto"
              >
                <img src="/logo.webp" alt="247" className="w-2.5 h-2.5 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Borde perimetral vectorial SVG continuo */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full z-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="14,0 86,0 100,8 100,90 50,100 0,90 0,8"
            fill="none"
            stroke={tierStyles.strokeColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </motion.div>
  );
};
