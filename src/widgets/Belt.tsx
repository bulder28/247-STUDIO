import React from 'react';

const BODY: Record<string, string> = {
  WHITE: '#EFEBDD',
  GREY: '#8C909C',
  YELLOW: '#E8B923',
  ORANGE: '#E4731E',
  GREEN: '#2E8B57',
  BLUE: '#1F4FA6',
  PURPLE: '#6A2E9E',
  BROWN: '#5B3A24',
  BLACK: '#171A30',
};

export const BELT_NAMES_ES: Record<string, string> = {
  WHITE: 'Blanco',
  GREY: 'Gris',
  YELLOW: 'Amarillo',
  ORANGE: 'Naranja',
  GREEN: 'Verde',
  BLUE: 'Azul',
  PURPLE: 'Morado',
  BROWN: 'Marrón',
  BLACK: 'Negro',
};

/** "GREY_WHITE" -> base gris con franja central blanca. */
function parseBelt(belt: string) {
  const [base, tip] = belt.split('_');
  const key = base in BODY ? base : 'WHITE';
  return {
    key,
    body: BODY[key],
    center: tip === 'WHITE' ? '#EFEBDD' : tip === 'BLACK' ? '#0B0D1C' : null,
  };
}

export function beltLabelEs(belt: string): string {
  const { key } = parseBelt(belt);
  const [, tip] = belt.split('_');
  const name = BELT_NAMES_ES[key] ?? 'Blanco';
  if (tip === 'WHITE') return `${name} y blanco`;
  if (tip === 'BLACK') return `${name} y negro`;
  return name;
}

interface BeltProps {
  belt: string;
  stripes?: number;
  maxStripes?: number;
  /** Dibuja los grados que faltan como huecos tenues (progreso). */
  showEmpty?: boolean;
  decorative?: boolean;
  /** Recorta el cinturón a una franja de la altura que dé className (p. ej. h-14). */
  strip?: boolean;
  className?: string;
}

/**
 * Cinturón de BJJ visto de frente: cuerpo con costuras, barra de rango
 * (negra, o roja en el cinturón negro) y grados en cinta blanca.
 */
export const Belt: React.FC<BeltProps> = ({
  belt,
  stripes = 0,
  maxStripes = 4,
  showEmpty = false,
  decorative = false,
  strip = false,
  className = '',
}) => {
  const { key, body, center } = parseBelt(belt);
  const bar = key === 'BLACK' ? '#E60000' : '#0B0D1C';
  const edge = key === 'WHITE' ? '#11152E' : '#FFFFFF';
  const shown = Math.max(0, Math.min(maxStripes, stripes));

  return (
    <svg
      viewBox="0 0 320 56"
      preserveAspectRatio={strip ? 'xMaxYMid slice' : undefined}
      className={`block w-full ${strip ? '' : 'h-auto'} ${className}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={
        decorative
          ? undefined
          : `Cinturón ${beltLabelEs(belt).toLowerCase()}, ${shown} ${shown === 1 ? 'grado' : 'grados'}`
      }
    >
      <rect x="0" y="0" width="320" height="56" fill={body} />
      {center && <rect x="0" y="20" width="320" height="16" fill={center} />}
      {/* costuras */}
      {[9, 17, 39, 47].map((y) => (
        <rect key={y} x="0" y={y} width="320" height="1.2" fill={edge} opacity="0.16" />
      ))}
      {/* canto: el cinturón se lee como pieza entera sobre fondo oscuro */}
      <rect x="0.5" y="0.5" width="319" height="55" fill="none" stroke="#FFFFFF" strokeOpacity="0.3" />
      {/* barra de rango */}
      <rect x="226" y="0" width="58" height="56" fill={bar} />
      {Array.from({ length: maxStripes }).map((_, i) => {
        const filled = i < shown;
        if (!filled && !showEmpty) return null;
        return (
          <rect
            key={i}
            x={232 + i * 13}
            y="0"
            width="6"
            height="56"
            fill="#FFFFFF"
            opacity={filled ? 1 : 0.14}
          />
        );
      })}
    </svg>
  );
};

const LADDER = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'] as const;

/** Los cinco cinturones adultos colgados en fila. Sólo el primero está encendido. */
export const BeltLadder: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className} aria-hidden="true">
    <ul className="space-y-3">
      {LADDER.map((b, i) => (
        <li
          key={b}
          className="belt-enter flex items-center gap-4"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span
            className={`w-16 shrink-0 text-right text-sm font-semibold ${
              i === 0 ? 'text-white' : 'text-studio-cream/50'
            }`}
          >
            {BELT_NAMES_ES[b]}
          </span>
          <div className={`flex-1 ${i === 0 ? '' : 'opacity-60'}`}>
            <Belt belt={b} stripes={0} decorative />
          </div>
        </li>
      ))}
    </ul>
    <p className="mt-6 pl-20 text-sm text-studio-cream/80">
      Cinco cinturones. El primer paso es venir.
    </p>
  </div>
);
