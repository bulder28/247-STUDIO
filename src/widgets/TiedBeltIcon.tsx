import React from 'react';

export type TiedBeltRank = 'PROFESOR' | 'BLACK' | 'BROWN' | 'PURPLE' | 'BLUE' | 'WHITE' | 'KIDS';

interface TiedBeltIconProps {
  rank: TiedBeltRank;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const TiedBeltIcon: React.FC<TiedBeltIconProps> = ({
  rank,
  className = 'w-24 h-12',
  width,
  height,
}) => {
  let bodyColor = '#FFFFFF';
  let strokeColor = '#334155';
  let barColor = '#18181B';
  let isProfessor = false;

  switch (rank) {
    case 'PROFESOR':
      bodyColor = '#18181B';
      strokeColor = '#09090B';
      barColor = '#DC2626';
      isProfessor = true;
      break;
    case 'BLACK':
      bodyColor = '#18181B';
      strokeColor = '#09090B';
      barColor = '#DC2626';
      break;
    case 'BROWN':
      bodyColor = '#78350F';
      strokeColor = '#451A03';
      barColor = '#18181B';
      break;
    case 'PURPLE':
      bodyColor = '#8B5CF6';
      strokeColor = '#4C1D95';
      barColor = '#18181B';
      break;
    case 'BLUE':
      bodyColor = '#0284C7';
      strokeColor = '#0369A1';
      barColor = '#18181B';
      break;
    case 'KIDS':
      bodyColor = '#10B981';
      strokeColor = '#065F46';
      barColor = '#18181B';
      break;
    case 'WHITE':
    default:
      bodyColor = '#FFFFFF';
      strokeColor = '#475569';
      barColor = '#18181B';
      break;
  }

  return (
    <svg
      viewBox="0 0 120 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width, height }}
      aria-label={`Cinturón BJJ ${rank}`}
    >
      {/* 1. Tira superior izquierda (vuelta de cintura) */}
      <path
        d="M 12 11 Q 30 14, 53 17 L 52 23 Q 29 19, 11 17 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* 2. Tira superior derecha (vuelta de cintura) */}
      <path
        d="M 108 11 Q 90 14, 67 17 L 68 23 Q 91 19, 109 17 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* 3. Punta inferior derecha (cae hacia la derecha) */}
      <path
        d="M 66 21 L 105 37 L 108 30 L 73 16 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* 4. Punta inferior izquierda (cae hacia la izquierda y lleva la tarja) */}
      <path
        d="M 54 21 L 15 37 L 12 30 L 47 16 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Tarja de rango (Rank Bar) en la punta izquierda */}
      <path
        d="M 21 34.5 L 33 29 L 30 23.5 L 18 29 Z"
        fill={barColor}
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Ribetes blancos de profesor en los extremos de la tarja roja */}
      {isProfessor && (
        <>
          <path
            d="M 19 35.5 L 22 34 L 19 28.5 L 16 30 Z"
            fill="#FFFFFF"
            stroke="#09090B"
            strokeWidth="1"
          />
          <path
            d="M 32 29.5 L 35 28 L 32 22.5 L 29 24 Z"
            fill="#FFFFFF"
            stroke="#09090B"
            strokeWidth="1"
          />
        </>
      )}

      {/* 5. Nudo Central (BJJ Knot) */}
      {/* Base/vuelta posterior del nudo */}
      <path
        d="M 52 14 C 52 11, 68 11, 68 14 L 68 27 C 68 30, 52 30, 52 27 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Envoltura frontal del nudo */}
      <path
        d="M 48 16 Q 60 14, 72 16 Q 73 24, 71 27 Q 60 29, 49 27 Q 47 24, 48 16 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Pliegue interno del nudo para profundidad */}
      <path
        d="M 58 16 Q 61 21, 59 27"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

