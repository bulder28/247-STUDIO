import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, CreditCard, PauseCircle, Send } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { getMadridYearMonth } from '@/shared/domain/payment-status';
import { PaymentDomainModel, PaymentMethod, TariffDomainModel } from '@/shared/domain/types';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export const ProgramsPage: React.FC = () => {
  const { user, userData } = useAuth();
  const [tariff, setTariff] = useState<TariffDomainModel | null>(null);
  const [payments, setPayments] = useState<PaymentDomainModel[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('BIZUM');
  const [loading, setLoading] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'plan' | 'abonar' | 'recibos'>('plan');

  // Solicitud de suspensión temporal (Freeze)
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState<'INJURY' | 'OTHER'>('INJURY');
  const [freezeNotes, setFreezeNotes] = useState('');
  const [freezeSubmitted, setFreezeSubmitted] = useState(false);

  const now = new Date();
  const currentPeriod = getMadridYearMonth(now);

  const fetchPaymentsAndTariff = async () => {
    if (!user || !userData) return;
    try {
      if (userData.activeTariffId) {
        const tariffSnap = await getDoc(doc(db, 'tariffs', userData.activeTariffId));
        if (tariffSnap.exists()) {
          setTariff({ id: tariffSnap.id, ...(tariffSnap.data() as Omit<TariffDomainModel, 'id'>) });
        }
      }

      const payQuery = query(collection(db, 'payments'), where('uid', '==', user.uid));
      const paySnap = await getDocs(payQuery);
      const list: PaymentDomainModel[] = [];
      paySnap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));
      list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setPayments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndTariff();
  }, [user, userData]);

  const handleNotifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmittingPayment(true);

    try {
      const paymentId = `pay_${user.uid}_${currentPeriod}_${Date.now()}`;
      await setDoc(doc(db, 'payments', paymentId), {
        uid: user.uid,
        period: currentPeriod,
        method,
        status: 'PENDING_APPROVAL',
        billingType: tariff?.billingType || 'MONTHLY',
        createdAt: serverTimestamp(),
      });

      setPaymentSuccess(true);
      await fetchPaymentsAndTariff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la notificación de abono');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleFreezeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const freezeId = `frz_${user.uid}_${Date.now()}`;
      await setDoc(doc(db, 'freezeRequests', freezeId), {
        uid: user.uid,
        userName: userData?.alias || 'Alumno',
        reason: freezeReason,
        notes: freezeNotes,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });

      setFreezeSubmitted(true);
      setTimeout(() => {
        setShowFreezeModal(false);
        setFreezeSubmitted(false);
        setFreezeNotes('');
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const vatBreakdown = tariff?.priceCents ? calculateVatBreakdown(tariff.priceCents) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6 pb-2 md:pb-12 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Tarifa y Estado Contable</h1>
        <p className="hidden sm:block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Consulta tu plan contratado y notifica tus abonos mensuales por Bizum o Efectivo.
        </p>
      </div>

      {/* Selector de sub-pestañas móvil sin scroll vertical */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('plan')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'plan' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          🏷️ Mi Plan
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('abonar')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'abonar' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          📲 Abonar
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('recibos')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'recibos' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          🧾 Recibos
        </button>
      </div>

      {/* Tarjeta Tarifa Contratada estilo MatGoat */}
      <div
        className={`${
          mobileTab === 'plan' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 inline-block mb-1.5">
              {userData?.pricingTier === 'SF' ? 'Socio Fundador (SF)' : 'Tarifa Estándar'}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{tariff?.name || 'Cuota Mensual 247Studio'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Modalidad {tariff?.billingType || 'MONTHLY'}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {tariff ? `${(tariff.priceCents / 100).toFixed(2)} €` : '65.00 €'}
            </span>
            <span className="text-xs text-slate-400 block font-medium">IVA 21% Incluido</span>
          </div>
        </div>

        {/* Desglose Fiscal Transparente */}
        {vatBreakdown && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-slate-400 block">Base Imponible:</span>
              <span className="font-bold text-slate-900">{(vatBreakdown.baseCents / 100).toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-slate-400 block">IVA (21%):</span>
              <span className="font-bold text-slate-900">{(vatBreakdown.vatCents / 100).toFixed(2)} €</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 block">Total Liquidado:</span>
              <span className="font-bold text-slate-900">{(vatBreakdown.totalCents / 100).toFixed(2)} €</span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 flex justify-end">
          <button
            onClick={() => setShowFreezeModal(true)}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-semibold transition cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-slate-400" />
            <span>Solicitar suspensión temporal por lesión / trabajo</span>
          </button>
        </div>
      </div>

      {/* Formulario Notificar Abono */}
      <div
        className={`${
          mobileTab === 'abonar' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm`}
      >
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              He pagado este mes ({currentPeriod})
            </h2>
            <p className="text-xs text-slate-500">
              Notifica tu abono para que el profesor o recepción lo valide en caja.
            </p>
          </div>
        </div>

        {paymentSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Pago registrado como PENDIENTE DE VALIDACIÓN. El admin lo cotejará en el extracto bancario.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleNotifyPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Método de Pago Empleado
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('BIZUM')}
                className={`py-2.5 sm:py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  method === 'BIZUM'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Bizum</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`py-2.5 sm:py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  method === 'CASH'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Metálico (En Mano)</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900">Datos para Bizum:</p>
            <p className="text-slate-900 font-mono text-sm font-semibold">+34 614 00 52 78 (247Studio BJJ)</p>
            <p className="text-[11px] text-slate-500">Concepto obligatorio: {userData?.alias} - {currentPeriod}</p>
          </div>

          <button
            type="submit"
            disabled={submittingPayment}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submittingPayment ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Notificar Pago Realizado
              </>
            )}
          </button>
        </form>
      </div>

      {/* Historial de Pagos Recientes */}
      <div
        className={`${
          mobileTab === 'recibos' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm`}
      >
        <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Historial de Notificaciones y Recibos
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400">No tienes registros de pago en tu historial.</p>
        ) : (
          <div className="space-y-2.5">
            {payments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Periodo {p.period} ({p.method})</span>
                  <span className="text-[11px] text-slate-500">
                    {p.amountCents ? `${(p.amountCents / 100).toFixed(2)} €` : 'Pendiente de importe'}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      p.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : p.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {p.status === 'APPROVED'
                      ? 'APROBADO'
                      : p.status === 'PENDING_APPROVAL'
                      ? 'EN REVISIÓN'
                      : 'RECHAZADO'}
                  </span>
                  {p.rejectedReason && (
                    <span className="text-[10px] text-red-600 block mt-1">{p.rejectedReason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Solicitud de Freeze (Radix UI Dialog) */}
      <Dialog open={showFreezeModal} onOpenChange={setShowFreezeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Suspensión Temporal</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-500 pt-1">
            La solicitud será enviada al profesor del centro (Mario / David) para su validación presencial.
          </p>

          {freezeSubmitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
              ¡Solicitud enviada al profesor con éxito!
            </div>
          ) : (
            <form onSubmit={handleFreezeRequest} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Motivo
                </label>
                <select
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value as 'INJURY' | 'OTHER')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="INJURY">Lesión deportiva o médica</option>
                  <option value="OTHER">Motivos laborales / viaje</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Notas adicionales para el profesor
                </label>
                <textarea
                  rows={3}
                  value={freezeNotes}
                  onChange={(e) => setFreezeNotes(e.target.value)}
                  placeholder="Indica el tiempo estimado de recuperación..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFreezeModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1"
                >
                  Enviar Solicitud
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};