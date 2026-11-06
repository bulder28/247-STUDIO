import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, CreditCard, PauseCircle, Send } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { getMadridYearMonth } from '@/shared/domain/payment-status';
import { PaymentDomainModel, PaymentMethod, TariffDomainModel } from '@/shared/domain/types';

export const ProgramsPage: React.FC = () => {
  const { user, userData } = useAuth();
  const [tariff, setTariff] = useState<TariffDomainModel | null>(null);
  const [payments, setPayments] = useState<PaymentDomainModel[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('BIZUM');
  const [loading, setLoading] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // 1. Tarifa activa
      if (userData.activeTariffId) {
        const tariffSnap = await getDoc(doc(db, 'tariffs', userData.activeTariffId));
        if (tariffSnap.exists()) {
          setTariff({ id: tariffSnap.id, ...(tariffSnap.data() as Omit<TariffDomainModel, 'id'>) });
        }
      }

      // 2. Historial de pagos
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
      const freezeReqId = `frz_req_${user.uid}_${Date.now()}`;
      await setDoc(doc(db, 'freezeRequests', freezeReqId), {
        uid: user.uid,
        alias: userData?.alias || 'Alumno',
        reason: freezeReason,
        notes: freezeNotes,
        status: 'PENDING_ADMIN',
        createdAt: serverTimestamp(),
      });

      setFreezeSubmitted(true);
      setTimeout(() => {
        setShowFreezeModal(false);
        setFreezeSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const vatBreakdown = tariff
    ? calculateVatBreakdown(tariff.priceCents, tariff.vatRate)
    : null;

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-white">Tarifa y Estado Contable</h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Consulta tu plan contratado y notifica tus abonos mensuales por Bizum o Efectivo.
        </p>
      </div>

      {/* Tarjeta Tarifa Contratada */}
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-studio-red text-white inline-block mb-1">
              {userData?.pricingTier === 'SF' ? 'Socio Fundador (SF)' : 'Tarifa Estándar'}
            </span>
            <h2 className="text-xl font-black text-white">{tariff?.name || 'Cuota Mensual 247Studio'}</h2>
            <p className="text-xs text-studio-cream/70 mt-0.5">Modalidad {tariff?.billingType || 'MONTHLY'}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-2xl font-black text-white">
              {tariff ? `${(tariff.priceCents / 100).toFixed(2)} €` : '-- €'}
            </span>
            <span className="text-xs text-studio-cream/60 block font-medium">IVA 21% Incluido</span>
          </div>
        </div>

        {/* Desglose Fiscal Transparente */}
        {vatBreakdown && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-studio-navy/60 p-3.5 rounded-2xl border border-white/5">
            <div>
              <span className="text-studio-cream/60 block">Base Imponible:</span>
              <span className="font-extrabold text-white">{(vatBreakdown.baseCents / 100).toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-studio-cream/60 block">IVA (21%):</span>
              <span className="font-extrabold text-white">{(vatBreakdown.vatCents / 100).toFixed(2)} €</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-studio-cream/60 block">Total Liquidado:</span>
              <span className="font-extrabold text-studio-red">{(vatBreakdown.totalCents / 100).toFixed(2)} €</span>
            </div>
          </div>
        )}

        {/* Botón para solicitar suspensión / congelación temporal */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setShowFreezeModal(true)}
            className="text-xs text-studio-cream/80 hover:text-white flex items-center gap-1.5 font-semibold transition"
          >
            <PauseCircle className="w-4 h-4 text-studio-red" />
            <span>Solicitar suspensión temporal por lesión / trabajo</span>
          </button>
        </div>
      </div>

      {/* Formulario Notificar Abono */}
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-studio-red text-white shadow">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wide text-white">
              He pagado este mes ({currentPeriod})
            </h2>
            <p className="text-xs text-studio-cream/70">
              Notifica tu abono para que el administrador lo valide en caja.
            </p>
          </div>
        </div>

        {paymentSuccess && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pago registrado como PENDIENTE DE VALIDACIÓN. El admin lo cotejará en el extracto bancario.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-studio-red/15 border border-studio-red/30 rounded-xl text-xs text-studio-red font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleNotifyPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-2">
              Método de Pago Empleado
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('BIZUM')}
                className={`py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  method === 'BIZUM'
                    ? 'bg-studio-red text-white border-studio-red shadow-lg shadow-studio-red/30'
                    : 'bg-studio-navy text-studio-cream/70 border-white/10 hover:text-white'
                }`}
              >
                <span>Bizum</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  method === 'CASH'
                    ? 'bg-studio-red text-white border-studio-red shadow-lg shadow-studio-red/30'
                    : 'bg-studio-navy text-studio-cream/70 border-white/10 hover:text-white'
                }`}
              >
                <span>Metálico (En Mano)</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-studio-navy rounded-xl border border-white/5 text-xs text-studio-cream/80 space-y-1">
            <p className="font-bold text-white">Datos para Bizum:</p>
            <p className="text-studio-cream/90 font-mono text-sm">+34 614 00 52 78 (247Studio BJJ)</p>
            <p className="text-[11px] text-studio-cream/60">Concepto obligatorio: {userData?.alias} - {currentPeriod}</p>
          </div>

          <button
            type="submit"
            disabled={submittingPayment}
            className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2 disabled:opacity-50"
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
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-white mb-4">
          Historial de Notificaciones y Recibos
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-studio-cream/60">No tienes registros de pago en tu historial.</p>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 bg-studio-navy rounded-xl border border-white/5 text-xs"
              >
                <div>
                  <span className="font-bold text-white block">Periodo {p.period} ({p.method})</span>
                  <span className="text-[11px] text-studio-cream/60">
                    {p.amountCents ? `${(p.amountCents / 100).toFixed(2)} €` : 'Pendiente de importe'}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : p.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-studio-red/20 text-studio-red border border-studio-red/30'
                    }`}
                  >
                    {p.status === 'APPROVED'
                      ? 'APROBADO (OK)'
                      : p.status === 'PENDING_APPROVAL'
                      ? 'EN REVISIÓN'
                      : 'RECHAZADO'}
                  </span>
                  {p.rejectedReason && (
                    <span className="text-[10px] text-studio-red block mt-1">{p.rejectedReason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Solicitud de Freeze */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-studio-navy-light border border-white/20 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-base text-white mb-2">Solicitar Suspensión Temporal</h3>
            <p className="text-xs text-studio-cream/70 mb-4">
              La solicitud será enviada al administrador del centro para su validación presencial.
            </p>

            {freezeSubmitted ? (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-bold text-center">
                ¡Solicitud enviada al administrador!
              </div>
            ) : (
              <form onSubmit={handleFreezeRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                    Motivo
                  </label>
                  <select
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value as 'INJURY' | 'OTHER')}
                    className="w-full px-3 py-2 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
                  >
                    <option value="INJURY">Lesión deportiva o médica</option>
                    <option value="OTHER">Motivos laborales / viaje</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                    Notas adicionales para el profesor
                  </label>
                  <textarea
                    rows={3}
                    value={freezeNotes}
                    onChange={(e) => setFreezeNotes(e.target.value)}
                    placeholder="Indica el tiempo estimado de recuperación..."
                    className="w-full px-3 py-2 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFreezeModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-studio-cream hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-studio-red text-white text-xs font-bold uppercase tracking-wider hover:bg-studio-red-dark shadow-lg shadow-studio-red/30"
                  >
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
