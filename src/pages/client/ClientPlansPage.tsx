import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getFounderPrice } from '@/lib/pricing';

interface Plan {
  id: string;
  name: string;
  price_eur: number;
  promo_text: string | null;
  is_class_pack: boolean;
  pack_credits: number | null;
}

export function ClientPlansPage() {
  const { profile } = useAuth();
  const isFounder = Boolean(profile?.is_founder);
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
          Información oficial de cuotas y ofertas vigentes en 247 STUDIO (precios finales).
        </p>
        {isFounder && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2 text-xs text-amber-200">
            <Award className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Socio Fundador (SF) activo:</strong> disfrutas de un 10% de descuento en tu cuota.
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((pl) => {
          const basePrice = Number(pl.price_eur);
          const sfPrice = getFounderPrice(basePrice);

          return (
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
                {isFounder ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-500 line-through">
                      {basePrice.toFixed(0)} €
                    </span>
                    <span className="font-headline text-3xl text-amber-300">
                      {sfPrice} €
                    </span>
                  </div>
                ) : (
                  <span className="font-headline text-3xl text-studio-red">
                    {basePrice.toFixed(0)} €
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

