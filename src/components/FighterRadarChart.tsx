import { useState } from 'react';

export interface RadarStatItem {
  key: string;
  label: string;
  value: number;
}

interface FighterRadarChartProps {
  items: RadarStatItem[];
}

const CX = 210;
const CY = 164;
const RADIUS = 92;
const RINGS = [25, 50, 75, 100];

function polarPoint(index: number, total: number, r: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  };
}

function pointsToString(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function FighterRadarChart({ items }: FighterRadarChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const count = items.length;
  const activeItem = items.find((item) => item.key === activeKey) ?? null;

  const dataPoints = items.map((item, idx) => {
    const clamped = Math.max(0, Math.min(100, item.value));
    return polarPoint(idx, count, (clamped / 100) * RADIUS);
  });

  const avgScore =
    count > 0 ? Math.round(items.reduce((sum, item) => sum + item.value, 0) / count) : 50;

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl studio-panel-inset border border-white/5 px-2 pt-3 pb-2 overflow-hidden">
        <div className="flex items-center justify-between px-3">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-slate-400">
              {activeItem ? activeItem.label : 'Media de combate'}
            </span>
            <p className="font-headline text-2xl text-white leading-none mt-0.5">
              {activeItem ? activeItem.value : avgScore}
              <span className="text-xs font-sans text-slate-400 ml-1">/100</span>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-studio-red/15 border border-studio-red/30 text-[11px] font-semibold text-red-200">
            8 Atributos BJJ
          </span>
        </div>

        <svg
          viewBox="0 0 420 328"
          role="img"
          aria-label="Gráfico radar de atributos del luchador"
          className="w-full h-auto max-w-[400px] mx-auto select-none"
        >
          <defs>
            <radialGradient id="fighterRadarFill" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#E11D2E" stopOpacity="0.52" />
              <stop offset="100%" stopColor="#E11D2E" stopOpacity="0.16" />
            </radialGradient>
            <filter id="fighterRadarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Anillos octogonales de referencia */}
          {RINGS.map((ring) => {
            const ringPts = items.map((_, idx) => polarPoint(idx, count, (ring / 100) * RADIUS));
            return (
              <polygon
                key={ring}
                points={pointsToString(ringPts)}
                fill="none"
                stroke={ring === 100 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)'}
                strokeWidth={ring === 100 ? 1.25 : 1}
                strokeDasharray={ring === 50 ? '3 3' : undefined}
              />
            );
          })}

          {/* Ejes radiales */}
          {items.map((item, idx) => {
            const outer = polarPoint(idx, count, RADIUS);
            const isActive = activeKey === item.key;
            return (
              <line
                key={item.key}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke={isActive ? 'rgba(225,29,46,0.65)' : 'rgba(255,255,255,0.09)'}
                strokeWidth={isActive ? 1.6 : 1}
              />
            );
          })}

          {/* Polígono principal del luchador */}
          <polygon
            points={pointsToString(dataPoints)}
            fill="url(#fighterRadarFill)"
            stroke="#E11D2E"
            strokeWidth={2.2}
            strokeLinejoin="round"
            filter="url(#fighterRadarGlow)"
          />

          {/* Vértices interactivos y etiquetas */}
          {items.map((item, idx) => {
            const pt = dataPoints[idx];
            const labelPt = polarPoint(idx, count, RADIUS + 20);
            const isActive = activeKey === item.key;
            const cosVal = Math.cos(-Math.PI / 2 + (idx * 2 * Math.PI) / count);
            const textAnchor =
              Math.abs(cosVal) < 0.2 ? 'middle' : cosVal > 0 ? 'start' : 'end';

            return (
              <g
                key={item.key}
                className="cursor-pointer"
                onMouseEnter={() => setActiveKey(item.key)}
                onMouseLeave={() => setActiveKey(null)}
                onClick={() => setActiveKey((prev) => (prev === item.key ? null : item.key))}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 6 : 4}
                  fill={isActive ? '#FFFFFF' : '#E11D2E'}
                  stroke={isActive ? '#E11D2E' : '#FFFFFF'}
                  strokeWidth={1.6}
                />
                <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
                <text
                  x={labelPt.x}
                  y={labelPt.y + 4}
                  textAnchor={textAnchor}
                  fontSize="11.5"
                  fontWeight={isActive ? '700' : '600'}
                  fill={isActive ? '#FFFFFF' : '#CBD5E1'}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chips numéricos táctiles debajo del radar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onMouseEnter={() => setActiveKey(item.key)}
              onMouseLeave={() => setActiveKey(null)}
              onClick={() => setActiveKey((prev) => (prev === item.key ? null : item.key))}
              className={`rounded-xl px-2.5 py-2 text-left border transition ${
                isActive
                  ? 'bg-studio-red/20 border-studio-red/60 text-white'
                  : 'studio-panel-inset border-white/5 text-slate-300 hover:border-white/15'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 truncate">
                {item.label}
              </span>
              <span className="font-headline text-base text-white">{item.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

