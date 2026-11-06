import React, { useState } from 'react';
import { BarChart3, Radar, Shield, Sparkles, User as UserIcon } from 'lucide-react';
import { FighterStats, UserDomainModel } from '@/shared/domain/types';

interface FighterCardProps {
  user: UserDomainModel;
}

const STAT_CONFIG: { key: keyof FighterStats; label: string; desc: string }[] = [
  { key: 'tecnica', label: 'Técnica', desc: 'Precisión y fluidez en drills' },
  { key: 'fuerza', label: 'Fuerza', desc: 'Potencia isométrica e intensidad' },
  { key: 'elasticidad', label: 'Elasticidad', desc: 'Rango articular y movilidad' },
  { key: 'guardia', label: 'Guardia', desc: 'Retención y ataques desde abajo' },
  { key: 'pase', label: 'Pase', desc: 'Presión y velocidad de sobrepaso' },
  { key: 'derribos', label: 'Derribos', desc: 'Judo y lucha olímpica de pie' },
  { key: 'leglocks', label: 'Leglocks', desc: 'Talón, kneebar y ataques de pierna' },
  { key: 'finalizacion', label: 'Finalización', desc: 'Efectividad en sumisiones cerradas' },
];

const DEFAULT_STATS: FighterStats = {
  tecnica: 70,
  fuerza: 65,
  elasticidad: 60,
  guardia: 75,
  pase: 68,
  derribos: 55,
  leglocks: 50,
  finalizacion: 65,
};

