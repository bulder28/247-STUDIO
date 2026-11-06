import React, { useMemo } from 'react';
import { FighterStats } from '@/shared/domain/types';

interface FighterRadarChartProps {
  stats: FighterStats;
  alias?: string;
  size?: number;
  showOvrBadge?: boolean;
  className?: string;
}

interface StatItem {
  key: keyof FighterStats;
  label: string;
  shortLabel: string;
}

const STAT_CONFIG: StatItem[] = [
  { key: 'guardia', label: 'Guardia', shortLabel: 'GUA' },
  { key: 'pase', label: 'Pase de Guardia', shortLabel: 'PAS' },
  { key: 'finalizacion', label: 'Finalización', shortLabel: 'FIN' },
  { key: 'leglocks', label: 'Leglocks / Llaves', shortLabel: 'LEG' },
  { key: 'derribos', label: 'Derribos / Judo', shortLabel: 'DER' },
  { key: 'fuerza', label: 'Fuerza / Potencia', shortLabel: 'FUE' },
  { key: 'elasticidad', label: 'Movilidad / Gas', shortLabel: 'MOV' },
  { key: 'tecnica', label: 'Técnica Pura', shortLabel: 'TEC' },
];

export const FighterRadarChart: React.FC<FighterRadarChartProps> = ({
  stats,
  alias,
  size = 320,
  showOvrBadge = true,
  className = '',
}) => {
  const center = size / 2;
  const radius = size * 0.36; // espacio para etiquetas en bordes

  // 1. Cálculo de Media OVR estilo FIFA
  const ovr = useMemo(() => {
    const values = STAT_CONFIG.map((s) => Math.min(100, Math.max(0, stats[s.key] ?? 50)));
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    return Math.round(avg);
  }, [stats]);

  // Nivel de carta FIFA
  const cardTier = useMemo(() => {
    if (ovr >= 85) return { title: 'ELITE TATAMI', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' };
    if (ovr >= 70) return { title: 'COMPETITOR', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30' };
    return { title: 'STUDIO FIGHTER', color: 'text-slate-700', bg: 'bg-slate-200/50 border-slate-300' };
  }, [ovr]);

  // 2. Coordenadas de los 8 radios (ángulos equidistantes)
  const angleStep = (2 * Math.PI) / STAT_CONFIG.length;
  const getCoordinates = (value: number, index: number, maxRadius = radius) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Coordenadas de polígonos concéntricos (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    const points = STAT_CONFIG.map((_, i) => {
      const { x, y } = getCoordinates(level, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return { level, points };
  });

  // Coordenadas del polígono del atleta
  const playerPoints = STAT_CONFIG.map((s, i) => {
    const val = Math.min(100, Math.max(0, stats[s.key] ?? 50));
    const { x, y } = getCoordinates(val, i);
    return { x, y, val, config: s };
  });

  const playerPolygonString = playerPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Insignia OVR FIFA arriba */}
      {showOvrBadge && (
        <div className="flex items-center justify-between w-full max-w-[340px] px-2 mb-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-slate-900 tracking-tight">{ovr}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OVR MEDIA</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${cardTier.bg} ${cardTier.color}`}>
            {cardTier.title}
          </span>
        </div>
      )}

      {/* SVG Radar */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[340px] h-auto drop-shadow-sm"
        aria-label={`Radar de habilidades FIFA de ${alias || 'Atleta'}: OVR ${ovr}`}
      >
        <defs>
          {/* Degradado rojo/oscuro estilo 247Studio */}
          <radialGradient id="fighterRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E11D2E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1A1D2E" stopOpacity="0.15" />
          </radialGradient>
          <filter id="radarShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#E11D2E" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Círculo base de fondo */}
        <circle cx={center} cy={center} r={radius} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />

        {/* Polígonos concéntricos de la red */}
        {gridPolygons.map((g) => (
          <polygon
            key={g.level}
            points={g.points}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={g.level === 100 ? 1.5 : 0.8}
            strokeDasharray={g.level === 100 ? 'none' : '2,3'}
            opacity={g.level === 100 ? 0.9 : 0.6}
          />
        ))}

        {/* Ejes radiales (Spokes) */}
        {STAT_CONFIG.map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {/* Polígono de Atributos del Atleta */}
        <polygon
          points={playerPolygonString}
          fill="url(#fighterRadarGlow)"
          stroke="#E11D2E"
          strokeWidth="2.5"
          strokeLinejoin="round"
          filter="url(#radarShadow)"
        />

        {/* Vértices / Puntos y Etiquetas */}
        {playerPoints.map((p, i) => {
          // Posición de la etiqueta ligeramente más allá del 100% del radio
          const labelDist = radius + 22;
          const angle = -Math.PI / 2 + i * angleStep;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);

          // Alineación del texto según cuadrante
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <g key={p.config.key}>
              {/* Punto en el polígono */}
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#FFFFFF"
                stroke="#E11D2E"
                strokeWidth="2.5"
                className="transition-transform duration-200 hover:scale-125"
              />

              {/* Etiqueta + Valor */}
              <text
                x={lx}
                y={ly}
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[10px] font-sans select-none"
              >
                <tspan className="font-extrabold text-slate-800 tracking-tight">
                  {p.config.shortLabel}
                </tspan>{' '}
                <tspan className="font-mono font-black text-brand-accent">
                  {p.val}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Leyenda rápida inferior estilo EA FC */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-[340px] mt-3 pt-3 border-t border-slate-100 text-center">
        {STAT_CONFIG.map((s) => (
          <div key={s.key} className="bg-slate-50/80 rounded-lg py-1 px-1 border border-slate-100">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">
              {s.shortLabel}
            </span>
            <span className="block font-mono text-xs font-black text-slate-900">
              {Math.min(100, Math.max(0, stats[s.key] ?? 50))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

