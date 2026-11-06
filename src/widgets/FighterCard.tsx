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
    <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-slate-900">
      {/* Cinturón físico */}
      <Belt belt={user.belt} stripes={user.stripes} showEmpty strip className="h-14" />

      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                <UserIcon className="h-7 w-7" aria-hidden="true" />
              </div>
            )}
            {user.pricingTier === 'SF' && (
              <span
                title="Socio Fundador"
                className="absolute -right-2 -top-2 rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm"
              >
                SF
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-headline truncate text-3xl uppercase tracking-tight text-slate-900">{user.alias}</h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600">
              Cinturón {beltLabelEs(user.belt).toLowerCase()}, {stripesLabel}
              <span className="text-slate-400">
                {' '}
                · {user.beltSystem === 'KIDS' ? 'categoría infantil' : 'adultos'}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="font-bold text-base text-slate-900 mb-4">Ficha técnica del atleta</h3>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
            {(Object.keys(STAT_LABELS) as (keyof FighterStats)[]).map((key) => {
              const value = Math.min(100, Math.max(0, stats[key] ?? 50));
              return (
                <div key={key} className="border-b border-slate-100 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-xs font-semibold text-slate-600">{STAT_LABELS[key]}</dt>
                    <dd className="font-mono text-sm font-bold text-slate-900">{value}</dd>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
                    role="meter"
                    aria-label={STAT_LABELS[key]}
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: `${value}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
};