export const FighterCard: React.FC<FighterCardProps> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'radar' | 'bars'>('radar');
  const stats = user.stats || DEFAULT_STATS;

  // Cálculo del OVR (Overall Rating del Luchador)
  const statValues = Object.values(stats);
  const ovr = Math.round(
    statValues.reduce((acc, val) => acc + val, 0) / statValues.length
  );

  // Arquetipo de lucha basado en sus mejores atributos
  const getFighterArchetype = () => {
    if (stats.leglocks >= 75) return 'LEG LOCK SPECIALIST';
    if (stats.guardia >= 75) return 'APEX GUARD PLAYER';
    if (stats.pase >= 75) return 'HEAVY PRESSURE PASSER';
    if (stats.derribos >= 75) return 'TAKEDOWN WRESTLER';
    if (stats.finalizacion >= 75) return 'SUBMISSION HUNTER';
    if (ovr >= 80) return 'ELITE BLACK BELT PRO';
    return 'ALL-AROUND GRAPPLER';
  };

  // Render del cinturón realista de BJJ
  const renderRealisticBelt = () => {
    const beltTheme: Record<string, { bg: string; border: string; bar: string; text: string }> = {
      WHITE: { bg: 'bg-white', border: 'border-neutral-300', bar: 'bg-neutral-900', text: 'text-neutral-900' },
      BLUE: { bg: 'bg-blue-600', border: 'border-blue-400', bar: 'bg-neutral-900', text: 'text-white' },
      PURPLE: { bg: 'bg-purple-700', border: 'border-purple-400', bar: 'bg-neutral-900', text: 'text-white' },
      BROWN: { bg: 'bg-amber-950', border: 'border-amber-800', bar: 'bg-neutral-900', text: 'text-white' },
      BLACK: { bg: 'bg-neutral-950', border: 'border-neutral-700', bar: 'bg-studio-red', text: 'text-white' },
    };

    const theme = beltTheme[user.belt] || beltTheme.WHITE;

    return (
      <div className="flex items-center gap-2">
        <div
          className={`h-7 px-3 rounded-md flex items-center font-black text-xs uppercase tracking-widest shadow-lg ${theme.bg} ${theme.text} ${theme.border} border relative overflow-hidden`}
        >
          {/* Textura de costura doble horizontal típica de BJJ */}
          <div className="absolute inset-x-0 top-1 border-t border-black/15 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-1 border-b border-black/15 pointer-events-none" />

          <span>{user.belt}</span>

          {/* Manga negra (o roja en negra) con los grados bordados en blanco */}
          <div
            className={`ml-2.5 h-5 w-14 ${theme.bar} rounded-sm flex items-center justify-around px-1 shadow-inner border border-black/40`}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-3.5 rounded-sm transition-all ${
                  i < user.stripes
                    ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] border border-neutral-300'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <span className="text-[11px] font-bold text-studio-cream/80 bg-white/5 px-2 py-1 rounded-md border border-white/5">
          {user.stripes} {user.stripes === 1 ? 'grado' : 'grados'}
        </span>
      </div>
    );
  };

  // Coordenadas del gráfico de Radar SVG (Polígono octagonal)
  const size = 280;
  const center = size / 2;
  const radius = center - 45;
  const numAxes = STAT_CONFIG.length; // 8 atributos

  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Puntos del polígono de datos
  const polygonPoints = STAT_CONFIG.map((stat, i) => {
    const val = stats[stat.key] ?? 50;
    const { x, y } = getCoordinates(i, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-gradient-to-b from-[#111633] to-[#0c0f24] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Luz de fondo en gradiente rojo */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-studio-red/15 rounded-full blur-3xl pointer-events-none" />

      {/* Encabezado: Avatar, OVR Badge y Arquetipo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.alias}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-studio-red shadow-lg shadow-studio-red/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-studio-red/30 to-[#0c0f24] border-2 border-studio-red/60 flex items-center justify-center text-white shadow-lg">
                <UserIcon className="w-8 h-8 text-studio-cream" />
              </div>
            )}
            {user.pricingTier === 'SF' && (
              <span
                title="Socio Fundador"
                className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider"
              >
                SF
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-wide">{user.alias}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-studio-red/15 border border-studio-red/30 text-studio-red font-black uppercase tracking-wider">
                {user.beltSystem === 'KIDS' ? 'KIDS' : 'PRO ADULT'}
              </span>
            </div>

            <div className="mt-2">{renderRealisticBelt()}</div>
          </div>
        </div>

        {/* Emblema OVR (Overall Rating estilo EA Sports / UFC) */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-studio-cream/60 block uppercase tracking-wider">
              Nivel Global
            </span>
            <span className="text-[11px] font-black text-studio-red flex items-center justify-end gap-1 uppercase">
              <Sparkles className="w-3 h-3" />
              {getFighterArchetype()}
            </span>
          </div>

          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-studio-red to-studio-red-dark flex flex-col items-center justify-center text-white shadow-lg shadow-studio-red/30 border border-white/20">
            <span className="text-xl font-black leading-none">{ovr}</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/80">OVR</span>
          </div>
        </div>
      </div>

      {/* Selector de Vista: Radar Octagonal vs Desglose de Barras */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-studio-red" />
          <h2 className="text-xs font-black uppercase tracking-wider text-studio-cream">
            Ficha Técnica de 8 Atributos
          </h2>
        </div>

        <div className="flex bg-[#0a0c1d] border border-white/10 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('radar')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'radar'
                ? 'bg-studio-red text-white shadow'
                : 'text-studio-cream/60 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Radar Octagonal</span>
          </button>
          <button
            onClick={() => setViewMode('bars')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'bars'
                ? 'bg-studio-red text-white shadow'
                : 'text-studio-cream/60 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Barras</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: RADAR OCTAGONAL SVG INTERACTIVO */}
      {viewMode === 'radar' ? (
        <div className="mt-4 flex flex-col items-center justify-center p-2">
          <svg width={size} height={size} className="overflow-visible">
            {/* Anillos concéntricos octagonales (25%, 50%, 75%, 100%) */}
            {[25, 50, 75, 100].map((step) => {
              const ringPoints = STAT_CONFIG.map((_, i) => {
                const { x, y } = getCoordinates(i, step);
                return `${x},${y}`;
              }).join(' ');

              return (
                <polygon
                  key={step}
                  points={ringPoints}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                  strokeDasharray={step === 100 ? 'none' : '3,3'}
                />
              );
            })}

            {/* Ejes radiales (8 líneas desde el centro hacia cada atributo) */}
            {STAT_CONFIG.map((_, i) => {
              const { x, y } = getCoordinates(i, 100);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Polígono de datos del luchador con gradiente rojo neon */}
            <defs>
              <linearGradient id="fighterRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E60000" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8A0000" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <polygon
              points={polygonPoints}
              fill="url(#fighterRadarGradient)"
              stroke="#E60000"
              strokeWidth="2.5"
              className="drop-shadow-[0_0_12px_rgba(230,0,0,0.5)] transition-all duration-700"
            />

            {/* Puntos y etiquetas en los vértices */}
            {STAT_CONFIG.map((stat, i) => {
              const val = stats[stat.key] ?? 50;
              const { x, y } = getCoordinates(i, val);
              const labelCoord = getCoordinates(i, 118);

              return (
                <g key={stat.key}>
                  {/* Punto en el valor */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#FFFFFF"
                    stroke="#E60000"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all shadow"
                  />

                  {/* Etiqueta del atributo */}
                  <text
                    x={labelCoord.x}
                    y={labelCoord.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#D8D2B8"
                    fontSize="9.5"
                    fontWeight="800"
                    className="uppercase tracking-wider select-none font-mono"
                  >
                    {stat.label} ({val})
                  </text>
                </g>
              );
            })}
          </svg>

          <span className="text-[11px] text-studio-cream/50 mt-3 font-mono">
            Gráfico de atributos técnicos · Datos actualizados por el cuerpo técnico de 247Studio
          </span>
        </div>
      ) : (
        /* VISTA 2: DESGLOSE DE BARRAS TÉCNICAS */
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {STAT_CONFIG.map(({ key, label, desc }) => {
            const value = stats[key] ?? 50;
            return (
              <div
                key={key}
                className="bg-[#0c0f24] p-3 rounded-2xl border border-white/5 hover:border-white/15 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="font-extrabold text-xs text-white uppercase tracking-wider block">
                      {label}
                    </span>
                    <span className="text-[10px] text-studio-cream/50">{desc}</span>
                  </div>
                  <span className="font-black text-sm text-studio-red font-mono">{value}%</span>
                </div>

                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-studio-cream/40 via-studio-red to-studio-red-dark rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(230,0,0,0.6)]"
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
