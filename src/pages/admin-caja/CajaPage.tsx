import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Banknote,
  CalendarDays,
  Check,
  Download,
  MessageCircle,
  Minus,
  PauseCircle,
  Plus,
  Receipt,
  Smartphone,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import {
  buildChargePayments,
  buildPeriodOptions,
  buildUnpaidRows,
  MAX_PREPAYMENT_MONTHS,
  NO_TARIFF,
  summarizePeriodPayments,
} from '@/shared/domain/billing';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { getMadridYearMonth } from '@/shared/domain/payment-status';
import { downloadReceiptPdf } from '@/shared/utils/receiptGenerator';
import { exportPaymentsToGestoriaCsv } from '@/shared/utils/csvExporter';
import {
  BillingType,
  PaymentDomainModel,
  PaymentMethod,
  PaymentStatus,
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
import { fieldCls, labelCls } from '@/shared/ui/field-styles';
import { KpiCard } from '@/shared/ui/kpi-card';
import { PageHeader } from '@/shared/ui/page-header';
import { SectionCard } from '@/shared/ui/section-card';

const eur = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const BILLING_LABEL: Record<string, string> = {
  MONTHLY: 'Cuota mensual',
  PASS: 'Bono de sesiones',
  DROP_IN: 'Clase suelta',
};


interface FreezeRequest {
  id: string;
  uid: string;
  alias: string;
  reason: 'INJURY' | 'OTHER';
  notes?: string;
  status: 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

export const CajaPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentDomainModel[]>([]);
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [freezeRequests, setFreezeRequests] = useState<FreezeRequest[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>(getMadridYearMonth(new Date()));
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rejectingPayment, setRejectingPayment] = useState<PaymentDomainModel | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('No recibido en cuenta bancaria / Bizum');
  const [phoneAlertStudent, setPhoneAlertStudent] = useState<string | null>(null);

  // Counter charge (POS) modal state
  const [showPosModal, setShowPosModal] = useState(false);
  const [tariffs, setTariffs] = useState<TariffDomainModel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [posFieldErrors, setPosFieldErrors] = useState<{ concept?: string; amount?: string }>({});
  const [posStudentUid, setPosStudentUid] = useState<string>('');
  const [posCustomAlias, setPosCustomAlias] = useState<string>('');
  const [posTariffId, setPosTariffId] = useState<string>(''); // '' = manual concept
  const [posManualConcept, setPosManualConcept] = useState<string>('');
  const [posManualBillingType, setPosManualBillingType] = useState<BillingType>('MONTHLY');
  const [posAmountEur, setPosAmountEur] = useState<string>('');
  const [posPeriod, setPosPeriod] = useState<string>(getMadridYearMonth(new Date()));
  const [posMonths, setPosMonths] = useState<number>(1);
  const [posMethod, setPosMethod] = useState<PaymentMethod>('CASH');
  const [posAutoDownloadReceipt, setPosAutoDownloadReceipt] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'unpaid' | 'payments'>('unpaid');
  const [unpaidTariffFilter, setUnpaidTariffFilter] = useState<string>('ALL');

  const fetchCajaData = async () => {
    try {
      const [payRes, uRes, frRes, tRes] = await Promise.allSettled([
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'freezeRequests')),
        getDocs(collection(db, 'tariffs')),
      ]);

      const failed = [payRes, uRes, tRes].some((r) => r.status === 'rejected');
      setLoadError(
        failed
          ? 'No se pudieron cargar todos los datos de caja. Revisa la conexión y vuelve a cargar la página.'
          : null
      );

      const pList: PaymentDomainModel[] = [];
      if (payRes.status === 'fulfilled') {
        payRes.value.forEach((d) => pList.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));
      }
      setPayments(pList);

      const uList: UserDomainModel[] = [];
      if (uRes.status === 'fulfilled') {
        uRes.value.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      }
      setUsers(uList);

      const frList: FreezeRequest[] = [];
      if (frRes.status === 'fulfilled') {
        frRes.value.forEach((d) => frList.push({ id: d.id, ...(d.data() as Omit<FreezeRequest, 'id'>) }));
      }
      setFreezeRequests(frList);

      const tList: TariffDomainModel[] = [];
      if (tRes.status === 'fulfilled') {
        tRes.value.forEach((d) => tList.push({ id: d.id, ...(d.data() as Omit<TariffDomainModel, 'id'>) }));
      }
      setTariffs(tList);
    } catch (err) {
      console.error('Error fetching caja data:', err);
      setLoadError('No se pudieron cargar los datos de caja. Revisa la conexión y vuelve a cargar la página.');
    }
  };

  useEffect(() => {
    fetchCajaData();
  }, []);

  const handleApprovePayment = async (payment: PaymentDomainModel) => {
    if (!user) return;
    setActionLoading(payment.id);

    try {
      const student = users.find((u) => u.uid === payment.uid);

      let amountCents = payment.amountCents;
      if (!amountCents) {
        if (payment.billingType === 'PASS') {
          amountCents = 11000; // 110,00 € bono 10 sesiones
        } else if (payment.billingType === 'DROP_IN') {
          amountCents = 1500; // 15,00 € clase suelta
        } else {
          // Tarifa mensual según catálogo oficial y pricingTier del alumno
          if (student?.pricingTier === 'SF') {
            amountCents = 6000; // 60,00 € Fuerzas y Cuerpos de Seguridad / Socios Fundadores
          } else if (student?.pricingTier === 'FAM') {
            amountCents = 5500; // 55,00 € Tarifa Familiar / Pareja
          } else if (student?.isMinor || (student as any)?.pricingTier === 'KIDS') {
            amountCents = 5000; // 50,00 € BJJ Kids & Teens
          } else {
            amountCents = 7500; // 75,00 € Tarifa estándar BJJ Adultos Ilimitado
          }
        }
      }

      // firestore.rules requires baseCents + vatCents === amountCents on this
      // update (payments/{id} allow update, APPROVED branch); kept only to
      // satisfy that invariant, never shown in the UI (see CajaPage KPIs below).
      const vat = calculateVatBreakdown(amountCents, 0.21);

      const updateData: Record<string, any> = {
        status: 'APPROVED',
        amountCents: vat.totalCents,
        baseCents: vat.baseCents,
        vatCents: vat.vatCents,
        validatedBy: user.uid,
        validatedAt: serverTimestamp(),
      };

      if (payment.billingType === 'PASS') {
        updateData.sessionsIncluded = payment.sessionsIncluded || 10;
        updateData.sessionsRemaining = (payment as any).sessionsRemaining ?? 10;
      }

      await updateDoc(doc(db, 'payments', payment.id), updateData);
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, ...updateData } : p))
      );
    } catch (err) {
      console.error('Error approving payment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectModal = (payment: PaymentDomainModel) => {
    setRejectingPayment(payment);
    setRejectReason('No recibido en cuenta bancaria / Bizum');
  };

  const handleConfirmReject = async () => {
    if (!user || !rejectingPayment) return;
    setActionLoading(rejectingPayment.id);
    try {
      await updateDoc(doc(db, 'payments', rejectingPayment.id), {
        status: 'REJECTED',
        rejectedReason: rejectReason,
        validatedBy: user.uid,
        validatedAt: serverTimestamp(),
      });
      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectingPayment.id
            ? {
                ...p,
                status: 'REJECTED',
                rejectedReason: rejectReason,
                validatedBy: user.uid,
              }
            : p
        )
      );
      setRejectingPayment(null);
    } catch (err) {
      console.error('Error rejecting payment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const activeTariffs = useMemo(
    () => tariffs.filter((t) => t.active).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [tariffs]
  );
  const studentOptions = useMemo(
    () =>
      users
        .filter((u) => (u.permissions ?? []).some((perm) => perm.toLowerCase() === 'student'))
        .sort((a, b) => (a.alias || '').localeCompare(b.alias || '', 'es')),
    [users]
  );
  // Period choices: 6 months back to 12 months ahead of the current Madrid month.
  const periodOptions = useMemo(() => buildPeriodOptions(getMadridYearMonth(new Date()), 6, 12), []);
  const filterPeriodOptions = useMemo(
    () =>
      periodOptions.some((o) => o.value === filterPeriod)
        ? periodOptions
        : buildPeriodOptions(filterPeriod, 0, 0).concat(periodOptions),
    [periodOptions, filterPeriod]
  );
  const posPeriodOptions = useMemo(
    () =>
      periodOptions.some((o) => o.value === posPeriod)
        ? periodOptions
        : buildPeriodOptions(posPeriod, 0, 0).concat(periodOptions),
    [periodOptions, posPeriod]
  );
  const posTariff = activeTariffs.find((t) => t.id === posTariffId) ?? null;
  const posStudent = users.find((u) => u.uid === posStudentUid);
  const posBillingType: BillingType = posTariff ? posTariff.billingType : posManualBillingType;
  const posConcept = posTariff ? posTariff.name : posManualConcept.trim();
  const posStaffLabel = user?.displayName || user?.email || 'Mostrador';

  const posCharge = useMemo(() => {
    const baseAmountCents = Math.round(parseFloat(posAmountEur) * 100);
    if (!posConcept || !Number.isFinite(baseAmountCents) || baseAmountCents <= 0) return null;
    try {
      return buildChargePayments({
        uid: posStudentUid || 'walkin',
        period: posPeriod,
        months: posBillingType === 'MONTHLY' ? posMonths : 1,
        method: posMethod,
        billingType: posBillingType,
        concept: posConcept,
        tariffId: posTariff?.id,
        baseAmountCents,
        isFoundingMember: !!posStudent?.isFoundingMember,
        validatedBy: user?.uid ?? '',
        staffLabel: posStaffLabel,
        stamp: null,
      });
    } catch {
      return null;
    }
  }, [posAmountEur, posConcept, posStudentUid, posPeriod, posMonths, posMethod, posBillingType, posTariff, posStudent, user, posStaffLabel]);

  const handleOpenPosModal = () => {
    setPosError(null);
    setPosFieldErrors({});
    setPosStudentUid('');
    setPosCustomAlias('');
    setPosTariffId('');
    setPosManualConcept('');
    setPosManualBillingType('MONTHLY');
    setPosAmountEur('');
    setPosPeriod(getMadridYearMonth(new Date()));
    setPosMonths(1);
    setPosMethod('CASH');
    setShowPosModal(true);
  };

  const handleChargeStudent = (uid: string) => {
    handleOpenPosModal();
    setPosStudentUid(uid);
    setPosPeriod(filterPeriod);
  };

  // Deep link `/admin/caja?cobrar=<uid>` (used by the enrollment success screen): once the users are
  // loaded, open the charge modal with that student preselected for the current month, then drop the param.
  useEffect(() => {
    const target = searchParams.get('cobrar');
    if (!target || users.length === 0) return;
    if (users.some((u) => u.uid === target)) {
      handleOpenPosModal();
      setPosStudentUid(target);
      setPosPeriod(getMadridYearMonth(new Date()));
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, users]);

  const handleSelectPosTariff = (tariffId: string) => {
    setPosTariffId(tariffId);
    const t = activeTariffs.find((x) => x.id === tariffId);
    if (t) {
      setPosAmountEur((t.priceCents / 100).toFixed(2));
      if (t.billingType !== 'MONTHLY') setPosMonths(1);
    }
  };

  const handleCreatePosCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const fieldErrors: { concept?: string; amount?: string } = {};
    if (!posTariff && !posManualConcept.trim()) fieldErrors.concept = 'Indica el concepto del cobro.';
    const amountValue = parseFloat(posAmountEur);
    if (!Number.isFinite(amountValue) || amountValue <= 0) fieldErrors.amount = 'Introduce un importe mayor que 0.';
    setPosFieldErrors(fieldErrors);
    if (fieldErrors.concept || fieldErrors.amount) {
      const firstId = fieldErrors.concept ? 'pos-concept' : 'pos-amount';
      document.getElementById(firstId)?.focus();
      return;
    }
    if (!posCharge) return;

    setActionLoading('pos_charge');
    setPosError(null);

    try {
      const effectiveAlias = posStudent?.alias || posCustomAlias.trim() || 'Cliente mostrador';
      const effectiveUid = posStudentUid || `walkin_${Date.now()}`;
      const built = buildChargePayments({
        uid: effectiveUid,
        period: posPeriod,
        months: posBillingType === 'MONTHLY' ? posMonths : 1,
        method: posMethod,
        billingType: posBillingType,
        concept: posConcept,
        tariffId: posTariff?.id,
        baseAmountCents: Math.round(parseFloat(posAmountEur) * 100),
        isFoundingMember: !!posStudent?.isFoundingMember,
        validatedBy: user.uid,
        staffLabel: posStaffLabel,
        stamp: serverTimestamp(),
      });

      // All-or-nothing: every period is written in one atomic batch.
      const batch = writeBatch(db);
      const created = built.payments.map((data) => {
        const ref = doc(collection(db, 'payments'));
        batch.set(ref, data);
        return { id: ref.id, data };
      });
      await batch.commit();

      // Bono balance is tracked on the payment; mirror it on the student's record only.
      if (posStudentUid && posBillingType === 'PASS') {
        try {
          await updateDoc(doc(db, 'users', posStudentUid), {
            sessionsRemaining: built.payments[0].sessionsRemaining,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error('Error syncing bono balance:', err);
        }
      }

      if (posAutoDownloadReceipt) {
        const lastPeriod = built.payments[built.payments.length - 1].period;
        const periodLabel = built.payments.length > 1 ? `${posPeriod} a ${lastPeriod}` : posPeriod;
        const now = new Date();
        await downloadReceiptPdf({
          receiptNumber: `REC-POS-${created[0].id.slice(-6).toUpperCase()}`,
          dateStr: now.toLocaleDateString('es-ES'),
          timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          studentAlias: effectiveAlias,
          concept: `${posConcept} (${periodLabel})`,
          amountEur: built.totalCents / 100,
          paymentMethod: posMethod,
          staffName: posStaffLabel,
        });
      }

      setPayments((prev) => [
        ...created.map(({ id, data }) => ({ id, ...data }) as unknown as PaymentDomainModel),
        ...prev,
      ]);
      setShowPosModal(false);
    } catch (err) {
      console.error('Error creating POS charge:', err);
      setPosError('No se pudo registrar el cobro. No se ha guardado ningún pago; revisa la conexión e inténtalo de nuevo.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWhatsAppReminder = (payment: PaymentDomainModel) => {
    const student = users.find((u) => u.uid === payment.uid);
    if (!student?.phone) {
      setPhoneAlertStudent(student?.alias || 'El alumno');
      return;
    }
    const cleanPhone = student.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`;
    const amountStr = payment.amountCents ? (payment.amountCents / 100).toFixed(2) : '75.00';
    const msg = encodeURIComponent(
      `¡Hola ${student.alias || 'compañero'}! Te saludamos desde 247Studio. Tenemos pendiente la validación de tu cuota de ${payment.period} (${amountStr} €). Si ya hiciste el abono en Bizum o efectivo, confírmanos por aquí. ¡Muchas gracias y nos vemos en el tatami! Oss.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${msg}`, '_blank');
  };

  const handleApproveFreeze = async (req: FreezeRequest) => {
    if (!user) return;
    try {
      const freezeDocId = `frz_${req.uid}_${Date.now()}`;
      await setDoc(doc(db, 'freezes', freezeDocId), {
        uid: req.uid,
        reason: req.reason,
        startDate: serverTimestamp(),
        openEnded: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      await updateDoc(doc(db, 'freezeRequests', req.id), {
        status: 'APPROVED',
      });

      // Actualizar cuenta en users/{uid} a FROZEN y en kiosk_members/{uid} a PAUSED
      await updateDoc(doc(db, 'users', req.uid), {
        accountStatus: 'FROZEN',
        freezeReason: req.reason === 'INJURY' ? 'Lesión deportiva' : 'Pausa deportiva aprobada',
        frozenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'kiosk_members', req.uid), {
          accountStatus: 'PAUSED',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // kiosk_member might not exist yet
      }

      setFreezeRequests((prev) =>
        prev.map((f) => (f.id === req.id ? { ...f, status: 'APPROVED' } : f))
      );

      setUsers((prev) =>
        prev.map((u) => (u.uid === req.uid ? { ...u, accountStatus: 'FROZEN' } : u))
      );
    } catch (err) {
      console.error('Error approving freeze:', err);
    }
  };

  const handleRejectFreeze = async (req: FreezeRequest) => {
    try {
      await updateDoc(doc(db, 'freezeRequests', req.id), {
        status: 'REJECTED',
      });
      setFreezeRequests((prev) =>
        prev.map((f) => (f.id === req.id ? { ...f, status: 'REJECTED' } : f))
      );
    } catch (err) {
      console.error('Error rejecting freeze:', err);
    }
  };
  // Period filtering
  const periodPayments = payments.filter((p) => p.period === filterPeriod);
  const approvedPayments = periodPayments.filter((p) => p.status === 'APPROVED');
  const pendingPayments = periodPayments.filter((p) => p.status === 'PENDING_APPROVAL');

  // Aggregates
  const totalRecaudadoCents = approvedPayments.reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalCashCents = approvedPayments
    .filter((p) => p.method === 'CASH')
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalBizumCents = approvedPayments
    .filter((p) => p.method === 'BIZUM')
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);

  // Unpaid students for the selected period
  const unpaidRows = buildUnpaidRows(
    users,
    payments,
    filterPeriod,
    unpaidTariffFilter === 'ALL' ? undefined : unpaidTariffFilter
  );
  const allUnpaidCount = buildUnpaidRows(users, payments, filterPeriod).length;
  const periodSummary = summarizePeriodPayments(users, payments, filterPeriod);
  const tariffName = (key: string) =>
    key === NO_TARIFF ? 'Sin tarifa' : tariffs.find((t) => t.id === key)?.name ?? 'Tarifa eliminada';
  const paidTariffKeys = Object.keys(periodSummary.paidByTariff).sort(
    (a, b) => periodSummary.paidByTariff[b] - periodSummary.paidByTariff[a]
  );
  const paidPercent = periodSummary.total > 0 ? Math.round((periodSummary.paid / periodSummary.total) * 100) : 0;
  const periodLabel = filterPeriodOptions.find((o) => o.value === filterPeriod)?.label ?? filterPeriod;

  const pendingFreezeRequests = freezeRequests.filter((f) => f.status === 'PENDING_ADMIN');

  const visiblePayments = periodPayments.filter(
    (p) =>
      (statusFilter === 'ALL' || p.status === statusFilter) &&
      (methodFilter === 'ALL' || p.method === methodFilter)
  );

  const showPendingPayments = () => {
    setStatusFilter('PENDING_APPROVAL');
    setActiveView('payments');
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Caja"
        description={
          <>
            Cobros de <span className="font-bold capitalize text-studio-navy">{periodLabel}</span>
          </>
        }
        actions={
          <>
            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-studio-navy/15 bg-white px-3.5">
              <CalendarDays className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Mes a consultar"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="min-h-11 cursor-pointer bg-transparent text-base font-semibold capitalize text-studio-navy focus:outline-none"
              >
                {filterPeriodOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => exportPaymentsToGestoriaCsv(periodPayments, users, filterPeriod)}
              title="Exportar CSV de cobros para la gestoría"
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-studio-navy/15 bg-white px-4 text-sm font-semibold text-studio-navy transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              <span>CSV gestoría</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPosModal}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-studio-red px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-studio-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>Registrar cobro</span>
            </button>
          </>
        }
      />

      {loadError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {loadError}
        </p>
      )}

      {/* Month figures */}
      <section aria-label={`Resumen de ${periodLabel}`} className="overflow-hidden rounded-2xl bg-studio-navy text-white">
        <div className="grid grid-cols-2 gap-1 p-2 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <KpiCard
            featured
            className="col-span-2 md:col-span-1"
            label="Cobrado"
            value={eur(totalRecaudadoCents)}
          />
          <KpiCard label="Pagos" value={approvedPayments.length} hint="aprobados" />
          <KpiCard
            label="Por aprobar"
            value={pendingPayments.length}
            tone={pendingPayments.length > 0 ? 'warning' : 'neutral'}
            hint={pendingPayments.length > 0 ? 'Toca para revisarlos' : 'Todo al día'}
            onClick={pendingPayments.length > 0 ? showPendingPayments : undefined}
          />
          <KpiCard
            label="Sin pagar"
            value={allUnpaidCount}
            tone={allUnpaidCount > 0 ? 'danger' : 'success'}
            hint={`${periodSummary.paid} de ${periodSummary.total} han pagado`}
            onClick={() => setActiveView('unpaid')}
          />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 px-5 py-3.5">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/65">
              <Banknote className="h-4 w-4" aria-hidden="true" /> Efectivo en cajón
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums">{eur(totalCashCents)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/65">
              <Smartphone className="h-4 w-4" aria-hidden="true" /> Bizum y cuenta
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums">{eur(totalBizumCents)}</dd>
          </div>
        </dl>
      </section>

      {/* Pending freeze requests */}
      {pendingFreezeRequests.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900">
            <PauseCircle className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-bold">Solicitudes de pausa ({pendingFreezeRequests.length})</h2>
          </div>
          <ul className="space-y-2">
            {pendingFreezeRequests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <span className="block font-bold text-studio-navy">{req.alias}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    Motivo: {req.reason === 'INJURY' ? 'Lesión deportiva' : 'Laboral / viaje'} · {req.notes || 'Sin notas adicionales'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveFreeze(req)}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" /> Aprobar pausa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectFreeze(req)}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-bold text-rose-800 hover:bg-rose-100"
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Work surface switcher */}
      <div role="tablist" aria-label="Vista de caja" className="grid grid-cols-2 gap-1 rounded-2xl bg-studio-navy/10 p-1 sm:max-w-md">
        {(
          [
            { id: 'unpaid', label: 'Sin pagar', count: allUnpaidCount },
            { id: 'payments', label: 'Pagos del mes', count: periodPayments.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeView === tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy ${
              activeView === tab.id ? 'bg-white text-studio-navy shadow-sm' : 'text-studio-navy/70 hover:text-studio-navy'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                activeView === tab.id && tab.id === 'unpaid' && tab.count > 0
                  ? 'bg-studio-red text-white'
                  : 'bg-studio-navy/10 text-studio-navy'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Unpaid students */}
      {activeView === 'unpaid' && (
        <SectionCard
          flush
          title={<span>Pendientes de cobrar en {periodLabel}</span>}
          description={
            <>
              <strong className="tabular-nums text-studio-navy">
                {periodSummary.paid} de {periodSummary.total}
              </strong>{' '}
              alumnos han pagado {periodLabel}.
            </>
          }
          actions={
            <>
              <label htmlFor="unpaid-tariff" className="sr-only">
                Filtrar por tarifa
              </label>
              <select
                id="unpaid-tariff"
                value={unpaidTariffFilter}
                onChange={(e) => setUnpaidTariffFilter(e.target.value)}
                className="min-h-12 cursor-pointer rounded-xl border border-studio-navy/15 bg-white px-3.5 text-sm font-semibold text-studio-navy focus:outline-none focus:ring-2 focus:ring-studio-navy/30"
              >
                <option value="ALL">Todas las tarifas</option>
                {activeTariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value={NO_TARIFF}>Sin tarifa</option>
              </select>
            </>
          }
        >
          <div className="space-y-3 border-b border-studio-navy/10 px-5 py-3.5">
            <div
              role="progressbar"
              aria-label="Alumnos que han pagado"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={paidPercent}
              className="h-2 overflow-hidden rounded-full bg-studio-navy/10"
            >
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
            </div>
            {paidTariffKeys.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={`Alumnos que han pagado ${periodLabel}, por tarifa`}>
                {paidTariffKeys.map((key) => (
                  <li key={key} className="rounded-full bg-studio-navy/5 px-3 py-1 text-xs font-semibold text-studio-navy">
                    {tariffName(key)}: <span className="tabular-nums">{periodSummary.paidByTariff[key]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {unpaidRows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-base font-bold text-studio-navy">
                {allUnpaidCount === 0
                  ? periodSummary.total === 0
                    ? 'Todavía no hay alumnos activos'
                    : `Todos los alumnos activos han pagado ${periodLabel}`
                  : 'Ningún alumno sin pagar con esta tarifa'}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                {allUnpaidCount === 0
                  ? periodSummary.total === 0
                    ? 'Da de alta a un alumno desde Alta de alumno para que aparezca aquí.'
                    : 'Cambia de mes arriba para revisar otros periodos.'
                  : 'Elige otra tarifa en el filtro para ver al resto.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-studio-navy/10">
              {unpaidRows.map(({ user: stu, lastPaidPeriod, tariffKey }) => {
                const fullName = [stu.firstName, stu.lastName].filter(Boolean).join(' ') || stu.alias;
                const initials = fullName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join('');
                return (
                  <li key={stu.uid} className="flex items-center gap-4 px-5 py-3.5">
                    {stu.photoUrl ? (
                      <img src={stu.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-studio-navy text-sm font-bold text-white"
                      >
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-bold text-studio-navy">{fullName}</span>
                        {stu.isFoundingMember && (
                          <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                            Socio fundador
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{stu.phone || 'Sin teléfono'}</p>
                      <p className="text-sm text-slate-600">
                        {lastPaidPeriod
                          ? `Último pago: ${lastPaidPeriod} (${tariffName(tariffKey)})`
                          : 'Sin pagos registrados'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChargeStudent(stu.uid)}
                      aria-label={`Cobrar a ${fullName}`}
                      className="flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-studio-red px-5 text-base font-bold text-white transition-colors hover:bg-studio-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy focus-visible:ring-offset-2 active:scale-[0.98]"
                    >
                      <Banknote className="h-5 w-5" aria-hidden="true" />
                      Cobrar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {/* Payments of the period */}
      {activeView === 'payments' && (
        <SectionCard
          flush
          title={<span>Pagos de {periodLabel}</span>}
          actions={
            <>
              <select
                aria-label="Filtrar por método"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as 'ALL' | PaymentMethod)}
                className="min-h-12 cursor-pointer rounded-xl border border-studio-navy/15 bg-white px-3.5 text-sm font-semibold text-studio-navy focus:outline-none focus:ring-2 focus:ring-studio-navy/30"
              >
                <option value="ALL">Todos los métodos</option>
                <option value="CASH">Metálico</option>
                <option value="BIZUM">Bizum</option>
              </select>
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
                className="min-h-12 cursor-pointer rounded-xl border border-studio-navy/15 bg-white px-3.5 text-sm font-semibold text-studio-navy focus:outline-none focus:ring-2 focus:ring-studio-navy/30"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING_APPROVAL">Pendientes de aprobar</option>
                <option value="APPROVED">Aprobados</option>
                <option value="REJECTED">Rechazados</option>
              </select>
            </>
          }
        >
          {periodPayments.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-base font-bold text-studio-navy">No hay cobros en {periodLabel}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                Cuando registres un cobro o un alumno avise de su pago, aparecerá aquí. Cambia de mes arriba para ver otros periodos.
              </p>
              <button
                type="button"
                onClick={handleOpenPosModal}
                className="mx-auto mt-5 flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-studio-red px-5 font-bold text-white hover:bg-studio-red-dark"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Registrar cobro
              </button>
            </div>
          ) : visiblePayments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm font-semibold text-slate-600">
              Ningún pago coincide con los filtros elegidos.
            </p>
          ) : (
            <ul className="divide-y divide-studio-navy/10">
              {visiblePayments.map((pay) => {
                const student = users.find((u) => u.uid === pay.uid);
                return (
                  <li key={pay.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
                    <div className="min-w-0 flex-1 basis-52">
                      <span className="block truncate text-base font-bold text-studio-navy">
                        {student?.alias || pay.uid}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
                        <span>{BILLING_LABEL[pay.billingType] ?? pay.billingType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          {pay.method === 'BIZUM' ? (
                            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {pay.method === 'BIZUM' ? 'Bizum' : 'Metálico'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{student?.phone || 'Sin teléfono'}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-headline text-2xl font-bold leading-none tabular-nums text-studio-navy">
                        {pay.amountCents ? eur(pay.amountCents) : '65,00 € (est.)'}
                      </div>
                    </div>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                        pay.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : pay.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {pay.status === 'APPROVED' ? 'Aprobado' : pay.status === 'PENDING_APPROVAL' ? 'Pendiente' : 'Rechazado'}
                    </span>

                    {pay.status === 'PENDING_APPROVAL' ? (
                      <div className="flex items-center gap-2">
                        {student?.phone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReminder(pay)}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            title="Enviar recordatorio de pago por WhatsApp"
                            aria-label="Enviar recordatorio de pago por WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApprovePayment(pay)}
                          disabled={actionLoading === pay.id}
                          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" /> Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(pay)}
                          disabled={actionLoading === pay.id}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                          title="Rechazar pago"
                          aria-label="Rechazar pago"
                        >
                          <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const payDate = (pay as any).createdAt || (pay as any).paidAt;
                          downloadReceiptPdf({
                            receiptNumber: `REC-${pay.id.substring(0, 8).toUpperCase()}`,
                            dateStr: payDate
                              ? new Date(payDate.toDate ? payDate.toDate() : payDate).toLocaleDateString('es-ES')
                              : 'Hoy',
                            timeStr: '19:30',
                            studentAlias: student?.alias || 'Atleta 247',
                            concept: pay.concept || `Cuota Mensual BJJ (${pay.period})`,
                            amountEur: (pay.amountCents || 6500) / 100,
                            paymentMethod: (pay.method as any) || 'CASH',
                            staffName: posStaffLabel,
                          });
                        }}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-studio-navy/15 bg-white px-4 text-sm font-semibold text-studio-navy hover:bg-studio-navy/5"
                        title="Descargar justificante (PDF)"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Recibo PDF
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {/* Charge modal */}
      <Dialog open={showPosModal} onOpenChange={setShowPosModal}>
        <DialogContent className="max-h-[92dvh] max-w-xl gap-0 overflow-y-auto p-0 sm:rounded-2xl">
          <DialogHeader className="bg-studio-navy px-6 py-5 pr-14 text-left">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-6 w-6 text-white" aria-hidden="true" />
              <DialogTitle className="font-headline text-2xl uppercase tracking-tight text-white">
                Registrar cobro
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-white/75">
              Elige alumno, tarifa y mes. El cobro queda aprobado al instante.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePosCharge} noValidate>
            <div className="space-y-5 px-6 py-5">
              {/* Student or walk-in */}
              <div>
                <label htmlFor="pos-student" className={labelCls}>
                  Alumno
                </label>
                <select
                  id="pos-student"
                  value={posStudentUid}
                  onChange={(e) => setPosStudentUid(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Cliente sin ficha (visita o esporádico)</option>
                  {studentOptions.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.alias} ({u.contactEmail || u.authEmail || u.phone || 'Sin contacto'})
                    </option>
                  ))}
                </select>
                {!posStudentUid && (
                  <input
                    type="text"
                    aria-label="Nombre del cliente"
                    placeholder="Nombre del cliente"
                    value={posCustomAlias}
                    onChange={(e) => setPosCustomAlias(e.target.value)}
                    className={`${fieldCls} mt-2`}
                  />
                )}
                {posStudent?.isFoundingMember && (
                  <p className="mt-1.5 text-sm font-semibold text-amber-800">
                    Socio fundador: se aplica un 10 % de descuento.
                  </p>
                )}
              </div>

              {/* Tariff */}
              <div>
                <label htmlFor="pos-tariff" className={labelCls}>
                  Tarifa
                </label>
                <select
                  id="pos-tariff"
                  value={posTariffId}
                  onChange={(e) => handleSelectPosTariff(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Concepto manual (sin tarifa)</option>
                  {activeTariffs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({eur(t.priceCents)})
                    </option>
                  ))}
                </select>
                {activeTariffs.length === 0 && (
                  <p className="mt-1.5 text-sm text-slate-700">
                    No hay tarifas activas.{' '}
                    <Link to="/admin/tarifas" className="font-bold text-studio-red underline underline-offset-2">
                      Crea o activa una en Tarifas
                    </Link>{' '}
                    o registra el cobro con un concepto manual.
                  </p>
                )}
              </div>

              {!posTariff && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pos-concept" className={labelCls}>
                      Concepto
                    </label>
                    <input
                      id="pos-concept"
                      type="text"
                      required
                      aria-invalid={posFieldErrors.concept ? true : undefined}
                      aria-describedby={posFieldErrors.concept ? 'pos-concept-error' : undefined}
                      placeholder="Ej. Kimono oficial"
                      value={posManualConcept}
                      onChange={(e) => setPosManualConcept(e.target.value)}
                      className={fieldCls}
                    />
                    {posFieldErrors.concept && (
                      <p id="pos-concept-error" role="alert" className="mt-1 text-sm font-semibold text-rose-800">
                        {posFieldErrors.concept}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="pos-billing" className={labelCls}>
                      Tipo de cobro
                    </label>
                    <select
                      id="pos-billing"
                      value={posManualBillingType}
                      onChange={(e) => setPosManualBillingType(e.target.value as BillingType)}
                      className={fieldCls}
                    >
                      <option value="MONTHLY">Cuota mensual</option>
                      <option value="PASS">Bono de sesiones</option>
                      <option value="DROP_IN">Clase suelta / otro</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Amount, period, months */}
              <div className={`grid grid-cols-1 gap-3 ${posBillingType === 'MONTHLY' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <div>
                  <label htmlFor="pos-amount" className={labelCls}>
                    Importe (€)
                  </label>
                  <input
                    id="pos-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    aria-invalid={posFieldErrors.amount ? true : undefined}
                    aria-describedby={posFieldErrors.amount ? 'pos-amount-error' : undefined}
                    value={posAmountEur}
                    onChange={(e) => setPosAmountEur(e.target.value)}
                    className={`${fieldCls} font-bold tabular-nums`}
                  />
                  {posFieldErrors.amount && (
                    <p id="pos-amount-error" role="alert" className="mt-1 text-sm font-semibold text-rose-800">
                      {posFieldErrors.amount}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="pos-period" className={labelCls}>
                    Mes que se paga
                  </label>
                  <select
                    id="pos-period"
                    value={posPeriod}
                    onChange={(e) => setPosPeriod(e.target.value)}
                    className={`${fieldCls} capitalize`}
                  >
                    {posPeriodOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {posBillingType === 'MONTHLY' && (
                  <div>
                    <label htmlFor="pos-months" className={labelCls}>
                      Meses a pagar
                    </label>
                    <div className="flex items-stretch gap-1.5">
                      <button
                        type="button"
                        aria-label="Un mes menos"
                        onClick={() => setPosMonths((m) => Math.max(1, m - 1))}
                        disabled={posMonths <= 1}
                        className="flex min-h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-studio-navy/15 bg-white text-studio-navy hover:bg-studio-navy/5 disabled:opacity-40"
                      >
                        <Minus className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <input
                        id="pos-months"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_PREPAYMENT_MONTHS}
                        step={1}
                        required
                        value={posMonths}
                        onChange={(e) =>
                          setPosMonths(Math.min(MAX_PREPAYMENT_MONTHS, Math.max(1, parseInt(e.target.value, 10) || 1)))
                        }
                        className={`${fieldCls} min-w-0 px-1 text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                      <button
                        type="button"
                        aria-label="Un mes más"
                        onClick={() => setPosMonths((m) => Math.min(MAX_PREPAYMENT_MONTHS, m + 1))}
                        disabled={posMonths >= MAX_PREPAYMENT_MONTHS}
                        className="flex min-h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-studio-navy/15 bg-white text-studio-navy hover:bg-studio-navy/5 disabled:opacity-40"
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method */}
              <fieldset>
                <legend className={labelCls}>Método de cobro</legend>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'CASH', label: 'Metálico', Icon: Banknote },
                      { id: 'BIZUM', label: 'Bizum', Icon: Smartphone },
                    ] as const
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={posMethod === id}
                      onClick={() => setPosMethod(id)}
                      className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-base font-bold transition-colors ${
                        posMethod === id
                          ? 'border-studio-navy bg-studio-navy text-white'
                          : 'border-studio-navy/15 bg-white text-studio-navy hover:bg-studio-navy/5'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoReceipt"
                  checked={posAutoDownloadReceipt}
                  onChange={(e) => setPosAutoDownloadReceipt(e.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded accent-studio-red"
                />
                <label htmlFor="autoReceipt" className="cursor-pointer text-sm font-medium text-slate-800">
                  Descargar el recibo en PDF al confirmar
                </label>
              </div>

              {posError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                  {posError}
                </p>
              )}
            </div>

            {/* Summary and actions */}
            <div className="sticky bottom-0 border-t border-studio-navy/10 bg-brand-sand-light px-6 py-4">
              {posCharge && (
                <dl className="mb-3 space-y-1 text-sm" aria-live="polite">
                  {posCharge.discountPerMonthCents > 0 && (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <dt>Precio de tarifa</dt>
                        <dd className="tabular-nums">{eur(posCharge.perMonthCents + posCharge.discountPerMonthCents)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-amber-800">
                        <dt>Descuento socio fundador (10 %)</dt>
                        <dd className="tabular-nums">-{eur(posCharge.discountPerMonthCents)}</dd>
                      </div>
                    </>
                  )}
                  {posCharge.payments.length > 1 && (
                    <div className="flex justify-between text-slate-700">
                      <dt>
                        {posCharge.payments.length} meses ({posCharge.payments[0].period} a{' '}
                        {posCharge.payments[posCharge.payments.length - 1].period})
                      </dt>
                      <dd className="tabular-nums">{eur(posCharge.perMonthCents)} / mes</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1 text-studio-navy">
                    <dt className="text-base font-bold">Total a cobrar</dt>
                    <dd className="font-headline text-3xl font-bold tabular-nums">{eur(posCharge.totalCents)}</dd>
                  </div>
                </dl>
              )}
              <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-12"
                  onClick={() => setShowPosModal(false)}
                  disabled={actionLoading === 'pos_charge'}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={actionLoading === 'pos_charge'}
                  className="min-h-12 bg-studio-red px-6 text-base font-bold text-white hover:bg-studio-red-dark"
                >
                  {actionLoading === 'pos_charge'
                    ? 'Registrando...'
                    : posCharge
                    ? `Cobrar ${eur(posCharge.totalCents)}`
                    : 'Confirmar cobro'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject payment dialog */}
      <Dialog open={!!rejectingPayment} onOpenChange={(open) => !open && setRejectingPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar notificación de pago</DialogTitle>
            <DialogDescription>
              Indica el motivo por el que no se valida este pago (el alumno verá este motivo en su panel de cuotas).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <input
              type="text"
              aria-label="Motivo del rechazo"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={fieldCls}
              placeholder="Ej. Transferencia o Bizum no reflejado en cuenta bancaria"
            />
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setRejectingPayment(null)}
              disabled={actionLoading === rejectingPayment?.id}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={handleConfirmReject}
              disabled={actionLoading === rejectingPayment?.id || !rejectReason.trim()}
            >
              {actionLoading === rejectingPayment?.id ? 'Procesando...' : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing phone dialog */}
      <Dialog open={!!phoneAlertStudent} onOpenChange={(open) => !open && setPhoneAlertStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Teléfono no registrado</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-900">{phoneAlertStudent}</strong> no tiene un número de teléfono en su ficha. No es posible abrir la conversación de WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="default" className="min-h-11" onClick={() => setPhoneAlertStudent(null)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
