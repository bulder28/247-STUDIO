import { useEffect, useState } from 'react';
import { Plus, Trash2, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getFounderPrice } from '@/lib/pricing';
import { PageHeader } from '@/components/PageHeader';

interface Discipline {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
  price_eur: number;
  is_class_pack: boolean;
  pack_credits: number | null;
  promo_text: string | null;
  is_active: boolean;
  plan_disciplines: { discipline_id: string }[];
}

export function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [promo, setPromo] = useState('');
  const [isClassPack, setIsClassPack] = useState(false);
  const [packCredits, setPackCredits] = useState('1');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const [plansRes, discRes] = await Promise.all([
      supabase.from('plans').select('*, plan_disciplines(discipline_id)').order('price_eur'),
      supabase.from('disciplines').select('id, name').order('sort_order'),
    ]);
    setPlans((plansRes.data as Plan[]) ?? []);
    setDisciplines((discRes.data as Discipline[]) ?? []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || selectedDisciplines.length === 0) return;

    setSaving(true);
    setFeedback(null);

    const { data: created, error } = await supabase
      .from('plans')
      .insert({
        name: name.trim(),
        price_eur: Number(price),
        promo_text: promo.trim() || null,
        is_class_pack: isClassPack,
        pack_credits: isClassPack ? Number(packCredits) : null,
      })
      .select('id')
      .single();

    if (!error && created) {
      await supabase.from('plan_disciplines').insert(
        selectedDisciplines.map((discipline_id) => ({
          plan_id: created.id,
          discipline_id,
        }))
      );

      if (notifyStudents) {
        await supabase.from('notices').insert({
          target_user_id: null,
          notice_type: 'tariff_change',
          title: 'Actualización de Tarifas',
          message: `Se ha añadido o actualizado la tarifa "${name.trim()}" (${price} €). Puedes consultarla en la pestaña Tarifas.`,
        });
      }

      setName('');
      setPrice('');
      setPromo('');
      setIsClassPack(false);
      setSelectedDisciplines([]);
      setFeedback('Tarifa guardada correctamente.');
      await loadData();
    } else {
      setFeedback('Error al guardar la tarifa (comprueba si el nombre ya existe).');
    }
    setSaving(false);
  };

  const toggleActive = async (plan: Plan) => {
    await supabase.from('plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    await loadData();
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      setFeedback('No se puede eliminar una tarifa que ya tiene alumnos asignados (desactívala mejor).');
    } else {
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifas"
        subtitle={<>Define las tarifas, ofertas y qué disciplinas incluye cada una (ej. BJJ + MMA o Pack Unlimited).</>}
      />

      {feedback && (
        <div className="rounded-xl bg-white/[0.04] border border-white/15 px-4 py-3 text-sm text-slate-200">
          {feedback}
        </div>
      )}

      {/* Formulario Nueva Tarifa */}
      <form
        onSubmit={handleCreatePlan}
        className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
      >
        <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-studio-red" />
          Nueva Tarifa / Programa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Nombre tarifa</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. BJJ & Grappling + MMA"
              required
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Precio (€)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="69"
              required
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
            {price && Number(price) > 0 && (
              <p className="text-[11px] text-amber-300 mt-1">
                Socio Fundador (SF -10%): {getFounderPrice(Number(price))} €
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Oferta (opcional)</label>
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Ej. Matrícula gratis este mes"
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 uppercase mb-2">
            Disciplinas incluidas en esta tarifa
          </label>
          <div className="flex flex-wrap gap-2">
            {disciplines.map((d) => {
              const active = selectedDisciplines.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiscipline(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'bg-studio-cream border-studio-cream text-slate-950'
                      : 'studio-panel-inset border-white/10 text-slate-300 hover:border-white/30'
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isClassPack}
                onChange={(e) => setIsClassPack(e.target.checked)}
                className="rounded"
              />
              Es Bono de Clases Sueltas
            </label>
            {isClassPack && (
              <input
                type="number"
                min={1}
                value={packCredits}
                onChange={(e) => setPackCredits(e.target.value)}
                className="w-20 rounded-lg studio-field px-2 py-1 text-xs text-white"
                placeholder="Clases"
              />
            )}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyStudents}
                onChange={(e) => setNotifyStudents(e.target.checked)}
                className="rounded"
              />
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              Notificar cambio a los alumnos
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || selectedDisciplines.length === 0}
            className="rounded-xl studio-btn disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {saving ? 'Guardando...' : 'Guardar Tarifa'}
          </button>
        </div>
      </form>

      {/* Listado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const discNames = plan.plan_disciplines
            .map((pd) => disciplines.find((d) => d.id === pd.discipline_id)?.name)
            .filter(Boolean);

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 ${
                plan.is_active
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-studio-navy/40 border-white/5 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-headline text-xl text-white uppercase">{plan.name}</h3>
                    {plan.promo_text && (
                      <p className="text-xs text-amber-300 mt-0.5">{plan.promo_text}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline text-2xl text-studio-red">
                      {Number(plan.price_eur).toFixed(0)} €
                    </span>
                    <p className="text-[11px] text-amber-300 font-semibold">
                      SF: {getFounderPrice(Number(plan.price_eur))} €
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {discNames.map((dn) => (
                    <span
                      key={dn}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300"
                    >
                      {dn}
                    </span>
                  ))}
                  {plan.is_class_pack && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                      Bono ({plan.pack_credits} clases)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                <button
                  onClick={() => toggleActive(plan)}
                  className="text-slate-300 hover:text-white underline-offset-2 hover:underline"
                >
                  {plan.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

