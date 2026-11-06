import React from 'react';
import { Award, Shield, User as UserIcon } from 'lucide-react';
import { FighterStats, UserDomainModel } from '@/shared/domain/types';

interface FighterCardProps {
  user: UserDomainModel;
}

const STAT_LABELS: Record<keyof FighterStats, string> = {
  tecnica: 'Técnica',
  fuerza: 'Fuerza',
  elasticidad: 'Elasticidad',
  guardia: 'Guardia',
  pase: 'Pase',
  derribos: 'Derribos',
  leglocks: 'Leglocks',
  finalizacion: 'Finalización',
};

const DEFAULT_STATS: FighterStats = {
  tecnica: 65,
  fuerza: 60,
  elasticidad: 55,
  guardia: 70,
  pase: 65,
  derribos: 50,
  leglocks: 45,
  finalizacion: 60,
};

export const FighterCard: React.FC<FighterCardProps> = ({ user }) => {
  const stats = user.stats || DEFAULT_STATS;

  // Render visual de cinturón y grados
  const renderBeltBadge = () => {
    const beltColorMap: Record<string, { bg: string; text: string; bar: string }> = {
      WHITE: { bg: 'bg-white', text: 'text-studio-navy', bar: 'bg-black' },
      BLUE: { bg: 'bg-blue-600', text: 'text-white', bar: 'bg-black' },
      PURPLE: { bg: 'bg-purple-700', text: 'text-white', bar: 'bg-black' },
      BROWN: { bg: 'bg-amber-900', text: 'text-white', bar: 'bg-black' },
      BLACK: { bg: 'bg-neutral-900', text: 'text-white', bar: 'bg-studio-red' },
    };

    const config = beltColorMap[user.belt] || beltColorMap.WHITE;

    return (
      <div className="flex items-center gap-2">
        <div
          className={`h-6 px-3 rounded flex items-center font-bold text-xs uppercase tracking-wider shadow ${config.bg} ${config.text} border border-white/20`}
        >
          {user.belt}
          {/* Barra negra/roja con grados (stripes) */}
          <div className={`ml-2 h-4 w-12 ${config.bar} rounded-sm flex items-center justify-around px-1`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-3 rounded-full ${
                  i < user.stripes ? 'bg-white shadow' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-studio-navy-light/90 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      {/* Encabezado del Perfil */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-5">
        <div className="relative">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.alias}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-studio-cream/30 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-studio-navy border-2 border-studio-cream/30 flex items-center justify-center text-studio-cream">
              <UserIcon className="w-8 h-8 opacity-70" />
            </div>
          )}
          {user.pricingTier === 'SF' && (
            <span
              title="Socio Fundador"
              className="absolute -top-2 -right-2 bg-studio-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow"
            >
              SF
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-white truncate">{user.alias}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-semibold text-studio-cream">
              {user.beltSystem === 'KIDS' ? 'Categoría Infantil' : 'Categoría Adultos'}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {renderBeltBadge()}
            <span className="text-xs text-studio-cream/70">
              {user.stripes} {user.stripes === 1 ? 'grado' : 'grados'}
            </span>
          </div>
        </div>
      </div>

      {/* Ficha de Luchador: 8 Barras de Atributos */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-studio-red" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-studio-cream">
              Ficha Técnica del Atleta
            </h2>
          </div>
          <span className="text-xs text-studio-cream/60 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> 8 Atributos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(Object.keys(STAT_LABELS) as (keyof FighterStats)[]).map((key) => {
            const value = stats[key] ?? 50;
            return (
              <div key={key} className="bg-studio-navy/60 p-2.5 rounded-xl border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-studio-cream/90">{STAT_LABELS[key]}</span>
                  <span className="font-extrabold text-white">{value}%</span>
                </div>
                <div className="w-full bg-studio-navy h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-studio-navy-light via-studio-cream to-studio-red rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
