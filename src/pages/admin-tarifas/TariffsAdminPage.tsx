import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Edit2,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { getLiveDocs } from '@/shared/api/liveReads';
import { calculateVatBreakdown } from '@/shared/domain/money';
import {
  BillingType,
  PricingTier,
  TariffDomainModel,
  UserDomainModel,
} from '@/shared/domain/types';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

export const DEFAULT_OFFICIAL_TARIFFS: Omit<TariffDomainModel, 'id'>[] = [
  {
    name: 'BJJ Adultos Ilimitado (Estándar)',
    programs: ['BJJ Gi', 'No-Gi Submission Grappling', 'Open Mat Fin de Semana'],
    tier: 'STD',
    billingType: 'MONTHLY',
    priceCents: 7500,
    vatRate: 0.21,
    active: true,
  },
  {
    name: 'Socios Fundadores (SF) & Fuerzas de Seguridad',
    programs: ['BJJ Gi', 'No-Gi Grappling', 'Open Mat', 'Carta FUT Icon Black'],
    tier: 'SF',
    billingType: 'MONTHLY',
    priceCents: 6000,
    vatRate: 0.21,
    active: true,
  },
  {
    name: 'Plan Familiar & Parejas (FAM)',
    programs: ['BJJ Gi Adultos / Kids', 'No-Gi', 'Acceso Familiar Compartido'],
    tier: 'FAM',
    billingType: 'MONTHLY',
    priceCents: 5500,
    vatRate: 0.21,
    active: true,
  },
  {
    name: 'Bono Tatami Pass 10 Clases',
    programs: ['BJJ Gi', 'No-Gi Grappling', 'Válido durante 4 meses'],
    tier: 'STD',
    billingType: 'PASS',
    priceCents: 11000,
    vatRate: 0.21,
    active: true,
  },
  {
    name: 'BJJ Kids & Teens (Infantil)',
    programs: ['BJJ Kids', 'Psicomotricidad & Autodisciplina'],
    tier: 'STD',
    billingType: 'MONTHLY',
    priceCents: 5000,
    vatRate: 0.21,
    active: true,
  },
  {
    name: 'Clase Suelta / Drop-In Tatami',
    programs: ['Sesión Única Tatami', 'Pase de Día'],
    tier: 'STD',
    billingType: 'DROP_IN',
    priceCents: 1500,
    vatRate: 0.21,
    active: true,
  },
];

