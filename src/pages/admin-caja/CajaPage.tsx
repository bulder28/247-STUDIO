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
  PauseCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateVatBreakdown } from '@/shared/domain/money';
import { getMadridYearMonth } from '@/shared/domain/payment-status';
import {
  PaymentDomainModel,
  PaymentStatus,
  UserDomainModel,
} from '@/shared/domain/types';

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rejectingPayment, setRejectingPayment] = useState<PaymentDomainModel | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('No recibido en cuenta bancaria / Bizum');

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

  const pendingFreezeRequests = freezeRequests.filter((f) => f.status === 'PENDING_ADMIN');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Seguimiento Mensual y Caja</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validación 1-click de Bizum y Efectivo, arqueo fiscal con desglose de IVA y solicitudes de freeze.
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-studio-red"
          />
        </div>
      </div>

      {/* KPI Cards de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Recaudado (IVA Inc.)
          </span>
          <div className="text-2xl font-black text-white">
            {(totalRecaudadoCents / 100).toFixed(2)} €
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block mt-1">
            {approvedPayments.length} cuotas liquidadas
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Base Imponible Neta
          </span>
          <div className="text-2xl font-black text-slate-700">
            {(totalBaseCents / 100).toFixed(2)} €
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Cuota IVA deducible: {(totalVatCents / 100).toFixed(2)} €
          </span>
        </div>

        <div className="bg-white border border-amber-500/30 rounded-2xl p-5 shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Abonos Pendientes de Validar
          </span>
          <div className="text-2xl font-black text-amber-400">
            {pendingPayments.length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Requiere cotejo con Bizum / Banco
          </span>
        </div>
      </div>

      {/* Solicitudes de Suspensión Temporal (Freeze) Pendientes */}
      {pendingFreezeRequests.length > 0 && (
        <div className="bg-white border border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
            <PauseCircle className="w-4 h-4 text-studio-red" />
            <span>Solicitudes de Freeze / Baja Temporal de Alumnos ({pendingFreezeRequests.length})</span>
          </div>

          <div className="space-y-2">
            {pendingFreezeRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-extrabold text-white block">{req.alias}</span>
                  <span className="text-slate-500 block text-[11px]">
                    Motivo: {req.reason === 'INJURY' ? 'Lesión deportiva' : 'Laboral / viaje'} • {req.notes || 'Sin notas'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveFreeze(req)}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold text-xs hover:bg-emerald-500/30 transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Aprobar Freeze
                  </button>
                  <button
                    onClick={() => handleRejectFreeze(req)}
                    className="px-3 py-1.5 bg-studio-red/20 text-studio-red border border-studio-red/40 rounded-lg font-bold text-xs hover:bg-studio-red/30 transition flex items-center gap-1"
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
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Órdenes de Pago del Periodo {filterPeriod}
          </h2>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDING_APPROVAL">En Revisión (Pendientes)</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-4 px-5">Alumno</th>
                <th className="py-4 px-4">Método</th>
                <th className="py-4 px-4">Modalidad</th>
                <th className="py-4 px-4">Total / Base / IVA</th>
                <th className="py-4 px-4">Estado</th>
                <th className="py-4 px-5 text-right">Validación 1-Click</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {periodPayments
                .filter((p) => statusFilter === 'ALL' || p.status === statusFilter)
                .map((pay) => {
                  const student = users.find((u) => u.uid === pay.uid);
                  return (
                    <tr key={pay.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-4 px-5">
                        <span className="font-extrabold text-sm text-white block">
                          {student?.alias || pay.uid}
                        </span>
                        <span className="text-[11px] text-slate-400">{student?.phone}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                            pay.method === 'BIZUM'
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {pay.method}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-white uppercase text-[11px]">
                        {pay.billingType}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-black text-white text-sm">
                          {pay.amountCents ? `${(pay.amountCents / 100).toFixed(2)} €` : '65,00 € (Est.)'}
                        </div>
                        {pay.baseCents !== undefined && pay.vatCents !== undefined && (
                          <div className="text-[10px] text-slate-400">
                            Base: {(pay.baseCents / 100).toFixed(2)} € • IVA: {(pay.vatCents / 100).toFixed(2)} €
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            pay.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : pay.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-studio-red/20 text-studio-red border border-studio-red/30'
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprovePayment(pay)}
                              disabled={actionLoading === pay.id}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-studio-navy rounded-lg font-black text-xs uppercase tracking-wider transition shadow flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(pay)}
                              disabled={actionLoading === pay.id}
                              className="px-2.5 py-1.5 bg-studio-red/10 hover:bg-studio-red/20 text-studio-red border border-studio-red/30 rounded-lg font-bold text-xs transition"
                              title="Rechazar pago"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Validado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación de rechazo */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-display text-2xl text-slate-900">Rechazar Pago</h3>
            <p className="mt-2 text-xs text-slate-600">
              Indica el motivo por el cual no se valida este pago (el alumno verá este motivo en su panel):
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-4 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
              placeholder="Ej. Transferencia no reflejada en cuenta"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectingPayment.id || !rejectReason.trim()}
                className="px-4 py-2 bg-studio-red hover:bg-studio-red-dark text-white rounded-xl text-xs font-bold disabled:opacity-50"
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
