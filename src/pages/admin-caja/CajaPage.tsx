import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Check,
  Clock,
  Download,
  MessageCircle,
  PauseCircle,
  PlusCircle,
  Receipt,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { getMadridYearMonth } from '@/shared/domain/payment-status';
import { downloadReceiptPdf } from '@/shared/utils/receiptGenerator';
import { exportPaymentsToGestoriaCsv } from '@/shared/utils/csvExporter';
import {
  PaymentDomainModel,
  PaymentMethod,
  PaymentStatus,
  UserDomainModel,
} from '@/shared/domain/types';
import { Button } from '@/shared/ui/button';

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

  // PushPress / Mindbody POS State: Cobro Directo en Mostrador / TPV
  const [showPosModal, setShowPosModal] = useState(false);
  const [posStudentUid, setPosStudentUid] = useState<string>('');
  const [posCustomAlias, setPosCustomAlias] = useState<string>('');
  const [posConcept, setPosConcept] = useState<string>('Cuota BJJ Adultos Ilimitado');
  const [posAmountEur, setPosAmountEur] = useState<number>(75);
  const [posMethod, setPosMethod] = useState<PaymentMethod>('CASH');
  const [posBillingType, setPosBillingType] = useState<'MONTHLY' | 'PASS' | 'DROP_IN'>('MONTHLY');
  const [posAutoDownloadReceipt, setPosAutoDownloadReceipt] = useState<boolean>(true);

  const fetchCajaData = async () => {
    try {
      // 1. Pagos
      const paySnap = await getDocs(collection(db, 'payments'));
      const pList: PaymentDomainModel[] = [];
      paySnap.forEach((d) => pList.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));
      setPayments(pList);

      // 2. Usuarios
      const uSnap = await getDocs(collection(db, 'users'));
      const uList: UserDomainModel[] = [];
      uSnap.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      setUsers(uList);

      // 3. Solicitudes de Freeze
      const frSnap = await getDocs(collection(db, 'freezeRequests'));
      const frList: FreezeRequest[] = [];
      frSnap.forEach((d) => frList.push({ id: d.id, ...(d.data() as Omit<FreezeRequest, 'id'>) }));
      setFreezeRequests(frList);
    } catch (err) {
      console.error('Error fetching caja data:', err);
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
          amountCents = 10000; // 100,00 € bono 10 sesiones
        } else if (payment.billingType === 'DROP_IN') {
          amountCents = 1500; // 15,00 € clase suelta
        } else {
          // Tarifa mensual según pricingTier del alumno
          if (student?.pricingTier === 'SF') {
            amountCents = 6000; // 60,00 € Fuerzas y Cuerpos de Seguridad / Bomberos
          } else if (student?.pricingTier === 'FAM') {
            amountCents = 5500; // 55,00 € Tarifa Familiar / Pareja
          } else if (student?.activeTariffId === 'tariff-ilimitada') {
            amountCents = 8500; // 85,00 € Tarifa plana ilimitada
          } else {
            amountCents = 6500; // 65,00 € Tarifa estándar 2 días/sem
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
      }

      await updateDoc(doc(db, 'payments', payment.id), updateData);
      await fetchCajaData();
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
      setRejectingPayment(null);
      await fetchCajaData();
    } catch (err) {
      console.error('Error rejecting payment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePosCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading('pos_charge');

    try {
      const amountCents = Math.round(Number(posAmountEur) * 100);
      const vat = calculateVatBreakdown(amountCents, 0.21);
      const paymentId = `pos_${Date.now()}`;
      const chosenStudent = users.find((u) => u.uid === posStudentUid);
      const effectiveAlias = chosenStudent?.alias || posCustomAlias.trim() || 'Atleta Walk-in';
      const effectiveUid = posStudentUid || `walkin_${Date.now()}`;

      const newPaymentData: Record<string, any> = {
        uid: effectiveUid,
        period: filterPeriod,
        method: posMethod,
        billingType: posBillingType,
        amountCents: vat.totalCents,
        baseCents: vat.baseCents,
        vatCents: vat.vatCents,
        status: 'APPROVED',
        concept: posConcept,
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        validatedBy: user.uid,
        validatedAt: serverTimestamp(),
        notes: `Cobro TPV Mostrador por Mario/David`,
      };

      if (posBillingType === 'PASS') {
        newPaymentData.sessionsIncluded = 10;
        newPaymentData.sessionsRemaining = 10;
      }

      await setDoc(doc(db, 'payments', paymentId), newPaymentData);

      if (posAutoDownloadReceipt) {
        downloadReceiptPdf({
          receiptNumber: `REC-POS-${paymentId.slice(-6).toUpperCase()}`,
          dateStr: new Date().toLocaleDateString('es-ES'),
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          studentAlias: effectiveAlias,
          concept: `${posConcept} (${filterPeriod})`,
          amountEur: posAmountEur,
          paymentMethod: posMethod,
          staffName: 'Mario / David (247Studio Staff)',
        });
      }

      setShowPosModal(false);
      setPosStudentUid('');
      setPosCustomAlias('');
      await fetchCajaData();
    } catch (err) {
      console.error('Error creating POS charge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWhatsAppReminder = (payment: PaymentDomainModel) => {
    const student = users.find((u) => u.uid === payment.uid);
    if (!student?.phone) {
      alert('Este alumno no tiene número de teléfono registrado.');
      return;
    }
    const cleanPhone = student.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`;
    const amountStr = payment.amountCents ? (payment.amountCents / 100).toFixed(2) : '65.00';
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

      await fetchCajaData();
    } catch (err) {
      console.error('Error approving freeze:', err);
    }
  };

  const handleRejectFreeze = async (req: FreezeRequest) => {
    try {
      await updateDoc(doc(db, 'freezeRequests', req.id), {
        status: 'REJECTED',
      });
      await fetchCajaData();
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Seguimiento Mensual y Caja
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Arqueo diario, TPV mostrador, validación 1-click de Bizum/Efectivo y exportación contable con IVA 21%.
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
            onClick={() => setShowPosModal(true)}
            className="shadow-card"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>+ Cobro Directo TPV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white via-white to-slate-50/50 border border-slate-200/80 rounded-3xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Recaudado (IVA Inc.)
          </span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {(totalRecaudadoCents / 100).toFixed(2)} €
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
            {approvedPayments.length} cuotas liquidadas
          </span>
        </div>

        <div className="bg-gradient-to-br from-white via-white to-slate-50/50 border border-slate-200/80 rounded-3xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Base Imponible Neta
          </span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {(totalBaseCents / 100).toFixed(2)} €
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            IVA repercutido (21%): {(totalVatCents / 100).toFixed(2)} €
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 border border-amber-200 rounded-3xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
            Abonos Pendientes de Validar
          </span>
          <div className="text-3xl font-extrabold text-amber-800 font-mono tracking-tight">
            {pendingPayments.length}
          </div>
          <span className="text-[11px] text-amber-700/80 font-medium block mt-1">
            Requiere cotejo con Bizum o Efectivo
          </span>
        </div>
      </div>

      {/* Arqueo de Canales: Efectivo en Cajón vs Bizum / Banco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
              💵 Efectivo en Cajón de Recepción
            </span>
            <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
              {(totalCashCents / 100).toFixed(2)} €
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Dinero físico en caja para cuadre al cierre
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
              📱 Ingresos Directos Bizum / Cuenta
            </span>
            <div className="text-2xl font-black text-blue-950 font-mono mt-0.5">
              {(totalBizumCents / 100).toFixed(2)} €
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Transferencias electrónicas verificadas
            </span>
          </div>
        </div>
      </div>

      {/* Solicitudes de Suspensión Temporal (Freeze) Pendientes */}
      {pendingFreezeRequests.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-800 pb-2 border-b border-amber-100">
            <PauseCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Solicitudes de Pausa / Freeze ({pendingFreezeRequests.length})
            </h3>
          </div>

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
        </div>
      )}

      {/* Tabla de Cobros y Liquidaciones */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
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
              <option value="CASH">Efectivo</option>
              <option value="BIZUM">Bizum</option>
              <option value="CARD">Tarjeta (TPV)</option>
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
                              : pay.method === 'CARD'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
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
                                  paymentMethod: (pay.method as any) || 'CARD',
                                  staffName: 'Mario / David',
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
        </div>
      </div>

      {/* PushPress / Mindbody TPV POS: Modal Cobro Directo en Mostrador */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-studio-red" />
                <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  Cobro Directo Mostrador / TPV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePosCharge} className="space-y-4">
              {/* Selección Alumno o Walk-In */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Alumno o Cliente Walk-In
                </label>
                <select
                  value={posStudentUid}
                  onChange={(e) => setPosStudentUid(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-studio-red"
                >
                  <option value="">-- Cliente Walk-In / Nuevo / Esporádico --</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.alias} ({u.contactEmail || u.authEmail || u.phone || 'Sin contacto'})
                    </option>
                  ))}
                </select>
                {!posStudentUid && (
                  <input
                    type="text"
                    placeholder="Nombre o alias del cliente walk-in..."
                    value={posCustomAlias}
                    onChange={(e) => setPosCustomAlias(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-studio-red"
                  />
                )}
              </div>

              {/* Concepto y Tipo de Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Concepto / Producto
                  </label>
                  <select
                    value={posConcept}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPosConcept(val);
                      if (val.includes('75')) { setPosAmountEur(75); setPosBillingType('MONTHLY'); }
                      else if (val.includes('60')) { setPosAmountEur(60); setPosBillingType('MONTHLY'); }
                      else if (val.includes('55')) { setPosAmountEur(55); setPosBillingType('MONTHLY'); }
                      else if (val.includes('110')) { setPosAmountEur(110); setPosBillingType('PASS'); }
                      else if (val.includes('50')) { setPosAmountEur(50); setPosBillingType('MONTHLY'); }
                      else if (val.includes('15')) { setPosAmountEur(15); setPosBillingType('DROP_IN'); }
                      else if (val.includes('95')) { setPosAmountEur(95); setPosBillingType('DROP_IN'); }
                      else if (val.includes('45')) { setPosAmountEur(45); setPosBillingType('DROP_IN'); }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="Cuota BJJ Adultos Ilimitado (75 €)">Cuota Adultos Ilimitado (75 €)</option>
                    <option value="Cuota Socio Fundador / SF (60 €)">Socio Fundador / Policía (60 €)</option>
                    <option value="Cuota Familiar / Pareja (55 €)">Tarifa Familiar (55 €)</option>
                    <option value="Bono 10 Sesiones Tatami Pass (110 €)">Bono 10 Sesiones (110 €)</option>
                    <option value="Cuota BJJ Kids & Teens (50 €)">Cuota Infantil / Kids (50 €)</option>
                    <option value="Clase Suelta / Drop-In (15 €)">Clase Suelta / Drop-In (15 €)</option>
                    <option value="Kimono / Gi Oficial 247Studio (95 €)">Kimono Oficial 247 (95 €)</option>
                    <option value="Rashguard No-Gi Oficial 247Studio (45 €)">Rashguard No-Gi (45 €)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Importe Final (€ IVA Inc.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={posAmountEur}
                    onChange={(e) => setPosAmountEur(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Método de Cobro
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosMethod('CASH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                      posMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosMethod('BIZUM')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                      posMethod === 'BIZUM'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📱 Bizum
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosMethod('CARD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                      posMethod === 'CARD'
                        ? 'bg-purple-50 border-purple-300 text-purple-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    💳 Tarjeta TPV
                  </button>
                </div>
              </div>

              {/* Checkbox auto-descargar recibo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoReceipt"
                  checked={posAutoDownloadReceipt}
                  onChange={(e) => setPosAutoDownloadReceipt(e.target.checked)}
                  className="rounded text-studio-red focus:ring-studio-red cursor-pointer"
                />
                <label htmlFor="autoReceipt" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Descargar justificante oficial en PDF al confirmar el cobro
                </label>
              </div>

              {/* Acciones */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'pos_charge'}
                  className="px-5 py-2 bg-studio-red hover:bg-studio-red-dark text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === 'pos_charge' ? 'Registrando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de rechazo */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Rechazar Notificación de Pago</h3>
            <p className="text-xs text-slate-600">
              Indica el motivo por el cual no se valida este abono (el alumno verá este motivo en su panel):
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
              placeholder="Ej. Transferencia o Bizum no reflejado en cuenta bancaria"
            />
            <div className="mt-4 flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectingPayment.id || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
