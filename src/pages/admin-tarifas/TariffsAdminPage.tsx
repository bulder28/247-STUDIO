import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Plus, X } from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { BillingType, PricingTier, TariffDomainModel } from '@/shared/domain/types';

export const TariffsAdminPage: React.FC = () => {
  const [tariffs, setTariffs] = useState<TariffDomainModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    programs: 'BJJ Fundamentals, No-Gi',
    tier: 'STD' as PricingTier,
    billingType: 'MONTHLY' as BillingType,
    priceEuros: 65,
    vatRate: 0.21,
  });

  const fetchTariffs = async () => {
    try {
      const snap = await getDocs(collection(db, 'tariffs'));
      const list: TariffDomainModel[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<TariffDomainModel, 'id'>) }));
      setTariffs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = `tariff_${form.tier.toLowerCase()}_${Date.now()}`;
      const priceCents = Math.round(Number(form.priceEuros) * 100);

      await setDoc(doc(db, 'tariffs', id), {
        name: form.name,
        programs: form.programs.split(',').map((p) => p.trim()),
        tier: form.tier,
        billingType: form.billingType,
        priceCents,
        vatRate: Number(form.vatRate),
        active: true,
      });

      setShowModal(false);
      await fetchTariffs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivateTariff = async (tariff: TariffDomainModel) => {
    if (!confirm('Las tarifas son inmutables para garantizar consistencia histórica. ¿Deseas desactivarla para nuevas contrataciones?')) {
      return;
    }
    try {
      await updateDoc(doc(db, 'tariffs', tariff.id), {
        active: false,
      });
      await fetchTariffs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Catálogo de Tarifas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión inmutable de cuotas mensuales, bonos PASS y descuentos de socio fundador.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="py-2.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nueva Tarifa
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tariffs.map((t) => {
            const vat = calculateVatBreakdown(t.priceCents, t.vatRate);
            return (
              <div
                key={t.id}
                className={`p-5 rounded-3xl border transition-all ${
                  t.active
                    ? 'bg-white border-slate-200/80 shadow-xl'
                    : 'bg-slate-50 border-slate-100 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      t.tier === 'SF'
                        ? 'bg-studio-red text-white'
                        : 'bg-white/10 text-slate-700'
                    }`}
                  >
                    {t.tier === 'SF' ? 'Socio Fundador' : t.tier}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {t.billingType}
                  </span>
                </div>

                <h3 className="font-black text-lg text-slate-900 mb-1">{t.name}</h3>
                <div className="text-2xl font-black text-white mb-2">
                  {(t.priceCents / 100).toFixed(2)} €
                  <span className="text-xs font-normal text-slate-400 ml-1">IVA Inc.</span>
                </div>

                <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5 text-slate-500 mb-4">
                  <div>Base: {(vat.baseCents / 100).toFixed(2)} €</div>
                  <div>IVA ({(t.vatRate * 100).toFixed(0)}%): {(vat.vatCents / 100).toFixed(2)} €</div>
                </div>

                <div className="text-xs text-slate-600 mb-4">
                  <span className="font-bold text-white block mb-1">Disciplinas incluidas:</span>
                  <div className="flex flex-wrap gap-1">
                    {t.programs?.map((prog: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-[10px]">
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">
                    {t.active ? 'Disponible' : 'Archivada'}
                  </span>
                  {t.active && (
                    <button
                      onClick={() => handleDeactivateTariff(t)}
                      className="text-xs font-bold text-studio-red hover:underline"
                    >
                      Desactivar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Tarifa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase text-slate-900">Nueva Tarifa Inmutable</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTariff} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Mensual Ilimitado BJJ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Segmento</label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                  >
                    <option value="STD">Estándar (STD)</option>
                    <option value="SF">Socio Fundador (SF)</option>
                    <option value="FAM">Familiar (FAM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Cobro</label>
                  <select
                    value={form.billingType}
                    onChange={(e) => setForm({ ...form, billingType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                  >
                    <option value="MONTHLY">Mensual (MONTHLY)</option>
                    <option value="PASS">Bono Sesiones (PASS)</option>
                    <option value="DROP_IN">Clase Suelta (DROP_IN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Precio Total (€ IVA Inc.)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.priceEuros}
                  onChange={(e) => setForm({ ...form, priceEuros: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Programas (Separados por coma)</label>
                <input
                  type="text"
                  value={form.programs}
                  onChange={(e) => setForm({ ...form, programs: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-bold text-xs uppercase"
                >
                  Crear Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
