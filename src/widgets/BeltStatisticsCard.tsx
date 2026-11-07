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
      count: stats.profesorCount ?? 1,
    },
    {
      key: 'BLACK',
      rank: 'BLACK',
      label: 'Negro',
      count: stats.blackCount ?? 3,
    },
    {
      key: 'BROWN',
      rank: 'BROWN',
      label: 'Marrón',
      count: stats.brownCount ?? 3,
    },
    {
      key: 'PURPLE',
      rank: 'PURPLE',
      label: 'Morado',
      count: stats.purpleCount ?? 5,
    },
    {
      key: 'BLUE',
      rank: 'BLUE',
      label: 'Azul',
      count: stats.blueCount ?? 8,
    },
    {
      key: 'WHITE',
      rank: 'WHITE',
      label: 'Blanco',
      count: stats.whiteCount ?? 15,
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
            Ver todos ({stats.totalCount ?? 35})
          </button>
        )}
      </div>

      {/* Grid 3x2 idéntico a la imagen de referencia */}
      <div className="grid grid-cols-3 gap-y-8 gap-x-4 sm:gap-x-8">
        {items.map((item) => {
          const isSelected = activeFilter === item.key;
          return (
            <div
              key={item.key}
              onClick={() => handleItemClick(item.key)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer select-none group ${
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

