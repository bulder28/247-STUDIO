import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Star,
  UserMinus,
} from 'lucide-react';
import { auth, db } from '@/shared/api/firebase';
import { invalidateLiveDocs } from '@/shared/api/liveReads';
import { deriveRetentionRisk } from '@/shared/domain/attendance';
import {
  BELT_DISCIPLINES,
  DISCIPLINES,
  DisciplineId,
  disciplineForProgram,
  disciplineHasBelt,
  getDiscipline,
} from '@/shared/domain/disciplines';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';
import { SAMPLE_ATHLETES_20 } from '@/shared/mock/sampleAthletes';
import {
  AdultBelt,
  Belt,
  BookingDomainModel,
  KidsBelt,
  PaymentDomainModel,
  PricingTier,
  RetentionRisk,
  ScheduleDomainModel,
  UserDomainModel,
} from '@/shared/domain/types';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
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
import { exportStudentsToCsv } from '@/shared/utils/csvExporter';
import { PhotoUploaderModal } from '@/widgets/PhotoUploaderModal';

// --- Belt constants ---
const ADULT_BELTS: { value: AdultBelt; label: string; bg: string }[] = [
  { value: 'WHITE', label: 'Blanco', bg: 'bg-white border border-slate-400' },
  { value: 'BLUE', label: 'Azul', bg: 'bg-blue-600' },
  { value: 'PURPLE', label: 'Morado', bg: 'bg-purple-700' },
  { value: 'BROWN', label: 'Marrón', bg: 'bg-amber-900' },
  { value: 'BLACK', label: 'Negro', bg: 'bg-slate-950' },
];

const KIDS_BELTS: { value: KidsBelt; label: string; bg: string }[] = [
  { value: 'WHITE', label: 'Blanco', bg: 'bg-white border border-slate-400' },
  { value: 'GREY_WHITE', label: 'Gris / Blanco', bg: 'bg-slate-300' },
  { value: 'GREY', label: 'Gris', bg: 'bg-slate-400' },
  { value: 'GREY_BLACK', label: 'Gris / Negro', bg: 'bg-slate-500' },
  { value: 'YELLOW_WHITE', label: 'Amarillo / Blanco', bg: 'bg-yellow-200' },
  { value: 'YELLOW', label: 'Amarillo', bg: 'bg-yellow-400' },
  { value: 'YELLOW_BLACK', label: 'Amarillo / Negro', bg: 'bg-yellow-500' },
  { value: 'ORANGE_WHITE', label: 'Naranja / Blanco', bg: 'bg-orange-200' },
  { value: 'ORANGE', label: 'Naranja', bg: 'bg-orange-400' },
  { value: 'ORANGE_BLACK', label: 'Naranja / Negro', bg: 'bg-orange-500' },
  { value: 'GREEN_WHITE', label: 'Verde / Blanco', bg: 'bg-emerald-200' },
  { value: 'GREEN', label: 'Verde', bg: 'bg-emerald-500' },
  { value: 'GREEN_BLACK', label: 'Verde / Negro', bg: 'bg-emerald-600' },
];

const TIER_PRICES: Record<PricingTier, { name: string; price: string }> = {
  STD: { name: 'Estándar (3 días)', price: '65 €' },
  SF: { name: 'Sin Fin (Ilimitado)', price: '85 €' },
  FAM: { name: 'Familiar', price: '55 €' },
};

const findBelt = (belt: Belt) =>
  [...ADULT_BELTS, ...KIDS_BELTS].find((b) => b.value === belt);

/** Full name when first/last name exist, otherwise the alias. */
const displayName = (u: UserDomainModel) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.alias;

const stripesLabel = (n: number) => `${n} ${n === 1 ? 'raya' : 'rayas'}`;

// --- Shared class strings (match Caja) ---
const btnSecondary =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-studio-navy/15 bg-white px-4 text-sm font-semibold text-studio-navy transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy disabled:opacity-50';
const btnPrimary =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-studio-red px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-studio-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50';
const btnQuiet =
  'flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-studio-navy/15 bg-white px-3.5 text-sm font-semibold text-studio-navy transition-colors hover:bg-studio-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy disabled:opacity-50';
const selectCls =
  'min-h-12 cursor-pointer rounded-xl border border-studio-navy/15 bg-white px-3.5 text-sm font-semibold text-studio-navy focus:outline-none focus:ring-2 focus:ring-studio-navy/30';

type Tone = 'ok' | 'pending' | 'info' | 'error';
const chipTone: Record<Tone, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  pending: 'border-amber-300 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

const STATUS_CHIP: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Al día', tone: 'ok' },
  FROZEN: { label: 'En pausa', tone: 'pending' },
  PAUSED: { label: 'En pausa', tone: 'pending' },
  TRIAL: { label: 'Clase de prueba', tone: 'info' },
  PENDING: { label: 'Alta pendiente', tone: 'pending' },
  INACTIVE: { label: 'Baja', tone: 'error' },
  SUSPENDED: { label: 'Suspendido', tone: 'error' },
};

const Chip: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      chipTone[tone]
    )}
  >
    {children}
  </span>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_CHIP[status] ?? { label: status, tone: 'info' as Tone };
  return <Chip tone={s.tone}>{s.label}</Chip>;
};

const BeltChip: React.FC<{ belt: Belt; stripes: number }> = ({ belt, stripes }) => {
  const b = findBelt(belt);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-studio-navy/5 px-2.5 py-1 text-xs font-semibold text-studio-navy">
      <span className={cn('inline-block h-2.5 w-6 rounded-sm', b?.bg ?? 'bg-slate-300')} aria-hidden="true" />
      <span>{b?.label ?? belt}</span>
      {stripes > 0 && <span className="tabular-nums text-slate-600">{stripesLabel(stripes)}</span>}
    </span>
  );
};

const FILTER_ALL = 'ALL';
type DisciplineFilter = typeof FILTER_ALL | DisciplineId;
type StatusView = 'ACTIVOS' | 'INTERESADOS' | 'BAJAS';
type FichaTab = 'resumen' | 'datos' | 'cinturon' | 'pagos' | 'asistencia';