export const TariffsAdminPage: React.FC = () => {
  const [tariffs, setTariffs] = useState<TariffDomainModel[]>([]);
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TariffDomainModel | null>(null);

  const [form, setForm] = useState({
    name: '',
    programs: 'BJJ Gi, No-Gi Grappling',
    tier: 'STD' as PricingTier,
    billingType: 'MONTHLY' as BillingType,
    priceEuros: 75,
    vatRate: 0.21,
    active: true,
  });

  const fetchTariffsAndUsers = async () => {
    try {
      const [tariffSnap, userSnap] = await Promise.all([
        getLiveDocs('tariffs', collection(db, 'tariffs')),
        getLiveDocs('users', collection(db, 'users')),
      ]);

      const tList: TariffDomainModel[] = [];
      tariffSnap.forEach((d) => tList.push({ id: d.id, ...(d.data() as Omit<TariffDomainModel, 'id'>) }));
      setTariffs(tList);

      const uList: UserDomainModel[] = [];
      userSnap.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      setUsers(uList);
    } catch (err) {
      console.error('Error fetching tariffs & users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffsAndUsers();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTariff(null);
    setForm({
      name: '',
      programs: 'BJJ Gi, No-Gi Grappling',
      tier: 'STD',
      billingType: 'MONTHLY',
      priceEuros: 75,
      vatRate: 0.21,
      active: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (t: TariffDomainModel) => {
    setEditingTariff(t);
    setForm({
      name: t.name,
      programs: (t.programs || []).join(', '),
      tier: t.tier,
      billingType: t.billingType,
      priceEuros: t.priceCents / 100,
      vatRate: t.vatRate || 0.21,
      active: t.active,
    });
    setShowModal(true);
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const priceCents = Math.round(Number(form.priceEuros) * 100);
      const programsArray = form.programs
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      if (editingTariff) {
        await updateDoc(doc(db, 'tariffs', editingTariff.id), {
          name: form.name,
          programs: programsArray,
          tier: form.tier,
          billingType: form.billingType,
          priceCents,
          vatRate: Number(form.vatRate),
          active: form.active,
        });
      } else {
        const id = `tariff_${form.tier.toLowerCase()}_${Date.now()}`;
        await setDoc(doc(db, 'tariffs', id), {
          name: form.name,
          programs: programsArray,
          tier: form.tier,
          billingType: form.billingType,
          priceCents,
          vatRate: Number(form.vatRate),
          active: true,
        });
      }

      setShowModal(false);
      await fetchTariffsAndUsers();
    } catch (err) {
      console.error('Error saving tariff:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActiveTariff = async (tariff: TariffDomainModel) => {
    try {
      await updateDoc(doc(db, 'tariffs', tariff.id), {
        active: !tariff.active,
      });
      await fetchTariffsAndUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadOfficialTemplate = () => {
    setShowRestoreModal(true);
  };

  const handleConfirmLoadOfficialTemplate = async () => {
    setActionLoading(true);
    try {
      for (const t of DEFAULT_OFFICIAL_TARIFFS) {
        const id = `tariff_${t.tier.toLowerCase()}_${t.billingType.toLowerCase()}_${t.priceCents}`;
        await setDoc(doc(db, 'tariffs', id), t);
      }
      setShowRestoreModal(false);
      await fetchTariffsAndUsers();
    } catch (err) {
      console.error('Error loading default tariffs:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // REA Analytics: Relación Alumnos - Cuotas - MRR
  const activeStudents = users.filter((u) => u.accountStatus === 'ACTIVE');

  const getSubscribersForTariff = (t: TariffDomainModel): number => {
    return activeStudents.filter((u) => {
      if (u.activeTariffId && u.activeTariffId === t.id) return true;
      if (t.billingType === 'MONTHLY' && u.pricingTier === t.tier) return true;
      return false;
    }).length;
  };

  const totalGymMrrCents = tariffs
    .filter((t) => t.active && t.billingType === 'MONTHLY')
    .reduce((acc, t) => acc + getSubscribersForTariff(t) * t.priceCents, 0);

  const activeTariffsCount = tariffs.filter((t) => t.active).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Catálogo de Tarifas & MRR
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Gestión de membresías, bonos Pass, precios con IVA 21% y suscripción activa de alumnos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadOfficialTemplate}
            disabled={actionLoading}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border border-slate-200/80 shadow-2xs cursor-pointer"
            title="Restablecer o cargar el catálogo de 6 tarifas estándar de 247Studio"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Cargar Tarifas 247Studio</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="py-2.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarifa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards REA: MRR & Suscripciones */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            MRR Estimado Recurrente
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {(totalGymMrrCents / 100).toFixed(2)} €
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
            Ingresos mensuales de atletas activos
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Atletas Activos en Censo
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeStudents.length}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Total alumnos con estado ACTIVE
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Tarifas Publicadas
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeTariffsCount} <span className="text-sm font-normal text-slate-400">/ {tariffs.length}</span>
          </div>
          <span className="text-[11px] text-blue-700 font-semibold block mt-1">
            Disponibles para nuevas contrataciones
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            ARPU (Ticket Medio)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeStudents.length > 0
              ? (totalGymMrrCents / (activeStudents.length * 100)).toFixed(2)
              : '70.00'}{' '}
            €
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Ingreso medio mensual por atleta
          </span>
        </div>
      </div>

      {/* Grid de Tarifas */}
      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tariffs.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-3">
          <p className="text-slate-600 font-bold text-sm">
            No hay tarifas registradas en la base de datos de 247Studio.
          </p>
          <button
            type="button"
            onClick={handleLoadOfficialTemplate}
            className="px-4 py-2 bg-studio-red hover:bg-studio-red-dark text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            ⚡ Cargar Tarifas Oficiales 247Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tariffs.map((t) => {
            const vat = calculateVatBreakdown(t.priceCents, t.vatRate || 0.21);
            const subscribers = getSubscribersForTariff(t);
            const mrrContribution = (subscribers * t.priceCents) / 100;

            return (
              <div
                key={t.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  t.active
                    ? 'bg-white border-slate-200/80 shadow-md hover:border-slate-300'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.tier === 'SF'
                          ? 'bg-studio-red text-white'
                          : t.tier === 'FAM'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {t.tier === 'SF' ? 'Socio Fundador' : t.tier === 'FAM' ? 'Familiar' : 'Estándar'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">
                      {t.billingType}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1 leading-snug">
                    {t.name}
                  </h3>

                  <div className="text-2xl font-black text-slate-900 mb-2 font-mono">
                    {(t.priceCents / 100).toFixed(2)} €
                    <span className="text-xs font-normal text-slate-500 ml-1">IVA Inc.</span>
                  </div>

                  {/* Desglose contable Base + IVA */}
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5 text-slate-600 mb-4 font-mono">
                    <div>Base Imponible: {(vat.baseCents / 100).toFixed(2)} €</div>
                    <div>IVA Repercutido (21%): {(vat.vatCents / 100).toFixed(2)} €</div>
                  </div>

                  {/* REA Metrics: Atletas activos y MRR de este plan */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl mb-4 text-xs">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-700" />
                        {subscribers} Atletas suscritos
                      </span>
                      <span className="font-mono text-emerald-800">
                        {mrrContribution.toFixed(2)} €/mes
                      </span>
                    </div>
                  </div>

                  {/* Disciplinas y Programas */}
                  <div className="text-xs text-slate-600 mb-4">
                    <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider">
                      Disciplinas incluidas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {t.programs?.map((prog: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                        >
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta con Acciones */}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span
                    className={`font-bold text-[10px] uppercase tracking-wider ${
                      t.active ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {t.active ? '● Activa en catálogo' : '○ Archivada'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(t)}
                      className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" /> Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActiveTariff(t)}
                      className={`text-xs font-bold hover:underline cursor-pointer ${
                        t.active ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {t.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Tarifa */}
      {/* Modal Crear / Editar Tarifa (Radix UI Dialog) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTariff ? 'Editar Tarifa' : 'Nueva Tarifa Oficial'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTariff} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nombre de la Membresía
              </label>
              <Input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. BJJ Adultos Ilimitado"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Segmento / Colectivo
                </label>
                <select
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="STD">Estándar (STD)</option>
                  <option value="SF">Socio Fundador (SF)</option>
                  <option value="FAM">Familiar (FAM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Modalidad Cobro
                </label>
                <select
                  value={form.billingType}
                  onChange={(e) => setForm({ ...form, billingType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="MONTHLY">Mensual (MONTHLY)</option>
                  <option value="PASS">Bono 10 Sesiones (PASS)</option>
                  <option value="DROP_IN">Clase Suelta (DROP_IN)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Precio Total (€ IVA Inc.)
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={form.priceEuros}
                onChange={(e) => setForm({ ...form, priceEuros: parseFloat(e.target.value) || 0 })}
                className="font-mono text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Disciplinas (Separadas por comas)
              </label>
              <Input
                type="text"
                value={form.programs}
                onChange={(e) => setForm({ ...form, programs: e.target.value })}
                placeholder="Ej. BJJ Gi, No-Gi Grappling, Open Mat"
              />
            </div>

            {editingTariff && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded text-brand-accent focus:ring-brand-accent cursor-pointer"
                />
                <label htmlFor="editActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Tarifa activa en catálogo de contratación
                </label>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="studio"
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Guardando...' : editingTariff ? 'Guardar Cambios' : 'Crear Tarifa'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Radix Dialog: Confirmar Carga de Tarifas Oficiales */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar Tarifas Oficiales 247Studio</DialogTitle>
            <DialogDescription>
              ¿Deseas volcar en el catálogo las 6 tarifas oficiales de 247Studio (Estándar 75 €, Fundador 60 €, Familiar 55 €, Bono 10 sesiones 110 €, Kids 50 €, Drop-In 15 €)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRestoreModal(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirmLoadOfficialTemplate}
              disabled={actionLoading}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white font-black"
            >
              {actionLoading ? 'Cargando...' : 'Confirmar y Cargar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
