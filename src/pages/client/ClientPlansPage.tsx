import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getFounderPrice } from '@/lib/pricing';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/KpiCard';

interface Plan {
  id: string;
  name: string;
  price_eur: number;
  promo_text: string | null;
  is_class_pack: boolean;
  pack_credits: number | null;
}

function PriceRow({ plan, isFounder }: { plan: Plan; isFounder: boolean }) {
  const basePrice = Number(plan.price_eur);
  const sfPrice = getFounderPrice(basePrice);
  return (
    <li className="group py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-3">
        <h3 className="font-headline text-xl sm:text-2xl uppercase text-white leading-tight group-hover:text-studio-cream transition-colors">
          {plan.name}
        </h3>
        <span className="studio-leader" aria-hidden />
        <p className="font-headline text-3xl sm:text-4xl leading-none tabular-nums text-studio-cream shrink-0">
          {isFounder && (
            <span className="text-base text-slate-500 line-through mr-2 align-middle">
              {basePrice.toFixed(0)} €
            </span>
          )}
          {isFounder ? sfPrice : basePrice.toFixed(0)}
          <span className="text-lg ml-1">€</span>
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>
          {plan.is_class_pack
            ? `${plan.pack_credits} ${plan.pack_credits === 1 ? 'clase' : 'clases'}, sin compromiso mensual`
            : 'al mes'}
        </span>
        {plan.promo_text && (
          <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-200">{plan.promo_text}</span>
        )}
      </div>
    </li>
  );
}

export function ClientPlansPage() {
  const { profile } = useAuth();
  const isFounder = Boolean(profile?.is_founder);
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_eur')
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const monthly = (plans ?? []).filter((p) => !p.is_class_pack);
  const packs = (plans ?? []).filter((p) => p.is_class_pack);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tarifas"
      />

      {isFounder && (
        <div className="studio-sand rounded-2xl px-5 py-4 flex items-center gap-3.5">
          <Award className="w-7 h-7 shrink-0 text-amber-700" />
          <p className="text-sm leading-snug">
            <strong className="font-headline uppercase text-base tracking-wide">Socio Fundador.</strong>{' '}
            Tu 10 % de descuento ya está aplicado en los precios de esta página.
          </p>
        </div>
      )}

      {plans === null ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full !rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay tarifas publicadas. Pregunta en recepción.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {monthly.length > 0 && (
            <section
              className={`rounded-3xl studio-panel border border-white/10 p-6 sm:p-8 ${
                packs.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'
              }`}
            >
              <h2 className="text-sm font-semibold text-slate-400 mb-5">Cuota mensual</h2>
              <ul className="divide-y divide-white/[0.07]">
                {monthly.map((pl) => (
                  <PriceRow key={pl.id} plan={pl} isFounder={isFounder} />
                ))}
              </ul>
            </section>
          )}
          {packs.length > 0 && (
            <section
              className={`rounded-3xl studio-panel border border-white/10 p-6 sm:p-8 ${
                monthly.length > 0 ? 'lg:col-span-2' : 'lg:col-span-5'
              }`}
            >
              <h2 className="text-sm font-semibold text-slate-400 mb-5">Bonos y clases sueltas</h2>
              <ul className="divide-y divide-white/[0.07]">
                {packs.map((pl) => (
                  <PriceRow key={pl.id} plan={pl} isFounder={isFounder} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
