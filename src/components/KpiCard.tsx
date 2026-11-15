import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export type KpiAccent = 'emerald' | 'amber' | 'sky' | 'red' | 'purple';

const ACCENTS: Record<
  KpiAccent,
  { bar: string; icon: string; iconBg: string; stroke: string; fill: string }
> = {
  emerald: {
    bar: 'from-emerald-500 via-emerald-400/60',
    icon: 'text-emerald-300',
    iconBg: 'bg-emerald-500/10 ring-emerald-400/25',
    stroke: '#34D399',
    fill: 'rgba(52, 211, 153, 0.16)',
  },
  amber: {
    bar: 'from-amber-500 via-amber-400/60',
    icon: 'text-amber-300',
    iconBg: 'bg-amber-500/10 ring-amber-400/25',
    stroke: '#FBBF24',
    fill: 'rgba(251, 191, 36, 0.16)',
  },
  sky: {
    bar: 'from-sky-500 via-sky-400/60',
    icon: 'text-sky-300',
    iconBg: 'bg-sky-500/10 ring-sky-400/25',
    stroke: '#38BDF8',
    fill: 'rgba(56, 189, 248, 0.16)',
  },
  red: {
    bar: 'from-studio-red via-rose-500/60',
    icon: 'text-rose-300',
    iconBg: 'bg-studio-red/15 ring-studio-red/30',
    stroke: '#FB7185',
    fill: 'rgba(225, 29, 46, 0.18)',
  },
  purple: {
    bar: 'from-purple-500 via-purple-400/60',
    icon: 'text-purple-300',
    iconBg: 'bg-purple-500/10 ring-purple-400/25',
    stroke: '#C084FC',
    fill: 'rgba(192, 132, 252, 0.16)',
  },
};

/** Bloque gris animado para estados de carga. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block rounded-lg bg-white/[0.07] studio-shimmer ${className}`} />;
}

/**
 * Variación porcentual frente al periodo anterior.
 * `invert` para métricas donde subir es malo (p. ej. deuda).
 */
export function DeltaBadge({
  value,
  suffix = 'vs mes ant.',
  invert = false,
}: {
  value: number | null;
  suffix?: string;
  invert?: boolean;
}) {
  if (value === null) return null;
  const isFlat = value === 0;
  const isGood = invert ? value < 0 : value > 0;
  const tone = isFlat
    ? 'bg-white/10 text-slate-300'
    : isGood
      ? 'bg-emerald-500/15 text-emerald-300'
      : 'bg-studio-red/20 text-rose-300';
  const Icon = isFlat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap ${tone}`}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {value > 0 ? `+${value}%` : `${value}%`}
      {suffix && <span className="font-normal opacity-75">{suffix}</span>}
    </span>
  );
}

/** Mini gráfico de tendencia (sin ejes) para tarjetas KPI. */
export function Sparkline({
  values,
  accent = 'sky',
  className = '',
  label,
}: {
  values: number[];
  accent?: KpiAccent;
  className?: string;
  label?: string;
}) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 28;
  const pad = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const [lx, ly] = pts[pts.length - 1];
  const { stroke, fill } = ACCENTS[accent];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`w-full h-7 overflow-visible ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polygon points={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="2.4" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AnimatedKpiValue({ value }: { value: ReactNode }) {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : null;
  const match = raw ? raw.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/) : null;
  const numericStr = match?.[2] ?? '';
  const hasGrouping = numericStr.includes('.') && !numericStr.includes(',');
  const normalized = hasGrouping ? numericStr.replace(/\./g, '') : numericStr.replace(',', '.');
  const target = match ? Number(normalized) : NaN;
  const isAnimatable = Boolean(match && Number.isFinite(target));

  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(raw ?? '');

  useEffect(() => {
    if (!isAnimatable || !match) return;
    const prefix = match[1];
    const suffix = match[3];
    const decimals = !hasGrouping && numericStr.includes(',') ? (numericStr.split(',')[1]?.length ?? 0) : 0;

    const controls = animate(mv, target, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const rounded = decimals > 0 ? latest.toFixed(decimals) : String(Math.round(latest));
        const formatted =
          decimals > 0
            ? rounded.replace('.', ',')
            : hasGrouping
              ? Math.round(latest).toLocaleString('es-ES')
              : rounded;
        setDisplay(`${prefix}${formatted}${suffix}`);
      },
    });
    return () => controls.stop();
  }, [isAnimatable, target, raw]);

  return <>{isAnimatable ? display : value}</>;
}

/** Tarjeta KPI ejecutiva unificada (Resumen + Panel de KPIs). */
export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  valueClassName = 'text-white',
  delta,
  footnote,
  trend,
  trendLabel,
  loading = false,
  children,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  accent: KpiAccent;
  valueClassName?: string;
  delta?: ReactNode;
  footnote?: ReactNode;
  trend?: number[];
  trendLabel?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="group relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4 sm:p-5 flex flex-col gap-3 transition-colors duration-300 hover:border-white/20"
    >
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${a.bar} to-transparent`} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-slate-400">
          {label}
        </span>
        <span className={`grid place-items-center w-8 h-8 rounded-xl ring-1 ${a.iconBg}`}>
          <Icon className={`w-4 h-4 ${a.icon}`} />
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className={`font-headline text-3xl leading-none tabular-nums ${valueClassName}`}>
              <AnimatedKpiValue value={value} />
            </p>
            {delta}
          </div>
          {footnote && <p className="text-xs text-slate-400 leading-snug">{footnote}</p>}
          {children}
        </div>
      )}

      {trend && !loading && (
        <div className="mt-auto pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Sparkline values={trend} accent={accent} label={trendLabel} />
        </div>
      )}
    </motion.div>
  );
}
