import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { FighterStats, UserDomainModel } from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';

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
  const stripesLabel = `${user.stripes} ${user.stripes === 1 ? 'grado' : 'grados'}`;

  return (
    <section className="rounded-2xl bg-studio-navy-light overflow-hidden">
      {/* Cinturón: lo primero que ve el alumno */}
      <Belt belt={user.belt} stripes={user.stripes} showEmpty strip className="h-14" />

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-studio-navy text-studio-cream">
                <UserIcon className="h-7 w-7 opacity-70" aria-hidden="true" />
              </div>
            )}
            {user.pricingTier === 'SF' && (
              <span
                title="Socio Fundador"
                className="absolute -right-2 -top-2 rounded-full bg-studio-red px-1.5 py-0.5 text-[10px] font-black text-white"
              >
                SF
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-4xl text-white">{user.alias}</h1>
            <p className="mt-1.5 text-sm text-studio-cream">
              Cinturón {beltLabelEs(user.belt).toLowerCase()}, {stripesLabel}
              <span className="text-studio-cream/60">
                {' '}
                · {user.beltSystem === 'KIDS' ? 'categoría infantil' : 'adultos'}
              </span>
            </p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-2xl text-white">Ficha técnica</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {(Object.keys(STAT_LABELS) as (keyof FighterStats)[]).map((key) => {
            const value = Math.min(100, Math.max(0, stats[key] ?? 50));
            return (
              <div key={key} className="border-t border-white/15 py-3">
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm font-medium text-studio-cream">{STAT_LABELS[key]}</dt>
                  <dd className="font-display num text-2xl text-white">{value}</dd>
                </div>
                <div
                  className="mt-2 h-1 w-full bg-studio-navy"
                  role="meter"
                  aria-label={STAT_LABELS[key]}
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-studio-cream" style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
};