export const PersonalPage: React.FC = () => {
  // Data
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [payments, setPayments] = useState<PaymentDomainModel[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>(DEFAULT_OFFICIAL_SCHEDULES);
  const [loading, setLoading] = useState(true);

  // Filters
  const [view, setView] = useState<StatusView>('ACTIVOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<DisciplineFilter>(FILTER_ALL);
  const [beltFilter, setBeltFilter] = useState<string>(FILTER_ALL);

  // Selected student (ficha)
  const [selectedUser, setSelectedUser] = useState<UserDomainModel | null>(null);
  const [activeTab, setActiveTab] = useState<FichaTab>('resumen');

  const [datosForm, setDatosForm] = useState({
    alias: '',
    contactEmail: '',
    phone: '',
    birthDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  const [beltForm, setBeltForm] = useState<{ belt: Belt; stripes: number }>({
    belt: 'WHITE',
    stripes: 0,
  });

  const [tierForm, setTierForm] = useState<PricingTier>('STD');

  // Dialogs
  const [altaModalOpen, setAltaModalOpen] = useState(false);
  const [altaForm, setAltaForm] = useState({
    alias: '',
    email: '',
    phone: '',
    birthDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    belt: 'WHITE' as Belt,
    stripes: 0,
    pricingTier: 'STD' as PricingTier,
    notes: '',
  });

  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('Lesión deportiva');
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [quickPaymentForm, setQuickPaymentForm] = useState({
    amount: '65',
    method: 'BIZUM' as 'BIZUM' | 'CASH',
    concept: 'Cuota mensual tatami',
  });
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const now = new Date();

  // Load users, recent bookings (60 days), payments and schedules
  const fetchData = async () => {
    try {
      setLoading(true);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const minDateStr = sixtyDaysAgo.toISOString().slice(0, 10);

      const [usersRes, bookingsRes, paymentsRes, schedulesRes] = await Promise.allSettled([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'bookings'), where('date', '>=', minDateStr))),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'schedules')),
      ]);

      const uList: UserDomainModel[] = [];
      if (usersRes.status === 'fulfilled') {
        usersRes.value.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      }
      const effectiveUsers = uList.length > 0 ? uList : SAMPLE_ATHLETES_20;
      setUsers(effectiveUsers);

      const bList: BookingDomainModel[] = [];
      if (bookingsRes.status === 'fulfilled') {
        // Only ATTENDED rows count: legacy reservation-era statuses must not inflate attendance
        bookingsRes.value.forEach((d) => {
          const data = d.data() as Omit<BookingDomainModel, 'id'>;
          if (data.status === 'ATTENDED') bList.push({ id: d.id, ...data });
        });
      }
      setBookings(bList);

      const pList: PaymentDomainModel[] = [];
      if (paymentsRes.status === 'fulfilled') {
        paymentsRes.value.forEach((d) => pList.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));
      }
      setPayments(pList);

      if (schedulesRes.status === 'fulfilled' && !schedulesRes.value.empty) {
        const sList: ScheduleDomainModel[] = [];
        schedulesRes.value.forEach((d) =>
          sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) })
        );
        setSchedules(sList);
      }

      // Refresh the open ficha with the reloaded user
      if (selectedUser) {
        const refreshed = effectiveUsers.find((u) => u.uid === selectedUser.uid);
        if (refreshed) syncFormsWithUser(refreshed);
      }
    } catch (err) {
      console.error('Error cargando gestión de alumnos:', err);
      setUsers((prev) => (prev.length > 0 ? prev : SAMPLE_ATHLETES_20));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // O(1) lookups per user
  const bookingsByUid = useMemo(() => {
    const map = new Map<string, BookingDomainModel[]>();
    for (const b of bookings) {
      const list = map.get(b.uid);
      if (list) list.push(b);
      else map.set(b.uid, [b]);
    }
    return map;
  }, [bookings]);

  const paymentsByUid = useMemo(() => {
    const map = new Map<string, PaymentDomainModel[]>();
    for (const p of payments) {
      const list = map.get(p.uid);
      if (list) list.push(p);
      else map.set(p.uid, [p]);
    }
    return map;
  }, [payments]);

  const programByScheduleId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schedules) map.set(s.id, s.program);
    return map;
  }, [schedules]);

  /**
   * Disciplines a student trains, derived from the last 60 days of attended sessions,
   * plus Kids for children in the kids belt system. Empty means "unknown".
   */
  const disciplinesByUid = useMemo(() => {
    const map = new Map<string, Set<DisciplineId>>();
    for (const u of users) {
      const set = new Set<DisciplineId>();
      if (u.beltSystem === 'KIDS') set.add('KIDS');
      for (const b of bookingsByUid.get(u.uid) ?? []) {
        const program = programByScheduleId.get(b.scheduleId);
        const id = program ? disciplineForProgram(program) : null;
        if (id) set.add(id);
      }
      map.set(u.uid, set);
    }
    return map;
  }, [users, bookingsByUid, programByScheduleId]);

  /**
   * Belt is shown only where a belt-based discipline applies. A student with no known
   * discipline keeps showing their belt; one who trains only non-belt disciplines does not.
   */
  const showsBelt = (user: UserDomainModel): boolean => {
    const set = disciplinesByUid.get(user.uid);
    if (!set || set.size === 0) return true;
    return [...set].some((id) => disciplineHasBelt(id));
  };

  const getRetentionRisk = (user: UserDomainModel): RetentionRisk => {
    if (user.accountStatus === 'FROZEN' || user.accountStatus === 'PAUSED' || user.accountStatus === 'INACTIVE') {
      return 'LOW';
    }
    return deriveRetentionRisk(bookingsByUid.get(user.uid) || [], now);
  };

  const syncFormsWithUser = (user: UserDomainModel) => {
    setSelectedUser(user);
    setDatosForm({
      alias: user.alias || '',
      contactEmail: user.contactEmail || user.authEmail || '',
      phone: user.phone || '',
      birthDate: user.birthDate || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactPhone: user.emergencyContactPhone || '',
      notes: (user as any).notes || '',
    });
    setBeltForm({
      belt: user.belt || 'WHITE',
      stripes: user.stripes || 0,
    });
    setTierForm(user.pricingTier || 'STD');
  };

  const openFicha = (user: UserDomainModel) => {
    syncFormsWithUser(user);
    setActiveTab('resumen');
  };

  // Status buckets
  const activosList = useMemo(() => users.filter((u) => u.accountStatus === 'ACTIVE'), [users]);
  const interesadosList = useMemo(
    () => users.filter((u) => u.accountStatus === 'TRIAL' || u.accountStatus === 'PENDING'),
    [users]
  );
  const bajasList = useMemo(
    () =>
      users.filter(
        (u) =>
          u.accountStatus === 'INACTIVE' ||
          u.accountStatus === 'FROZEN' ||
          u.accountStatus === 'PAUSED' ||
          u.accountStatus === 'SUSPENDED'
      ),
    [users]
  );
  const foundingCount = useMemo(() => users.filter((u) => u.isFoundingMember).length, [users]);

  // Belt filter and column only make sense for belt-based disciplines
  const beltFilterAvailable = disciplineFilter === FILTER_ALL || disciplineHasBelt(disciplineFilter);
  const beltOptions = disciplineFilter === 'KIDS' ? KIDS_BELTS : ADULT_BELTS;

  const handleDisciplineChange = (next: DisciplineFilter) => {
    setDisciplineFilter(next);
    setBeltFilter(FILTER_ALL);
  };

  const filteredVisibleItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source = view === 'ACTIVOS' ? activosList : view === 'BAJAS' ? bajasList : interesadosList;

    return source
      .filter((u) => {
        if (term) {
          const hit =
            displayName(u).toLowerCase().includes(term) ||
            u.alias?.toLowerCase().includes(term) ||
            u.contactEmail?.toLowerCase().includes(term) ||
            u.phone?.includes(term);
          if (!hit) return false;
        }
        if (disciplineFilter !== FILTER_ALL && !disciplinesByUid.get(u.uid)?.has(disciplineFilter)) {
          return false;
        }
        if (beltFilterAvailable && beltFilter !== FILTER_ALL) {
          if (!showsBelt(u) || u.belt !== beltFilter) return false;
        }
        return true;
      })
      .sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'));
  }, [
    view,
    searchTerm,
    disciplineFilter,
    beltFilter,
    beltFilterAvailable,
    activosList,
    bajasList,
    interesadosList,
    disciplinesByUid,
  ]);

  const hasActiveFilters = searchTerm !== '' || disciplineFilter !== FILTER_ALL || beltFilter !== FILTER_ALL;
  const clearFilters = () => {
    setSearchTerm('');
    setDisciplineFilter(FILTER_ALL);
    setBeltFilter(FILTER_ALL);
  };

  const counts = {
    activos: activosList.length,
    interesados: interesadosList.length,
    bajas: bajasList.length,
  };

  // --- Firestore writes (kiosk_members kept in sync) ---

  const showNotification = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleSaveDatos = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const isMinorUser = datosForm.birthDate ? isLegalMinor(datosForm.birthDate, now) : false;
      const updates = {
        alias: datosForm.alias.trim(),
        contactEmail: datosForm.contactEmail.trim().toLowerCase(),
        phone: datosForm.phone.trim(),
        birthDate: datosForm.birthDate,
        isMinor: isMinorUser,
        emergencyContactName: datosForm.emergencyContactName.trim(),
        emergencyContactPhone: datosForm.emergencyContactPhone.trim(),
        notes: datosForm.notes.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', selectedUser.uid), updates);

      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          fullName: datosForm.alias.trim(),
          updatedAt: serverTimestamp(),
        });
      } catch {}

      showNotification('Datos personales actualizados correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al guardar datos:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveGraduacion = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const updates = {
        belt: beltForm.belt,
        stripes: beltForm.stripes,
        beltDate: todayStr,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', selectedUser.uid), updates);

      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          belt: beltForm.belt,
          stripes: beltForm.stripes,
          fullName: selectedUser.alias || '',
          updatedAt: serverTimestamp(),
        });
      } catch {}

      showNotification(`Graduación actualizada: ${findBelt(beltForm.belt)?.label ?? beltForm.belt} · ${stripesLabel(beltForm.stripes)}.`);
      await fetchData();
    } catch (err) {
      console.error('Error al guardar graduación:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTariff = async (newTier: PricingTier) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        pricingTier: newTier,
        updatedAt: serverTimestamp(),
      });
      setTierForm(newTier);
      showNotification(`Tarifa actualizada a ${TIER_PRICES[newTier].name}.`);
      await fetchData();
    } catch (err) {
      console.error('Error al actualizar tarifa:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = async (uid: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        accountStatus: 'ACTIVE',
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'kiosk_members', uid), {
          accountStatus: 'ACTIVE',
          updatedAt: serverTimestamp(),
        });
      } catch {}

      showNotification('Alumno activado con éxito.');
      await fetchData();
    } catch (err) {
      console.error('Error al activar alumno:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFreeze = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        accountStatus: 'FROZEN',
        freezeReason: freezeReason.trim() || 'Pausa temporal solicitada',
        frozenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          accountStatus: 'PAUSED',
          updatedAt: serverTimestamp(),
        });
      } catch {}

      setFreezeModalOpen(false);
      showNotification('Alumno pausado/congelado correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al congelar alumno:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        accountStatus: 'INACTIVE',
        deactivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          accountStatus: 'INACTIVE',
          updatedAt: serverTimestamp(),
        });
      } catch {}

      setDeactivateModalOpen(false);
      showNotification('Alumno dado de baja.');
      await fetchData();
    } catch (err) {
      console.error('Error al dar de baja:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!altaForm.alias.trim()) return;

    setActionLoading(true);
    try {
      {
        // Official enrolment: real Firebase Auth account + profile with the real UID (server function),
        // so the student can later sign in with Google (same email) or with a password.
        const email = altaForm.email.trim().toLowerCase();
        if (!email) {
          showNotification('Indica el email del alumno: lo necesita para entrar con Google o con contraseña.');
          return;
        }
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No hay sesión de administrador activa.');

        const nowIso = new Date().toISOString();
        const isMinorUser = altaForm.birthDate ? isLegalMinor(altaForm.birthDate, now) : false;

        const res = await fetch('/.netlify/functions/admin-create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            email,
            alias: altaForm.alias.trim(),
            phone: altaForm.phone.trim(),
            birthDate: altaForm.birthDate || '',
            belt: altaForm.belt,
            stripes: altaForm.stripes,
            pricingTier: altaForm.pricingTier,
            targetRole: 'student',
            isMinor: isMinorUser,
            emergencyContactName: altaForm.emergencyContactName.trim(),
            emergencyContactPhone: altaForm.emergencyContactPhone.trim(),
            notes: altaForm.notes.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        invalidateLiveDocs(['users', 'kiosk_members']);
        if (!res.ok || !data?.uid) {
          throw new Error(data?.error || `Error ${res.status} al crear la cuenta.`);
        }

        const newUid: string = data.uid;
        if (data.resetLink) {
          try {
            await navigator.clipboard.writeText(data.resetLink);
          } catch {
            // no clipboard permission: the student can use Google or "forgot password"
          }
        }

        showNotification(`Alumno ${altaForm.alias} dado de alta. Ya puede entrar con Google usando ${email}.`);
        setAltaModalOpen(false);
        await fetchData();
        setView('ACTIVOS');
        const createdUser: UserDomainModel = {
          uid: newUid,
          alias: altaForm.alias.trim(),
          contactEmail: email,
          phone: altaForm.phone.trim(),
          birthDate: altaForm.birthDate || '',
          isMinor: isMinorUser,
          beltSystem: isMinorUser ? 'KIDS' : 'ADULT',
          belt: altaForm.belt,
          stripes: altaForm.stripes,
          beltDate: nowIso.slice(0, 10),
          pricingTier: altaForm.pricingTier,
          activeTariffId: 'tariff_default',
          authEmail: email,
          emergencyContactName: altaForm.emergencyContactName.trim(),
          emergencyContactPhone: altaForm.emergencyContactPhone.trim(),
          accountStatus: 'ACTIVE',
          permissions: ['student'],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        openFicha(createdUser);
      }
    } catch (err) {
      console.error('Error al crear alumno:', err);
      showNotification(`No se pudo dar de alta al alumno: ${err instanceof Error ? err.message : 'error desconocido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterQuickPayment = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const currentPeriod = nowIso.slice(0, 7);
      const amountNum = parseFloat(quickPaymentForm.amount) || 65;

      const newPayRef = doc(collection(db, 'payments'));
      await setDoc(newPayRef, {
        uid: selectedUser.uid,
        period: currentPeriod,
        method: quickPaymentForm.method,
        status: 'APPROVED',
        billingType: 'MONTHLY',
        concept: quickPaymentForm.concept || 'Cuota mensual tatami',
        amountCents: Math.round(amountNum * 100),
        paidAt: serverTimestamp(),
        validatedBy: 'Admin Directo',
        validatedAt: nowIso,
        createdAt: nowIso,
      });

      setQuickPaymentModalOpen(false);
      showNotification(`Pago de ${amountNum} € registrado.`);
      await fetchData();
    } catch (err) {
      console.error('Error al registrar pago:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Derived data for the open ficha
  const selectedUserBookings = useMemo(() => {
    if (!selectedUser) return [];
    return [...(bookingsByUid.get(selectedUser.uid) || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedUser, bookingsByUid]);

  const selectedUserPayments = useMemo(() => {
    if (!selectedUser) return [];
    return [...(paymentsByUid.get(selectedUser.uid) || [])].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [selectedUser, paymentsByUid]);

  const selectedUserAge = useMemo(() => {
    if (!selectedUser?.birthDate) return null;
    return calculateExactAge(selectedUser.birthDate, now);
  }, [selectedUser]);

  const selectedShowsBelt = selectedUser ? showsBelt(selectedUser) : false;
  const selectedDisciplineNames = selectedUser
    ? [...(disciplinesByUid.get(selectedUser.uid) ?? [])].map((id) => getDiscipline(id)?.name ?? id)
    : [];
  // The belt tab disappears for students who only train non-belt disciplines
  const effectiveTab: FichaTab = activeTab === 'cinturon' && !selectedShowsBelt ? 'resumen' : activeTab;

  const fichaTabs: { id: FichaTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'datos', label: 'Datos' },
    ...(selectedShowsBelt ? [{ id: 'cinturon' as FichaTab, label: 'Cinturón' }] : []),
    { id: 'pagos', label: 'Pagos' },
    { id: 'asistencia', label: 'Asistencia' },
  ];

  const statusTabs: { id: StatusView; label: string; count: number }[] = [
    { id: 'ACTIVOS', label: 'Activos', count: counts.activos },
    { id: 'INTERESADOS', label: 'Interesados', count: counts.interesados },
    { id: 'BAJAS', label: 'Bajas', count: counts.bajas },
  ];

  const openAlta = () => {
    setAltaForm({
      alias: '',
      email: '',
      phone: '',
      birthDate: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      belt: 'WHITE',
      stripes: 0,
      pricingTier: 'STD',
      notes: '',
    });
    setAltaModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Alumnos y cinturones"
        description="Censo de tatami: filtra por disciplina, abre la ficha y gestiona cuota y graduación."
        actions={
          <>
            <button
              type="button"
              onClick={() => exportStudentsToCsv(users)}
              className={btnSecondary}
              title="Descargar censo en CSV"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button type="button" onClick={openAlta} className={btnPrimary}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Dar de alta alumno
            </button>
          </>
        }
      />

      {saveSuccessNotice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          {saveSuccessNotice}
        </p>
      )}

      {!selectedUser && (
        <>
          <section aria-label="Resumen del censo" className="overflow-hidden rounded-2xl bg-studio-navy text-white">
            <div className="grid grid-cols-3 gap-1 p-2">
              <KpiCard label="Total alumnos" value={users.length} featured />
              <KpiCard label="Activos" value={counts.activos} tone="success" featured />
              <KpiCard label="Socios fundadores" value={foundingCount} featured />
            </div>
          </section>

          <div
            role="tablist"
            aria-label="Estado del alumno"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-studio-navy/10 p-1 sm:max-w-xl"
          >
            {statusTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                  view === t.id ? 'bg-white text-studio-navy' : 'text-studio-navy/70 hover:text-studio-navy'
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                    view === t.id ? 'bg-studio-navy text-white' : 'bg-studio-navy/10 text-studio-navy'
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <SectionCard
            flush
            title="Censo"
            description={`${filteredVisibleItems.length} ${filteredVisibleItems.length === 1 ? 'persona' : 'personas'}${
              hasActiveFilters ? ' con los filtros actuales' : ''
            }`}
          >
            {/* Filters */}
            <div className="space-y-3 border-b border-studio-navy/10 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <label htmlFor="student-search" className="sr-only">
                    Buscar alumno
                  </label>
                  <input
                    id="student-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, email o teléfono"
                    className={cn(fieldCls, 'pl-11')}
                  />
                </div>

                {beltFilterAvailable && (
                  <div>
                    <label htmlFor="belt-filter" className="sr-only">
                      Filtrar por cinturón
                    </label>
                    <select
                      id="belt-filter"
                      value={beltFilter}
                      onChange={(e) => setBeltFilter(e.target.value)}
                      className={cn(selectCls, 'w-full sm:w-52')}
                    >
                      <option value={FILTER_ALL}>Todos los cinturones</option>
                      {beltOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div role="group" aria-label="Filtrar por disciplina" className="flex flex-wrap items-center gap-2">
                {[{ id: FILTER_ALL as DisciplineFilter, name: 'Todas' }, ...DISCIPLINES].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={disciplineFilter === d.id}
                    onClick={() => handleDisciplineChange(d.id as DisciplineFilter)}
                    className={cn(
                      'min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                      disciplineFilter === d.id
                        ? 'border-studio-navy bg-studio-navy text-white'
                        : 'border-studio-navy/15 bg-white text-studio-navy hover:bg-studio-navy/5'
                    )}
                  >
                    {d.name}
                  </button>
                ))}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold text-studio-navy underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
              {disciplineFilter !== FILTER_ALL && !disciplineHasBelt(disciplineFilter) && (
                <p className="text-sm text-slate-600">
                  {getDiscipline(disciplineFilter)?.name} no tiene cinturón: la graduación no se muestra en esta vista.
                </p>
              )}
              {disciplineFilter === FILTER_ALL && (
                <p className="text-sm text-slate-600">
                  Cinturón disponible en {BELT_DISCIPLINES.map((d) => d.name).join(', ')}.
                </p>
              )}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-sm text-slate-600">
                <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                Cargando tatami...
              </div>
            ) : filteredVisibleItems.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-base font-bold text-studio-navy">No hay alumnos con este filtro</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                  Prueba con otra disciplina o quita los filtros para ver todo el censo.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-studio-navy/10">
                {filteredVisibleItems.map((u) => {
                  const risk = getRetentionRisk(u);
                  const disciplines = [...(disciplinesByUid.get(u.uid) ?? [])];
                  const initials = (u.alias || '?').slice(0, 2).toUpperCase();
                  const rowShowsBelt = beltFilterAvailable && showsBelt(u);
                  return (
                    <li key={u.uid} className="flex items-center gap-3 px-5 py-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => openFicha(u)}
                        className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy"
                      >
                        <Avatar className="h-12 w-12 shrink-0">
                          {u.photoUrl && <AvatarImage src={u.photoUrl} alt="" />}
                          <AvatarFallback className="bg-studio-navy text-sm font-bold text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-base font-bold text-studio-navy">{displayName(u)}</span>
                            {u.isFoundingMember && (
                              <Chip tone="pending">
                                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                                Socio fundador
                              </Chip>
                            )}
                            {risk === 'HIGH' && <Chip tone="error">Riesgo de abandono</Chip>}
                          </span>
                          <span className="block text-sm text-slate-700">{u.phone || 'Sin teléfono'}</span>
                          <span className="block truncate text-sm text-slate-600">
                            {disciplines.length > 0
                              ? disciplines.map((id) => getDiscipline(id)?.name ?? id).join(' · ')
                              : 'Sin disciplina registrada'}
                          </span>
                        </span>
                        <span className="hidden shrink-0 flex-col items-end gap-1.5 md:flex">
                          {rowShowsBelt && <BeltChip belt={u.belt} stripes={u.stripes} />}
                          <StatusChip status={u.accountStatus} />
                        </span>
                        <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-500 sm:block" aria-hidden="true" />
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        {u.phone && (
                          <a
                            href={`tel:${u.phone.replace(/\s+/g, '')}`}
                            className={cn(btnQuiet, 'w-11 px-0 lg:w-auto lg:px-3.5')}
                            aria-label={`Llamar a ${u.alias}`}
                          >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden lg:inline">Llamar</span>
                          </a>
                        )}
                        <Link
                          to={`/admin/caja?cobrar=${u.uid}`}
                          className={cn(btnQuiet, 'w-11 px-0 lg:w-auto lg:px-3.5')}
                          aria-label={`Cobrar a ${u.alias}`}
                        >
                          <Banknote className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden lg:inline">Cobrar</span>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {selectedUser && (
        <>
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className={cn(btnQuiet, 'w-fit')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al censo
          </button>

          <SectionCard flush>
            {/* Ficha header */}
            <div className="flex flex-col justify-between gap-4 border-b border-studio-navy/10 p-5 md:flex-row md:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  {selectedUser.photoUrl && <AvatarImage src={selectedUser.photoUrl} alt="" />}
                  <AvatarFallback className="bg-studio-navy text-lg font-bold text-white">
                    {(selectedUser.alias || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-headline text-2xl uppercase leading-tight text-studio-navy">
                      {displayName(selectedUser)}
                    </h2>
                    <StatusChip status={selectedUser.accountStatus} />
                    {selectedUser.isFoundingMember && (
                      <Chip tone="pending">
                        <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        Socio fundador
                      </Chip>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {selectedUser.contactEmail}
                    {selectedUser.phone && <span className="tabular-nums"> · {selectedUser.phone}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploaderOpen(true)}
                    className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl text-sm font-semibold text-studio-navy underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" /> Cambiar foto
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/caja?cobrar=${selectedUser.uid}`} className={btnQuiet}>
                  <Banknote className="h-4 w-4" aria-hidden="true" /> Cobrar
                </Link>
                {selectedUser.accountStatus === 'ACTIVE' ? (
                  <>
                    <button type="button" onClick={() => setFreezeModalOpen(true)} className={btnQuiet}>
                      <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeactivateModalOpen(true)}
                      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 text-sm font-semibold text-rose-900 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy"
                    >
                      <UserMinus className="h-4 w-4" aria-hidden="true" /> Dar de baja
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleActivateUser(selectedUser.uid)}
                    disabled={actionLoading}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" /> Reactivar alumno
                  </button>
                )}
              </div>
            </div>

            {/* Ficha tabs */}
            <div className="border-b border-studio-navy/10 px-5 py-3">
              <div
                role="tablist"
                aria-label="Secciones de la ficha"
                className="flex gap-1 overflow-x-auto rounded-2xl bg-studio-navy/10 p-1 sm:inline-flex"
              >
                {fichaTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'min-h-11 shrink-0 cursor-pointer rounded-xl px-4 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                      effectiveTab === t.id ? 'bg-white text-studio-navy' : 'text-studio-navy/70 hover:text-studio-navy'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {/* RESUMEN */}
              {effectiveTab === 'resumen' && (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl bg-studio-navy text-white">
                    <div
                      className={cn(
                        'grid grid-cols-2 gap-1 p-2',
                        selectedShowsBelt ? 'md:grid-cols-4' : 'md:grid-cols-3'
                      )}
                    >
                      <KpiCard
                        label="Tarifa"
                        value={TIER_PRICES[selectedUser.pricingTier]?.price || '65 €'}
                        hint={TIER_PRICES[selectedUser.pricingTier]?.name}
                      />
                      {selectedShowsBelt && (
                        <KpiCard
                          label="Graduación"
                          value={findBelt(selectedUser.belt)?.label ?? selectedUser.belt}
                          hint={stripesLabel(selectedUser.stripes)}
                        />
                      )}
                      <KpiCard label="Clases (60 días)" value={selectedUserBookings.length} hint="sesiones de tatami" />
                      <KpiCard
                        label="Retención"
                        value={getRetentionRisk(selectedUser) === 'HIGH' ? 'Alerta' : 'Constante'}
                        tone={getRetentionRisk(selectedUser) === 'HIGH' ? 'danger' : 'success'}
                        hint="asistencia mensual"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-studio-navy">Disciplinas</h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedDisciplineNames.length > 0
                        ? selectedDisciplineNames.join(' · ')
                        : 'Sin disciplina registrada: se deduce de las asistencias de los últimos 60 días.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-studio-navy">Últimas clases registradas</h3>
                    {selectedUserBookings.length > 0 ? (
                      <ul className="mt-2 divide-y divide-studio-navy/10 overflow-hidden rounded-xl border border-studio-navy/10">
                        {selectedUserBookings.slice(0, 3).map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span className="flex items-center gap-2 font-semibold text-studio-navy">
                              <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
                              <span className="tabular-nums">{b.date}</span>
                            </span>
                            <Chip tone="ok">Asistencia confirmada</Chip>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 rounded-xl bg-studio-navy/5 p-3 text-sm text-slate-700">
                        Sin asistencias en los últimos 60 días.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="student-notes" className={labelCls}>
                      Observaciones y notas internas
                    </label>
                    <textarea
                      id="student-notes"
                      rows={3}
                      value={datosForm.notes}
                      onChange={(e) => setDatosForm({ ...datosForm, notes: e.target.value })}
                      placeholder="Seguimiento técnico, objetivos deportivos o comentarios"
                      className={cn(fieldCls, 'py-3')}
                    />
                    <button type="button" onClick={handleSaveDatos} disabled={actionLoading} className={btnSecondary}>
                      Guardar observaciones
                    </button>
                  </div>
                </div>
              )}

              {/* DATOS */}
              {effectiveTab === 'datos' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveDatos();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="f-alias" className={labelCls}>Nombre completo / alias</label>
                      <input
                        id="f-alias"
                        value={datosForm.alias}
                        onChange={(e) => setDatosForm({ ...datosForm, alias: e.target.value })}
                        required
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="f-email" className={labelCls}>Email de contacto</label>
                      <input
                        id="f-email"
                        type="email"
                        value={datosForm.contactEmail}
                        onChange={(e) => setDatosForm({ ...datosForm, contactEmail: e.target.value })}
                        required
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="f-phone" className={labelCls}>Teléfono</label>
                      <input
                        id="f-phone"
                        type="tel"
                        value={datosForm.phone}
                        onChange={(e) => setDatosForm({ ...datosForm, phone: e.target.value })}
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="f-birth" className={labelCls}>
                        Fecha de nacimiento
                        {selectedUserAge !== null && (
                          <span className="ml-2 font-medium tabular-nums text-slate-600">{selectedUserAge} años</span>
                        )}
                      </label>
                      <input
                        id="f-birth"
                        type="date"
                        value={datosForm.birthDate}
                        onChange={(e) => setDatosForm({ ...datosForm, birthDate: e.target.value })}
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="f-emname" className={labelCls}>Contacto de emergencia (nombre)</label>
                      <input
                        id="f-emname"
                        value={datosForm.emergencyContactName}
                        onChange={(e) => setDatosForm({ ...datosForm, emergencyContactName: e.target.value })}
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="f-emphone" className={labelCls}>Contacto de emergencia (teléfono)</label>
                      <input
                        id="f-emphone"
                        type="tel"
                        value={datosForm.emergencyContactPhone}
                        onChange={(e) => setDatosForm({ ...datosForm, emergencyContactPhone: e.target.value })}
                        className={fieldCls}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-studio-navy/10 pt-4">
                    <button type="submit" disabled={actionLoading} className={btnPrimary}>
                      Guardar cambios
                    </button>
                  </div>
                </form>
              )}

              {/* CINTURON (belt-based disciplines only) */}
              {effectiveTab === 'cinturon' && selectedShowsBelt && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-base font-bold text-studio-navy">Cinturón adultos</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {ADULT_BELTS.map((belt) => (
                        <button
                          key={belt.value}
                          type="button"
                          aria-pressed={beltForm.belt === belt.value}
                          onClick={() => setBeltForm({ ...beltForm, belt: belt.value })}
                          className={cn(
                            'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                            beltForm.belt === belt.value
                              ? 'border-studio-navy bg-studio-navy/5'
                              : 'border-studio-navy/15 hover:border-studio-navy/40'
                          )}
                        >
                          <span className={cn('inline-block h-3 w-9 rounded-sm', belt.bg)} aria-hidden="true" />
                          <span className="text-sm font-semibold text-studio-navy">{belt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-base font-bold text-studio-navy">Cinturones infantiles (Kids)</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {KIDS_BELTS.map((belt) => (
                        <button
                          key={belt.value}
                          type="button"
                          aria-pressed={beltForm.belt === belt.value}
                          onClick={() => setBeltForm({ ...beltForm, belt: belt.value })}
                          className={cn(
                            'flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                            beltForm.belt === belt.value
                              ? 'border-studio-navy bg-studio-navy/5'
                              : 'border-studio-navy/15 hover:border-studio-navy/40'
                          )}
                        >
                          <span className={cn('inline-block h-2.5 w-7 rounded-sm', belt.bg)} aria-hidden="true" />
                          <span className="w-full truncate text-center text-xs font-semibold text-studio-navy">
                            {belt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-base font-bold text-studio-navy">Grados / rayas (0 a 4)</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0, 1, 2, 3, 4].map((stripe) => (
                        <button
                          key={stripe}
                          type="button"
                          aria-pressed={beltForm.stripes === stripe}
                          onClick={() => setBeltForm({ ...beltForm, stripes: stripe })}
                          className={cn(
                            'min-h-12 min-w-12 cursor-pointer rounded-xl border-2 px-3 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                            beltForm.stripes === stripe
                              ? 'border-studio-navy bg-studio-navy text-white'
                              : 'border-studio-navy/15 bg-white text-studio-navy hover:bg-studio-navy/5'
                          )}
                        >
                          {stripe === 0 ? 'Sin rayas' : `${stripe}ª`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="flex items-center gap-2 rounded-xl bg-studio-navy/5 p-4 text-sm text-slate-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                    Al guardar, el rango se sincroniza con el kiosco de recepción y el tatami.
                  </p>

                  <div className="flex justify-end">
                    <button type="button" onClick={handleSaveGraduacion} disabled={actionLoading} className={btnPrimary}>
                      Guardar graduación
                    </button>
                  </div>
                </div>
              )}

              {/* PAGOS */}
              {effectiveTab === 'pagos' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-base font-bold text-studio-navy">Tarifa de mensualidad</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(['STD', 'SF', 'FAM'] as PricingTier[]).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          aria-pressed={tierForm === tier}
                          onClick={() => handleSaveTariff(tier)}
                          className={cn(
                            'min-h-16 cursor-pointer rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy',
                            tierForm === tier
                              ? 'border-studio-navy bg-studio-navy/5'
                              : 'border-studio-navy/15 hover:border-studio-navy/40'
                          )}
                        >
                          <span className="block text-sm font-semibold text-studio-navy">{TIER_PRICES[tier].name}</span>
                          <span className="mt-1 block text-lg font-bold tabular-nums text-studio-navy">
                            {TIER_PRICES[tier].price} / mes
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-studio-navy">Historial de cobros</h3>
                    <button type="button" onClick={() => setQuickPaymentModalOpen(true)} className={btnSecondary}>
                      <CreditCard className="h-5 w-5" aria-hidden="true" /> Registrar cobro
                    </button>
                  </div>

                  {selectedUserPayments.length > 0 ? (
                    <ul className="divide-y divide-studio-navy/10 overflow-hidden rounded-xl border border-studio-navy/10">
                      {selectedUserPayments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-studio-navy">
                              {p.concept || 'Cuota mensual tatami'}
                            </span>
                            <span className="text-sm text-slate-600">
                              Periodo <span className="tabular-nums">{p.period}</span> · {p.method}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-base font-bold tabular-nums text-studio-navy">
                              {((p.amountCents || 6500) / 100).toFixed(2)} €
                            </span>
                            <Chip tone={p.status === 'APPROVED' ? 'ok' : p.status === 'REJECTED' ? 'error' : 'pending'}>
                              {p.status}
                            </Chip>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-studio-navy/5 p-4 text-center text-sm text-slate-700">
                      No hay cobros registrados para este alumno.
                    </p>
                  )}
                </div>
              )}

              {/* ASISTENCIA */}
              {effectiveTab === 'asistencia' && (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl bg-studio-navy text-white">
                    <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-3">
                      <KpiCard label="Total asistencias" value={selectedUserBookings.length} hint="últimos 60 días" />
                      <KpiCard
                        label="Media semanal"
                        value={(selectedUserBookings.length / 8.5).toFixed(1)}
                        hint="clases por semana"
                      />
                      <KpiCard
                        label="Ritmo"
                        value={selectedUserBookings.length >= 8 ? 'Alto' : 'Regular'}
                        tone={selectedUserBookings.length >= 8 ? 'success' : 'neutral'}
                        hint="compromiso activo"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-studio-navy">Registro de clases asistidas</h3>
                    {selectedUserBookings.length > 0 ? (
                      <ul className="mt-2 max-h-80 divide-y divide-studio-navy/10 overflow-y-auto rounded-xl border border-studio-navy/10">
                        {selectedUserBookings.map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span className="flex items-center gap-2 text-slate-700">
                              <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                              <span className="font-semibold tabular-nums text-studio-navy">{b.date}</span>
                              <span>{b.sessionType || 'Clase regular'}</span>
                            </span>
                            <Chip tone="ok">Asistió</Chip>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 rounded-xl bg-studio-navy/5 p-4 text-center text-sm text-slate-700">
                        Sin clases registradas en el periodo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {/* Dialog: enrol student */}
      <Dialog open={altaModalOpen} onOpenChange={setAltaModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl uppercase text-studio-navy">Dar de alta alumno</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Registra un nuevo alumno activo con acceso a tatami y clases.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStudent} className="mt-2 space-y-4">
            <div>
              <label htmlFor="a-alias" className={labelCls}>Nombre completo / alias *</label>
              <input
                id="a-alias"
                value={altaForm.alias}
                onChange={(e) => setAltaForm({ ...altaForm, alias: e.target.value })}
                placeholder="Ej. Mario Silva"
                required
                className={fieldCls}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="a-email" className={labelCls}>Email</label>
                <input
                  id="a-email"
                  type="email"
                  value={altaForm.email}
                  onChange={(e) => setAltaForm({ ...altaForm, email: e.target.value })}
                  placeholder="alumno@ejemplo.com"
                  className={fieldCls}
                />
              </div>
              <div>
                <label htmlFor="a-phone" className={labelCls}>Teléfono</label>
                <input
                  id="a-phone"
                  type="tel"
                  value={altaForm.phone}
                  onChange={(e) => setAltaForm({ ...altaForm, phone: e.target.value })}
                  placeholder="600 000 000"
                  className={fieldCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="a-belt" className={labelCls}>Cinturón BJJ</label>
                <select
                  id="a-belt"
                  value={altaForm.belt}
                  onChange={(e) => setAltaForm({ ...altaForm, belt: e.target.value as Belt })}
                  className={cn(selectCls, 'w-full')}
                >
                  {ADULT_BELTS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="a-tier" className={labelCls}>Tarifa mensual</label>
                <select
                  id="a-tier"
                  value={altaForm.pricingTier}
                  onChange={(e) => setAltaForm({ ...altaForm, pricingTier: e.target.value as PricingTier })}
                  className={cn(selectCls, 'w-full')}
                >
                  <option value="STD">Estándar (65 €)</option>
                  <option value="SF">Sin Fin / Ilimitado (85 €)</option>
                  <option value="FAM">Familiar (55 €)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="a-birth" className={labelCls}>Fecha de nacimiento</label>
              <input
                id="a-birth"
                type="date"
                value={altaForm.birthDate}
                onChange={(e) => setAltaForm({ ...altaForm, birthDate: e.target.value })}
                className={fieldCls}
              />
            </div>

            <div>
              <label htmlFor="a-notes" className={labelCls}>Notas iniciales</label>
              <textarea
                id="a-notes"
                rows={2}
                value={altaForm.notes}
                onChange={(e) => setAltaForm({ ...altaForm, notes: e.target.value })}
                placeholder="Observaciones de inscripción"
                className={cn(fieldCls, 'py-3')}
              />
            </div>

            <DialogFooter className="pt-2">
              <button type="button" onClick={() => setAltaModalOpen(false)} className={btnSecondary}>
                Cancelar
              </button>
              <button type="submit" disabled={actionLoading} className={btnPrimary}>
                Completar alta
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: pause student */}
      <Dialog open={freezeModalOpen} onOpenChange={setFreezeModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl uppercase text-studio-navy">Pausar membresía</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Pausa la cuota y el acceso de {selectedUser?.alias}. Podrás reactivarlo en cualquier momento.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <label htmlFor="freeze-reason" className={labelCls}>Motivo de la pausa</label>
            <input
              id="freeze-reason"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="Ej. vacaciones, viaje de trabajo"
              className={fieldCls}
            />
          </div>

          <DialogFooter className="pt-3">
            <button type="button" onClick={() => setFreezeModalOpen(false)} className={btnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmFreeze} disabled={actionLoading} className={btnPrimary}>
              Confirmar pausa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: deactivate student */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl uppercase text-studio-navy">Dar de baja</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              ¿Confirmas la baja de {selectedUser?.alias}? Pasará a la lista de bajas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <button type="button" onClick={() => setDeactivateModalOpen(false)} className={btnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmDeactivate} disabled={actionLoading} className={btnPrimary}>
              Confirmar baja
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: quick payment */}
      <Dialog open={quickPaymentModalOpen} onOpenChange={setQuickPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl uppercase text-studio-navy">Registrar cobro</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Registra el pago de mensualidad de {selectedUser?.alias}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div>
              <label htmlFor="qp-amount" className={labelCls}>Importe (€)</label>
              <input
                id="qp-amount"
                type="number"
                value={quickPaymentForm.amount}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, amount: e.target.value })}
                className={cn(fieldCls, 'tabular-nums')}
              />
            </div>
            <div>
              <label htmlFor="qp-method" className={labelCls}>Método de cobro</label>
              <select
                id="qp-method"
                value={quickPaymentForm.method}
                onChange={(e) =>
                  setQuickPaymentForm({ ...quickPaymentForm, method: e.target.value as 'BIZUM' | 'CASH' })
                }
                className={cn(selectCls, 'w-full')}
              >
                <option value="BIZUM">Bizum</option>
                <option value="CASH">Efectivo en recepción</option>
              </select>
            </div>
            <div>
              <label htmlFor="qp-concept" className={labelCls}>Concepto</label>
              <input
                id="qp-concept"
                value={quickPaymentForm.concept}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, concept: e.target.value })}
                className={fieldCls}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <button type="button" onClick={() => setQuickPaymentModalOpen(false)} className={btnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleRegisterQuickPayment} disabled={actionLoading} className={btnPrimary}>
              Guardar cobro
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: profile photo */}
      {uploaderOpen && selectedUser && (
        <PhotoUploaderModal
          athleteAlias={selectedUser.alias}
          currentPhotoUrl={selectedUser.photoUrl}
          onSave={async (photoDataUrl) => {
            try {
              await updateDoc(doc(db, 'users', selectedUser.uid), {
                photoUrl: photoDataUrl,
                updatedAt: serverTimestamp(),
              });
              setUploaderOpen(false);
              showNotification('Foto de perfil actualizada.');
              await fetchData();
            } catch (err) {
              console.error('Error al guardar foto:', err);
            }
          }}
          onClose={() => setUploaderOpen(false)}
        />
      )}
    </div>
  );
};
