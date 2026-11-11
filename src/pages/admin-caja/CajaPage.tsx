import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Check,
  Clock,
  Download,
  MessageCircle,
  PauseCircle,
  PlusCircle,
  Receipt,
  Smartphone,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { getLiveDocs } from '@/shared/api/liveReads';
import { buildChargePayments, MAX_PREPAYMENT_MONTHS } from '@/shared/domain/billing';
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
  const [mobileSection, setMobileSection] = useState<'resumen' | 'cobros' | 'pausas'>('resumen');

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
    if (!user || !posCharge) return;
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

  // Filtrado por periodo
  const periodPayments = payments.filter((p) => p.period === filterPeriod);
  const approvedPayments = periodPayments.filter((p) => p.status === 'APPROVED');
  const pendingPayments = periodPayments.filter((p) => p.status === 'PENDING_APPROVAL');

  // Cálculos agregados de caja
  const totalRecaudadoCents = approvedPayments.reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalBaseCents = approvedPayments.reduce((acc, p) => acc + (p.baseCents || 0), 0);
  const totalVatCents = approvedPayments.reduce((acc, p) => acc + (p.vatCents || 0), 0);
  const totalCashCents = approvedPayments
    .filter((p) => p.method === 'CASH')
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalBizumCents = approvedPayments
    .filter((p) => p.method === 'BIZUM')
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);

  const pendingFreezeRequests = freezeRequests.filter((f) => f.status === 'PENDING_ADMIN');

  return (
    <div className="space-y-3 md:space-y-6 pb-2 md:pb-12 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Seguimiento Mensual y Caja
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Arqueo diario, TPV mostrador, validación 1-click de Bizum/Metálico y exportación contable con IVA 21%.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Selector de periodo */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-3 py-1.5 shadow-subtle">
            <Clock className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Exportar CSV Gestoría */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportPaymentsToGestoriaCsv(periodPayments, users, filterPeriod)}
            className="shadow-2xs"
            title="Exportar archivo CSV con Base e IVA 21% listo para la Gestoría contable"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 mr-1.5" />
            <span>CSV Gestoría</span>
          </Button>

          {/* Botón Cobro Directo TPV / PushPress POS */}
          <Button
            type="button"
            variant="studio"
            size="sm"
            onClick={handleOpenPosModal}
            className="shadow-card"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Registrar cobro</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
          {loadError}
        </p>
      )}

      {/* Selector de sub-pestañas móvil sin scroll vertical */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileSection('resumen')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'resumen' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          📊 Resumen
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('cobros')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'cobros' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          💳 Cobros ({periodPayments.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('pausas')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'pausas' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          ❄️ Pausas ({pendingFreezeRequests.length})
        </button>
      </div>

      {/* KPI Cards de Caja */}
      <div
        className={`${
          mobileSection === 'resumen' ? 'grid' : 'hidden md:grid'
        } grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4`}
      >
        <div className="bg-gradient-to-br from-white via-white to-slate-50/50 border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Recaudado (IVA Inc.)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {(totalRecaudadoCents / 100).toFixed(2)} €
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
            {approvedPayments.length} cuotas liquidadas
          </span>
        </div>

        <div className="bg-gradient-to-br from-white via-white to-slate-50/50 border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Base Imponible Neta
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {(totalBaseCents / 100).toFixed(2)} €
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            IVA repercutido (21%): {(totalVatCents / 100).toFixed(2)} €
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
            Abonos Pendientes de Validar
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-800 font-mono tracking-tight">
            {pendingPayments.length}
          </div>
          <span className="text-[11px] text-amber-700/80 font-medium block mt-1">
            Requiere cotejo con Bizum o Metálico
          </span>
        </div>
      </div>

      {/* Arqueo de Canales: Efectivo en Cajón vs Bizum / Banco */}
      <div
        className={`${
          mobileSection === 'resumen' ? 'grid' : 'hidden md:grid'
        } grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`}
      >
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
              💵 Metálico en Cajón de Recepción
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-0.5">
              {(totalCashCents / 100).toFixed(2)} €
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Dinero físico en caja para cuadre al cierre
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
              📱 Ingresos Directos Bizum / Cuenta
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono mt-0.5">
              {(totalBizumCents / 100).toFixed(2)} €
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Transferencias electrónicas verificadas
            </span>
          </div>
        </div>
      </div>

      {/* Solicitudes de Suspensión Temporal (Freeze) Pendientes */}
      {(pendingFreezeRequests.length > 0 || mobileSection === 'pausas') && (
        <div
          className={`${
            mobileSection === 'pausas' ? 'block' : pendingFreezeRequests.length > 0 ? 'hidden md:block' : 'hidden'
          } bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3`}
        >
          <div className="flex items-center gap-2 text-amber-800 pb-2 border-b border-amber-100">
            <PauseCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Solicitudes de Pausa / Freeze ({pendingFreezeRequests.length})
            </h3>
          </div>

          {pendingFreezeRequests.length === 0 ? (
            <p className="text-xs text-slate-500">No hay solicitudes de pausa pendientes en este momento.</p>
          ) : (
            <div className="space-y-2">
              {pendingFreezeRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 block">{req.alias}</span>
                    <span className="text-slate-600 block text-[11px] mt-0.5">
                      Motivo: {req.reason === 'INJURY' ? 'Lesión deportiva' : 'Laboral / viaje'} • {req.notes || 'Sin notas adicionales'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveFreeze(req)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar Freeze
                    </button>
                    <button
                      onClick={() => handleRejectFreeze(req)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabla de Cobros y Liquidaciones */}
      <div
        className={`${
          mobileSection === 'cobros' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm`}
      >
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Órdenes de Pago del Periodo {filterPeriod}
          </h2>

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Métodos</option>
              <option value="CASH">Metálico</option>
              <option value="BIZUM">Bizum</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING_APPROVAL">En Revisión (Pendientes)</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-5">Alumno</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Modalidad</th>
                <th className="py-3.5 px-4">Total / Base / IVA</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-5 text-right">Validación & Recibos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodPayments
                .filter(
                  (p) =>
                    (statusFilter === 'ALL' || p.status === statusFilter) &&
                    (methodFilter === 'ALL' || p.method === methodFilter)
                )
                .map((pay) => {
                  const student = users.find((u) => u.uid === pay.uid);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-5">
                        <span className="font-extrabold text-sm text-slate-900 block">
                          {student?.alias || pay.uid}
                        </span>
                        <span className="text-[11px] text-slate-500">{student?.phone || 'Sin teléfono'}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            pay.method === 'BIZUM'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {pay.method}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-700 uppercase text-[11px]">
                        {pay.billingType}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 font-mono text-sm">
                          {pay.amountCents ? `${(pay.amountCents / 100).toFixed(2)} €` : '65,00 € (Est.)'}
                        </div>
                        {pay.baseCents !== undefined && pay.vatCents !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Base: {(pay.baseCents / 100).toFixed(2)} € • IVA: {(pay.vatCents / 100).toFixed(2)} €
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                            pay.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : pay.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {pay.status === 'APPROVED'
                            ? 'Aprobado'
                            : pay.status === 'PENDING_APPROVAL'
                            ? 'Pendiente'
                            : 'Rechazado'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        {pay.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {student?.phone && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(pay)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                title="Enviar recordatorio amistoso de pago por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleApprovePayment(pay)}
                              disabled={actionLoading === pay.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(pay)}
                              disabled={actionLoading === pay.id}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition cursor-pointer"
                              title="Rechazar pago"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] text-emerald-600 font-bold">Validado</span>
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
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-200 cursor-pointer"
                              title="Descargar Justificante Oficial (PDF)"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-600" />
                              <span>Recibo PDF</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {periodPayments.length === 0 && (
            <div className="py-12 px-5 text-center">
              <p className="text-sm font-bold text-slate-900">No hay cobros en {filterPeriod}</p>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Cuando registres un cobro o un alumno avise de su pago, aparecerá aquí. Cambia de mes arriba para ver otros periodos.
              </p>
              <Button type="button" variant="studio" size="sm" onClick={handleOpenPosModal} className="mt-4">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>Registrar cobro</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Counter charge modal (Radix Dialog) */}
      <Dialog open={showPosModal} onOpenChange={setShowPosModal}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-accent" />
              <DialogTitle>Registrar cobro</DialogTitle>
            </div>
            <DialogDescription>
              Elige alumno, tarifa y mes. El cobro queda aprobado al instante.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePosCharge} className="space-y-4 pt-1">
            {/* Student or walk-in */}
            <div>
              <label htmlFor="pos-student" className="block text-xs font-bold text-slate-700 mb-1">
                Alumno
              </label>
              <select
                id="pos-student"
                value={posStudentUid}
                onChange={(e) => setPosStudentUid(e.target.value)}
                className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-accent"
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
                  className="w-full mt-2 min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-accent"
                />
              )}
              {posStudent?.isFoundingMember && (
                <p className="mt-1.5 text-xs font-semibold text-amber-800">
                  Socio fundador: se aplica un 10 % de descuento.
                </p>
              )}
            </div>

            {/* Tariff */}
            <div>
              <label htmlFor="pos-tariff" className="block text-xs font-bold text-slate-700 mb-1">
                Tarifa
              </label>
              <select
                id="pos-tariff"
                value={posTariffId}
                onChange={(e) => handleSelectPosTariff(e.target.value)}
                className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-accent"
              >
                <option value="">Concepto manual (sin tarifa)</option>
                {activeTariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(t.priceCents / 100).toFixed(2)} €)
                  </option>
                ))}
              </select>
              {activeTariffs.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-700">
                  No hay tarifas activas.{' '}
                  <Link to="/admin/tarifas" className="font-bold text-brand-accent underline underline-offset-2">
                    Crea o activa una en Tarifas
                  </Link>{' '}
                  o registra el cobro con un concepto manual.
                </p>
              )}
            </div>

            {!posTariff && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pos-concept" className="block text-xs font-bold text-slate-700 mb-1">
                    Concepto
                  </label>
                  <input
                    id="pos-concept"
                    type="text"
                    required
                    placeholder="Ej. Kimono oficial"
                    value={posManualConcept}
                    onChange={(e) => setPosManualConcept(e.target.value)}
                    className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="pos-billing" className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de cobro
                  </label>
                  <select
                    id="pos-billing"
                    value={posManualBillingType}
                    onChange={(e) => setPosManualBillingType(e.target.value as BillingType)}
                    className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-accent"
                  >
                    <option value="MONTHLY">Cuota mensual</option>
                    <option value="PASS">Bono de sesiones</option>
                    <option value="DROP_IN">Clase suelta / otro</option>
                  </select>
                </div>
              </div>
            )}

            {/* Amount, period, months */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pos-amount" className="block text-xs font-bold text-slate-700 mb-1">
                  Importe (€, IVA incl.)
                </label>
                <input
                  id="pos-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={posAmountEur}
                  onChange={(e) => setPosAmountEur(e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label htmlFor="pos-period" className="block text-xs font-bold text-slate-700 mb-1">
                  Mes que se paga
                </label>
                <input
                  id="pos-period"
                  type="month"
                  required
                  value={posPeriod}
                  onChange={(e) => setPosPeriod(e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-accent"
                />
              </div>
              {posBillingType === 'MONTHLY' && (
                <div>
                  <label htmlFor="pos-months" className="block text-xs font-bold text-slate-700 mb-1">
                    Meses a pagar
                  </label>
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
                    className="w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-brand-accent"
                  />
                </div>
              )}
            </div>

            {/* Payment method */}
            <fieldset>
              <legend className="block text-xs font-bold text-slate-700 mb-1">Método de cobro</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={posMethod === 'CASH'}
                  onClick={() => setPosMethod('CASH')}
                  className={`min-h-11 py-2 px-3 rounded-xl border text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    posMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" aria-hidden="true" /> Metálico
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={posMethod === 'BIZUM'}
                  onClick={() => setPosMethod('BIZUM')}
                  className={`min-h-11 py-2 px-3 rounded-xl border text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    posMethod === 'BIZUM'
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" aria-hidden="true" /> Bizum
                </button>
              </div>
            </fieldset>

            {/* Summary */}
            {posCharge && (
              <dl className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-sm space-y-1" aria-live="polite">
                {posCharge.discountPerMonthCents > 0 && (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <dt>Precio de tarifa</dt>
                      <dd className="tabular-nums">
                        {((posCharge.perMonthCents + posCharge.discountPerMonthCents) / 100).toFixed(2)} €
                      </dd>
                    </div>
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <dt>Descuento socio fundador (10 %)</dt>
                      <dd className="tabular-nums">-{(posCharge.discountPerMonthCents / 100).toFixed(2)} €</dd>
                    </div>
                  </>
                )}
                {posCharge.payments.length > 1 && (
                  <div className="flex justify-between text-slate-700">
                    <dt>
                      {posCharge.payments.length} meses ({posCharge.payments[0].period} a{' '}
                      {posCharge.payments[posCharge.payments.length - 1].period})
                    </dt>
                    <dd className="tabular-nums">{(posCharge.perMonthCents / 100).toFixed(2)} € / mes</dd>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-black text-base pt-1 border-t border-slate-200">
                  <dt>Total a cobrar</dt>
                  <dd className="tabular-nums">{(posCharge.totalCents / 100).toFixed(2)} €</dd>
                </div>
              </dl>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoReceipt"
                checked={posAutoDownloadReceipt}
                onChange={(e) => setPosAutoDownloadReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent cursor-pointer"
              />
              <label htmlFor="autoReceipt" className="text-sm font-medium text-slate-700 cursor-pointer">
                Descargar el recibo en PDF al confirmar
              </label>
            </div>

            {posError && (
              <p role="alert" className="text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {posError}
              </p>
            )}

            <DialogFooter className="pt-3 border-t border-slate-100 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPosModal(false)}
                disabled={actionLoading === 'pos_charge'}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={actionLoading === 'pos_charge' || !posCharge}
                className="bg-brand-accent hover:bg-brand-accent/90 text-white font-black"
              >
                {actionLoading === 'pos_charge' ? 'Registrando...' : 'Confirmar cobro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Radix Dialog: Confirmación de Rechazo de Pago */}
      <Dialog open={!!rejectingPayment} onOpenChange={(open) => !open && setRejectingPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Notificación de Pago</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual no se valida este abono (el alumno verá este motivo en su panel de cuotas).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
              placeholder="Ej. Transferencia o Bizum no reflejado en cuenta bancaria"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectingPayment(null)}
              disabled={actionLoading === rejectingPayment?.id}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={actionLoading === rejectingPayment?.id || !rejectReason.trim()}
            >
              {actionLoading === rejectingPayment?.id ? 'Procesando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Radix Dialog: Teléfono No Registrado (sustituye alert) */}
      <Dialog open={!!phoneAlertStudent} onOpenChange={(open) => !open && setPhoneAlertStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Teléfono No Registrado</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-900">{phoneAlertStudent}</strong> no tiene un número de teléfono registrado en su ficha de usuario. No es posible abrir la conversación de WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="default" onClick={() => setPhoneAlertStudent(null)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
