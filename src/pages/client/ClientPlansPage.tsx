import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Plan {
  id: string;
  name: string;
  price_eur: number;
  promo_text: string | null;
  is_class_pack: boolean;
  pack_credits: number | null;
}

export function ClientPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_eur')
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Tarifas y Programas
        </h1>
        <p className="text-sm text-slate-400">
          Información oficial de cuotas y ofertas vigentes en 247 STUDIO.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((pl) => (
          <div
            key={pl.id}
            className="rounded-2xl bg-studio-navy border border-white/10 p-5 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-headline text-xl uppercase text-white">{pl.name}</h2>
              {pl.promo_text && (
                <p className="mt-1 inline-block text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                  {pl.promo_text}
                </p>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-between">
              <span className="text-xs text-slate-400">
                {pl.is_class_pack ? `Bono ${pl.pack_credits} clases` : 'Cuota mensual'}
              </span>
              <span className="font-headline text-3xl text-studio-red">
                {Number(pl.price_eur).toFixed(0)} €
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

