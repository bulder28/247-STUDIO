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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
          {title}
        </h2>
        {onSelectBelt && activeFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectBelt('ALL')}
            className="text-xs font-bold text-studio-red hover:underline cursor-pointer"
          >
            Mostrar todos los atletas ({stats.totalCount ?? 35})
          </button>
        )}
      </div>

      {/* Grid de Cinturones Anudados */}
      <div className="grid grid-cols-3 gap-y-6 gap-x-3 sm:gap-x-6 sm:gap-y-7">
        {items.map((item) => {
          const isSelected = activeFilter === item.key;
          return (
            <div
              key={item.key}
              onClick={() => handleItemClick(item.key)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition cursor-pointer select-none group ${
                isSelected
                  ? 'bg-slate-50 ring-2 ring-slate-800 shadow-xs'
                  : 'hover:bg-slate-50/80'
              }`}
              title={`Filtrar por cinturón ${item.label}`}
            >
              {/* Ilustración Vectorial del Cinturón Anudado */}
              <div className="w-24 sm:w-28 h-11 flex items-center justify-center transition-transform group-hover:scale-105">
                <TiedBeltIcon rank={item.rank} className="w-full h-auto drop-shadow-xs" />
              </div>

              {/* Número de Alumnos */}
              <div className="mt-2 text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                {item.count}
              </div>

              {/* Etiqueta del Cinturón */}
              <div className="text-xs sm:text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

