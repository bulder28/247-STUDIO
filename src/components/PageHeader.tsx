import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** Colores reales de cinturón BJJ (adultos + kids). */
const BELTS: Record<string, { band: string; tip: string; stripe: string }> = {
  blanco: { band: '#E9E5D6', tip: '#12141B', stripe: '#FFFFFF' },
  gris: { band: '#9CA3AF', tip: '#12141B', stripe: '#FFFFFF' },
  amarillo: { band: '#EAB308', tip: '#12141B', stripe: '#FFFFFF' },
  naranja: { band: '#EA7317', tip: '#12141B', stripe: '#FFFFFF' },
  verde: { band: '#15803D', tip: '#12141B', stripe: '#FFFFFF' },
  azul: { band: '#1E4FD8', tip: '#12141B', stripe: '#FFFFFF' },
  morado: { band: '#6D28D9', tip: '#12141B', stripe: '#FFFFFF' },
  marrón: { band: '#6B3F1D', tip: '#12141B', stripe: '#FFFFFF' },
  negro: { band: '#2A2E3A', tip: '#E11D2E', stripe: '#FFFFFF' },
};

/**
 * Cinturón tejido con punta y grados. Es el divisor firma de la app:
 * muestra el color y los grados reales del usuario conectado.
 */
export function BeltRule({
  belt,
  stripes = 0,
  className = '',
}: {
  belt?: string | null;
  stripes?: number;
  className?: string;
}) {
  const key = (belt ?? 'negro').toLowerCase();
  const c = BELTS[key] ?? BELTS.blanco;
  const n = Math.min(4, Math.max(0, stripes));
  return (
    <div
      className={`belt-rule relative h-3 w-full flex rounded-[3px] overflow-hidden shadow-[0_6px_14px_-6px_rgba(0,0,0,0.9)] ring-1 ring-white/20 ${className}`}
      role="img"
      aria-label={`Cinturón ${belt ?? 'negro'}${n > 0 ? `, ${n} ${n === 1 ? 'grado' : 'grados'}` : ''}`}
    >
      <span className="flex-1 belt-weave" style={{ backgroundColor: c.band }} />
      <span
        className="w-20 sm:w-28 flex items-stretch justify-end gap-[5px] px-2.5 belt-weave"
        style={{ backgroundColor: c.tip }}
      >
        {Array.from({ length: n }).map((_, i) => (
          <span
            key={i}
            className="belt-rule-stripe w-[5px]"
            style={{ backgroundColor: c.stripe, animationDelay: `${0.75 + i * 0.09}s` }}
          />
        ))}
      </span>
      <span className="w-5 sm:w-7 belt-weave" style={{ backgroundColor: c.band }} />
    </div>
  );
}

/** Cabecera de página: título condensado en arena + cinturón del usuario. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const { profile } = useAuth();
  const belt = profile?.belt ?? (profile?.role === 'client' ? 'Blanco' : 'Negro');

  return (
    <header className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="studio-display">
            <span className="title-mask">
              <span>{title}</span>
            </span>
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
      <BeltRule belt={belt} stripes={profile?.belt_stripes ?? 0} />
      {children}
    </header>
  );
}
