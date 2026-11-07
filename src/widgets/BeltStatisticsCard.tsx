import React from 'react';
import { TiedBeltIcon, TiedBeltRank } from './TiedBeltIcon';

export interface BeltStatsData {
  profesorCount?: number;
  blackCount?: number;
  brownCount?: number;
  purpleCount?: number;
  blueCount?: number;
  whiteCount?: number;
  kidsCount?: number;
  totalCount?: number;
}

interface BeltStatisticsCardProps {
  stats: BeltStatsData;
  activeFilter?: string;
  onSelectBelt?: (rank: string) => void;
  title?: string;
}

interface BeltItemConfig {
  key: string;
  rank: TiedBeltRank;
  label: string;
  count: number;
}

export const BeltStatisticsCard: React.FC<BeltStatisticsCardProps> = ({
  stats,
  activeFilter = 'ALL',
  onSelectBelt,
  title = 'Estadísticas de Cinturones',
}) => {
  const items: BeltItemConfig[] = [
    {
      key: 'PROFESOR',
      rank: 'PROFESOR',
      label: 'Profesor',
      count: stats.profesorCount ?? 0,
    },
    {
      key: 'BLACK',
      rank: 'BLACK',
      label: 'Negro',
      count: stats.blackCount ?? 0,
    },
    {
      key: 'BROWN',
      rank: 'BROWN',
      label: 'Marrón',
      count: stats.brownCount ?? 0,
    },
    {
      key: 'PURPLE',
      rank: 'PURPLE',
      label: 'Morado',
      count: stats.purpleCount ?? 0,
    },
    {
      key: 'BLUE',
      rank: 'BLUE',
      label: 'Azul',
      count: stats.blueCount ?? 0,
    },
    {
      key: 'WHITE',
      rank: 'WHITE',
      label: 'Blanco',
      count: stats.whiteCount ?? 0,
    },
  ];

  const handleItemClick = (key: string) => {
    if (!onSelectBelt) return;
    if (activeFilter === key) {
      onSelectBelt('ALL');
    } else {
      onSelectBelt(key);
    }
  };

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-subtle space-y-6">
      {/* Cabecera limpia estilo referencia */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          {title}
        </h2>
        {onSelectBelt && activeFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectBelt('ALL')}
            className="text-xs font-semibold text-brand-accent hover:underline cursor-pointer"
          >
            Ver todos ({stats.totalCount ?? items.reduce((acc, it) => acc + it.count, 0)})
          </button>
        )}
      </div>

      {/* Grid responsive 2 cols en mobile estrecho, 3 cols en pantallas mayores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 sm:gap-y-8 gap-x-4 sm:gap-x-8">
        {items.map((item) => {
          const isSelected = activeFilter === item.key;
          return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Filtrar por cinturón ${item.label}: ${item.count} alumnos`}
              onClick={() => handleItemClick(item.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(item.key);
                }
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 ${
                isSelected
                  ? 'bg-slate-50 ring-2 ring-slate-800 shadow-xs'
                  : 'hover:bg-slate-50/70'
              }`}
              title={`Filtrar por cinturón ${item.label}`}
            >
              {/* Ilustración Vectorial del Cinturón Anudado */}
              <div className="w-28 sm:w-32 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                <TiedBeltIcon rank={item.rank} className="w-full h-auto drop-shadow-xs" />
              </div>

              {/* Número de Alumnos (negrita oscura limpia) */}
              <div className="mt-2 text-base font-bold text-slate-800 tracking-tight">
                {item.count}
              </div>

              {/* Etiqueta del Cinturón (gris suave centrado) */}
              <div className="text-xs text-slate-500 font-normal mt-0.5 group-hover:text-slate-800 transition-colors">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

