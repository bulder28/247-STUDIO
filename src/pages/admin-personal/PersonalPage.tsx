import React, { useEffect, useMemo, useState } from 'react';
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
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  LayoutGrid,
  List,
  Mail,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { auth, db } from '@/shared/api/firebase';
import { getLiveDocs, invalidateLiveDocs } from '@/shared/api/liveReads';
import { deriveRetentionRisk } from '@/shared/domain/attendance';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { SAMPLE_ATHLETES_20 } from '@/shared/mock/sampleAthletes';
import {
  AccountStatus,
  AdultBelt,
  Belt,
  BeltSystem,
  BookingDomainModel,
  KidsBelt,
  PaymentDomainModel,
  PricingTier,
  RetentionRisk,
  UserDomainModel,
} from '@/shared/domain/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
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
import { exportStudentsToCsv } from '@/shared/utils/csvExporter';
import { FifaFighterCard } from '@/widgets/FifaFighterCard';
import { FighterCard } from '@/widgets/FighterCard';
import { PhotoUploaderModal } from '@/widgets/PhotoUploaderModal';

// --- Constantes y Helpers de Cinturones ---
const ADULT_BELTS: { value: AdultBelt; label: string; bg: string; text: string }[] = [
  { value: 'WHITE', label: 'Blanco', bg: 'bg-white border-2 border-slate-300', text: 'text-slate-900' },
  { value: 'BLUE', label: 'Azul', bg: 'bg-blue-600', text: 'text-white' },
  { value: 'PURPLE', label: 'Morado', bg: 'bg-purple-700', text: 'text-white' },
  { value: 'BROWN', label: 'Marrón', bg: 'bg-amber-900', text: 'text-white' },
  { value: 'BLACK', label: 'Negro', bg: 'bg-slate-950 border border-rose-600', text: 'text-rose-500' },
];

const KIDS_BELTS: { value: KidsBelt; label: string; bg: string; text: string }[] = [
  { value: 'WHITE', label: 'Blanco', bg: 'bg-white border border-slate-300', text: 'text-slate-900' },
  { value: 'GREY_WHITE', label: 'Gris / Blanco', bg: 'bg-slate-300', text: 'text-slate-900' },
  { value: 'GREY', label: 'Gris', bg: 'bg-slate-400', text: 'text-white' },
  { value: 'GREY_BLACK', label: 'Gris / Negro', bg: 'bg-slate-500', text: 'text-white' },
  { value: 'YELLOW_WHITE', label: 'Amarillo / Blanco', bg: 'bg-yellow-200', text: 'text-yellow-900' },
  { value: 'YELLOW', label: 'Amarillo', bg: 'bg-yellow-400', text: 'text-yellow-950' },
  { value: 'YELLOW_BLACK', label: 'Amarillo / Negro', bg: 'bg-yellow-500', text: 'text-slate-950' },
  { value: 'ORANGE_WHITE', label: 'Naranja / Blanco', bg: 'bg-orange-200', text: 'text-orange-950' },
  { value: 'ORANGE', label: 'Naranja', bg: 'bg-orange-400', text: 'text-white' },
  { value: 'ORANGE_BLACK', label: 'Naranja / Negro', bg: 'bg-orange-500', text: 'text-white' },
  { value: 'GREEN_WHITE', label: 'Verde / Blanco', bg: 'bg-emerald-200', text: 'text-emerald-950' },
  { value: 'GREEN', label: 'Verde', bg: 'bg-emerald-500', text: 'text-white' },
  { value: 'GREEN_BLACK', label: 'Verde / Negro', bg: 'bg-emerald-600', text: 'text-white' },
];

const TIER_PRICES: Record<PricingTier, { name: string; price: string }> = {
  STD: { name: 'Estándar (3 días)', price: '65 €' },
  SF: { name: 'Sin Fin (Ilimitado)', price: '85 €' },
  FAM: { name: 'Familiar', price: '55 €' },
};

export interface LeadModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  scheduleId?: string;
  programInterest?: string;
  source?: string;
  notes?: string;
  status: 'NEW' | 'SCHEDULED' | 'ATTENDED' | 'CONVERTED' | 'LOST';
  createdAt?: any;
}

export const PersonalPage: React.FC = () => {
  // Estado de datos
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [leads, setLeads] = useState<LeadModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [payments, setPayments] = useState<PaymentDomainModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de visualización: Álbum de Cartas FIFA vs Ficha y Gestión
  const [displayMode, setDisplayMode] = useState<'CARDS' | 'LIST'>('CARDS');
  const [cardBeltFilter, setCardBeltFilter] = useState<string>('ALL');
  const [modalCardUser, setModalCardUser] = useState<UserDomainModel | null>(null);

  // Vistas superiores de ciclo de vida
  const [view, setView] = useState<'ACTIVOS' | 'INTERESADOS' | 'BAJAS'>('ACTIVOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Selección en modo Maestro-Detalle
  const [selectedUser, setSelectedUser] = useState<UserDomainModel | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadModel | null>(null);

  // Pestañas de la Ficha
  const [activeTab, setActiveTab] = useState<'resumen' | 'datos' | 'cinturon' | 'pagos' | 'asistencia' | 'carta'>('resumen');

  // Formularios de edición en la ficha
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

  // Modales
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
    isLeadOnly: false,
    notes: '',
  });

  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('Lesión deportiva');
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [quickPaymentForm, setQuickPaymentForm] = useState({
    amount: '65',
    method: 'BIZUM' as 'BIZUM' | 'CASH' | 'CARD',
    concept: 'Cuota mensual tatami',
  });
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const now = new Date();

  // Carga optimizada paralela con límite temporal de 60 días para reservas
  const fetchData = async () => {
    try {
      setLoading(true);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const minDateStr = sixtyDaysAgo.toISOString().slice(0, 10);

      const [usersSnap, leadsSnap, bookingsSnap, paymentsSnap] = await Promise.all([
        getLiveDocs('users', collection(db, 'users')),
        getLiveDocs('leads', collection(db, 'leads')),
        getDocs(query(collection(db, 'bookings'), where('date', '>=', minDateStr))),
        getLiveDocs('payments', collection(db, 'payments')),
      ]);

      const uList: UserDomainModel[] = [];
      usersSnap.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      const effectiveUsers = uList.length > 0 ? uList : SAMPLE_ATHLETES_20;
      setUsers(effectiveUsers);

      const lList: LeadModel[] = [];
      leadsSnap.forEach((d) => lList.push({ id: d.id, ...(d.data() as Omit<LeadModel, 'id'>) }));
      setLeads(lList);

      const bList: BookingDomainModel[] = [];
      bookingsSnap.forEach((d) => bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
      setBookings(bList);

      const pList: PaymentDomainModel[] = [];
      paymentsSnap.forEach((d) => pList.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));
      setPayments(pList);

      // Si había un alumno seleccionado, refrescar su referencia
      if (selectedUser) {
        const refreshed = uList.find((u) => u.uid === selectedUser.uid);
        if (refreshed) syncFormsWithUser(refreshed);
      }
    } catch (err) {
      console.error('Error cargando gestión de alumnos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-indexación en memoria de reservas O(1) por usuario
  const bookingsByUid = useMemo(() => {
    const map = new Map<string, BookingDomainModel[]>();
    for (const b of bookings) {
      const list = map.get(b.uid);
      if (list) list.push(b);
      else map.set(b.uid, [b]);
    }
    return map;
  }, [bookings]);

  // Pre-indexación de pagos O(1) por usuario
  const paymentsByUid = useMemo(() => {
    const map = new Map<string, PaymentDomainModel[]>();
    for (const p of payments) {
      const list = map.get(p.uid);
      if (list) list.push(p);
      else map.set(p.uid, [p]);
    }
    return map;
  }, [payments]);

  // Riesgo de abandono por usuario
  const getRetentionRisk = (user: UserDomainModel): RetentionRisk => {
    if (user.accountStatus === 'FROZEN' || user.accountStatus === 'PAUSED' || user.accountStatus === 'INACTIVE') {
      return 'LOW';
    }
    const userBookings = bookingsByUid.get(user.uid) || [];
    return deriveRetentionRisk(userBookings, now);
  };

  // Sincronizar formularios al seleccionar alumno
  const syncFormsWithUser = (user: UserDomainModel) => {
    setSelectedUser(user);
    setSelectedLead(null);
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

  const handleSelectLead = (lead: LeadModel) => {
    setSelectedLead(lead);
    setSelectedUser(null);
    setActiveTab('resumen');
  };

  // Filtrado en las 3 vistas principales
  const activosList = useMemo(() => {
    return users.filter((u) => u.accountStatus === 'ACTIVE');
  }, [users]);

  const interesadosList = useMemo(() => {
    const leadsNotConverted = leads.filter((l) => l.status !== 'CONVERTED');
    const trialUsers = users.filter((u) => u.accountStatus === 'TRIAL' || u.accountStatus === 'PENDING');
    return { leads: leadsNotConverted, trialUsers };
  }, [leads, users]);

  const bajasList = useMemo(() => {
    return users.filter(
      (u) =>
        u.accountStatus === 'INACTIVE' ||
        u.accountStatus === 'FROZEN' ||
        u.accountStatus === 'PAUSED' ||
        u.accountStatus === 'SUSPENDED'
    );
  }, [users]);

  // Lista visible según vista y término de búsqueda
  const filteredVisibleItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (view === 'ACTIVOS') {
      return activosList.filter((u) => {
        if (!term) return true;
        return (
          u.alias?.toLowerCase().includes(term) ||
          u.contactEmail?.toLowerCase().includes(term) ||
          u.phone?.includes(term)
        );
      });
    }

    if (view === 'BAJAS') {
      return bajasList.filter((u) => {
        if (!term) return true;
        return (
          u.alias?.toLowerCase().includes(term) ||
          u.contactEmail?.toLowerCase().includes(term) ||
          u.phone?.includes(term)
        );
      });
    }

    // INTERESADOS (Leads + Usuarios en Prueba)
    const matchedLeads = interesadosList.leads.filter((l) => {
      if (!term) return true;
      return (
        l.name?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.phone?.includes(term)
      );
    });
    const matchedTrialUsers = interesadosList.trialUsers.filter((u) => {
      if (!term) return true;
      return (
        u.alias?.toLowerCase().includes(term) ||
        u.contactEmail?.toLowerCase().includes(term) ||
        u.phone?.includes(term)
      );
    });

    return { leads: matchedLeads, trialUsers: matchedTrialUsers };
  }, [view, searchTerm, activosList, bajasList, interesadosList]);

  // Lista de atletas para la vista de Álbum de Cartas FIFA FUT
  const cardAthletes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let baseList = activosList;
    if (view === 'BAJAS') baseList = bajasList;
    if (view === 'INTERESADOS') baseList = interesadosList.trialUsers;

    return baseList.filter((u) => {
      if (term) {
        const matchesTerm =
          u.alias?.toLowerCase().includes(term) ||
          u.contactEmail?.toLowerCase().includes(term) ||
          u.phone?.includes(term);
        if (!matchesTerm) return false;
      }
      if (cardBeltFilter === 'ALL') return true;
      if (cardBeltFilter === 'KIDS') return u.beltSystem === 'KIDS';
      return u.belt === cardBeltFilter && u.beltSystem !== 'KIDS';
    });
  }, [activosList, bajasList, interesadosList, view, searchTerm, cardBeltFilter]);

  // Total de elementos por vista
  const counts = {
    activos: activosList.length,
    interesados: interesadosList.leads.length + interesadosList.trialUsers.length,
    bajas: bajasList.length,
  };

  // --- Operaciones de Escritura Firestore (con sincronización en kiosk_members) ---

  const showNotification = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // 1. Guardar Datos Personales
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

      // Sincronizar en kiosk_members
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

  // 2. Guardar Graduación (Cinturón & Rayas)
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

      // Sincronizar en kiosk_members para reflejo inmediato en tatami
      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          belt: beltForm.belt,
          stripes: beltForm.stripes,
          fullName: selectedUser.alias || '',
          updatedAt: serverTimestamp(),
        });
      } catch {}

      showNotification(`Graduación actualizada: ${beltForm.belt} · ${beltForm.stripes} rayas.`);
      await fetchData();
    } catch (err) {
      console.error('Error al guardar graduación:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Guardar Tarifa
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

  // 4. Activar / Reactivar Alumno
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

  // 5. Congelar Alumno
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

  // 6. Dar de Baja Alumno
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

  // 7. Convertir Lead a Alumno Activo
  const handleConvertLeadToStudent = async (lead: LeadModel) => {
    setActionLoading(true);
    try {
      const newUid = `usr_${Date.now()}`;
      const nowIso = new Date().toISOString();

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        alias: lead.name,
        contactEmail: lead.email || '',
        phone: lead.phone || '',
        birthDate: '1995-01-01',
        isMinor: false,
        beltSystem: 'ADULT',
        belt: 'WHITE',
        stripes: 0,
        beltDate: nowIso.slice(0, 10),
        pricingTier: 'STD',
        accountStatus: 'ACTIVE',
        notes: lead.notes || '',
        permissions: ['STUDENT'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Crear miembro de kiosco
      try {
        await setDoc(doc(db, 'kiosk_members', newUid), {
          uid: newUid,
          fullName: lead.name,
          belt: 'WHITE',
          stripes: 0,
          accountStatus: 'ACTIVE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {}

      // Marcar lead como CONVERTED
      await updateDoc(doc(db, 'leads', lead.id), {
        status: 'CONVERTED',
        convertedAt: serverTimestamp(),
      });

      showNotification(`${lead.name} convertido en alumno activo.`);
      await fetchData();
      setView('ACTIVOS');
      const newUserDoc = {
        uid: newUid,
        alias: lead.name,
        contactEmail: lead.email || '',
        phone: lead.phone || '',
        birthDate: '1995-01-01',
        isMinor: false,
        beltSystem: 'ADULT' as BeltSystem,
        belt: 'WHITE' as Belt,
        stripes: 0,
        beltDate: nowIso.slice(0, 10),
        pricingTier: 'STD' as PricingTier,
        activeTariffId: '',
        authEmail: lead.email || '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        accountStatus: 'ACTIVE' as AccountStatus,
        permissions: ['STUDENT'],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      syncFormsWithUser(newUserDoc);
    } catch (err) {
      console.error('Error al convertir lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Crear Nuevo Alumno / Interesado desde el Modal Principal
  const handleCreateStudentOrLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!altaForm.alias.trim()) return;

    setActionLoading(true);
    try {
      if (altaForm.isLeadOnly) {
        // Guardar como Lead en el embudo
        const newLeadRef = doc(collection(db, 'leads'));
        await setDoc(newLeadRef, {
          name: altaForm.alias.trim(),
          email: altaForm.email.trim().toLowerCase(),
          phone: altaForm.phone.trim(),
          status: 'NEW',
          notes: altaForm.notes.trim(),
          createdAt: serverTimestamp(),
        });
        showNotification(`Interesado ${altaForm.alias} registrado.`);
        setAltaModalOpen(false);
        await fetchData();
        setView('INTERESADOS');
      } else {
        // Alta oficial: cuenta real en Firebase Auth + ficha con el UID real (función de servidor).
        // Así el alumno puede entrar luego con Google (mismo email) o con contraseña.
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
            // sin permiso de portapapeles: el alumno puede usar Google o "He olvidado mi contraseña"
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
        syncFormsWithUser(createdUser);
      }
    } catch (err) {
      console.error('Error al crear alumno:', err);
      showNotification(`No se pudo dar de alta al alumno: ${err instanceof Error ? err.message : 'error desconocido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Registrar Cobro Rápido en la Ficha
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
        baseCents: Math.round(amountNum * 100),
        vatCents: 0,
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

  // Datos derivados del alumno seleccionado
  const selectedUserBookings = useMemo(() => {
    if (!selectedUser) return [];
    return (bookingsByUid.get(selectedUser.uid) || []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedUser, bookingsByUid]);

  const selectedUserPayments = useMemo(() => {
    if (!selectedUser) return [];
    return (paymentsByUid.get(selectedUser.uid) || []).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [selectedUser, paymentsByUid]);

  const selectedUserAge = useMemo(() => {
    if (!selectedUser?.birthDate) return null;
    return calculateExactAge(selectedUser.birthDate, now);
  }, [selectedUser]);

  // Indicador de ciclo de vida del alumno
  const getLifecycleStage = (user: UserDomainModel | null, lead: LeadModel | null) => {
    if (lead) {
      if (lead.status === 'SCHEDULED' || lead.status === 'ATTENDED') return 2; // Prueba
      return 1; // Interesado
    }
    if (user) {
      if (user.accountStatus === 'TRIAL') return 2; // Prueba
      if (user.accountStatus === 'PENDING') return 3; // Alta en proceso
      return 4; // Activo
    }
    return 1;
  };

  const currentStage = getLifecycleStage(selectedUser, selectedLead);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. CABECERA SUPERIOR Y FILTROS DE CICLO DE VIDA         */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 font-headline">
            Gestión de Alumnos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Censo de tatami, control de cinturones, cuotas y seguimiento integral del alumno.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportStudentsToCsv(users)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Descargar censo en CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* ÚNICO BOTÓN ROJO DE ACCIÓN PRINCIPAL */}
          <button
            type="button"
            onClick={() => {
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
                isLeadOnly: false,
                notes: '',
              });
              setAltaModalOpen(true);
            }}
            className="px-4 py-2 bg-studio-red hover:bg-studio-red/90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dar de alta alumno</span>
          </button>
        </div>
      </div>

      {/* Alerta de notificación flotante de éxito */}
      {saveSuccessNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Barra de 3 vistas superiores: Interesados, Activos y Bajas */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setView('INTERESADOS');
              setSelectedUser(null);
              setSelectedLead(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              view === 'INTERESADOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Interesados</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                view === 'INTERESADOS' ? 'bg-amber-400 text-slate-950' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {counts.interesados}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView('ACTIVOS');
              setSelectedLead(null);
              if (activosList.length > 0 && !selectedUser) {
                syncFormsWithUser(activosList[0]);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              view === 'ACTIVOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Activos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                view === 'ACTIVOS' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {counts.activos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView('BAJAS');
              setSelectedUser(null);
              setSelectedLead(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              view === 'BAJAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Bajas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                view === 'BAJAS' ? 'bg-rose-400 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {counts.bajas}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Selector de Modo: Cartas FIFA vs Ficha y Gestión */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl gap-0.5 border border-slate-300/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setDisplayMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'CARDS'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-950" />
              <span>Cartas FIFA ({cardAthletes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'LIST'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-slate-400" />
              <span>Ficha y Gestión</span>
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>
      </div>

      {displayMode === 'CARDS' ? (
        <div className="space-y-4">
          {/* Sub-barra de filtros de cinturón para el Álbum de Cartas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 shrink-0">
                Cinturón:
              </span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'WHITE', label: '⚪ Blanco' },
                { id: 'BLUE', label: '🔵 Azul' },
                { id: 'PURPLE', label: '🟣 Morado' },
                { id: 'BROWN', label: '🟤 Marrón' },
                { id: 'BLACK', label: '⚫ Negro' },
                { id: 'KIDS', label: '🥋 Kids' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCardBeltFilter(b.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    cardBeltFilter === b.id
                      ? 'bg-slate-900 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono font-bold text-slate-500 px-2">
              Mostrando <strong className="text-slate-900">{cardAthletes.length}</strong> cartas de atletas
            </div>
          </div>

          {/* Grid de Cartas FIFA Ultimate Team */}
          {cardAthletes.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No se encontraron cartas con los filtros seleccionados.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCardBeltFilter('ALL');
                }}
                className="mt-3 text-xs font-bold text-brand-accent hover:underline cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cardAthletes.map((athlete) => (
                <div
                  key={athlete.uid}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-subtle hover:shadow-md transition-all flex flex-col items-center justify-between gap-3 group hover:border-slate-400"
                >
                  <div
                    onClick={() => setModalCardUser(athlete)}
                    className="w-full flex justify-center cursor-pointer transition-transform duration-200 group-hover:scale-[1.03]"
                    title={`Ver cromo completo de ${athlete.alias}`}
                  >
                    <FifaFighterCard athlete={athlete} size="sm" />
                  </div>

                  <div className="w-full flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalCardUser(athlete)}
                      className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer text-center"
                    >
                      Cromo FUT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncFormsWithUser(athlete);
                        setDisplayMode('LIST');
                      }}
                      className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer text-center"
                    >
                      Ver Ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* 2. CONTENEDOR MAESTRO-DETALLE (DOS COLUMNAS)             */
        /* ======================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[640px]">
        {/* ------------------------------------------------------ */}
        {/* COLUMNA IZQUIERDA: LISTA MAESTRA (Oculta en móvil si   */}
        {/* hay seleccionado)                                      */}
        {/* ------------------------------------------------------ */}
        <div
          className={`${
            (selectedUser || selectedLead) ? 'hidden lg:block' : 'block'
          } lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-subtle overflow-hidden flex flex-col h-[700px]`}
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>
              {view === 'ACTIVOS' && `Alumnos Activos (${activosList.length})`}
              {view === 'INTERESADOS' && `Prospectos (${counts.interesados})`}
              {view === 'BAJAS' && `Alumnos en Baja (${bajasList.length})`}
            </span>
            <span className="text-[10px] lowercase font-normal text-slate-400">click para ficha</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                <span>Cargando tatami...</span>
              </div>
            ) : view === 'INTERESADOS' ? (
              // Vista Interesados: Leads + Trial Users
              <div>
                {(filteredVisibleItems as any).leads?.map((lead: LeadModel) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleSelectLead(lead)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition cursor-pointer ${
                      selectedLead?.id === lead.id
                        ? 'bg-amber-50/80 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0">
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-900 truncate">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{lead.phone || lead.email}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                      {lead.status === 'SCHEDULED' ? 'Prueba agendada' : 'Lead'}
                    </span>
                  </button>
                ))}

                {(filteredVisibleItems as any).trialUsers?.map((u: UserDomainModel) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => syncFormsWithUser(u)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition cursor-pointer ${
                      selectedUser?.uid === u.uid
                        ? 'bg-amber-50/80 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Avatar className="w-9 h-9 shrink-0 border border-slate-200">
                        {u.photoUrl && <AvatarImage src={u.photoUrl} alt={u.alias} />}
                        <AvatarFallback className="text-xs font-bold bg-slate-200 text-slate-700">
                          {u.alias.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-900 truncate">{u.alias}</div>
                        <div className="text-[11px] text-slate-400 truncate">{u.contactEmail}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                      Clase Prueba
                    </span>
                  </button>
                ))}

                {(filteredVisibleItems as any).leads?.length === 0 &&
                  (filteredVisibleItems as any).trialUsers?.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No hay prospectos o pruebas pendientes.
                    </div>
                  )}
              </div>
            ) : (
              // Vista Alumnos (Activos o Bajas)
              <div>
                {(filteredVisibleItems as UserDomainModel[]).map((u) => {
                  const isSelected = selectedUser?.uid === u.uid;
                  const risk = getRetentionRisk(u);

                  return (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => syncFormsWithUser(u)}
                      className={`w-full text-left p-3.5 flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100/90 border-l-4 border-slate-900'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Avatar className="w-9 h-9 shrink-0 border border-slate-200">
                          {u.photoUrl && <AvatarImage src={u.photoUrl} alt={u.alias} />}
                          <AvatarFallback className="text-xs font-bold bg-slate-900 text-white">
                            {u.alias.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 truncate">{u.alias}</span>
                            {risk === 'HIGH' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Riesgo de abandono" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <span>{u.belt}</span>
                            <span>•</span>
                            <span>{u.stripes} {u.stripes === 1 ? 'raya' : 'rayas'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            u.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.accountStatus === 'FROZEN'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.accountStatus === 'ACTIVE'
                            ? 'Al día'
                            : u.accountStatus === 'FROZEN'
                            ? 'Pausa'
                            : 'Baja'}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {TIER_PRICES[u.pricingTier]?.price || '65 €'}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {(filteredVisibleItems as UserDomainModel[]).length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No se encontraron alumnos con el filtro actual.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* COLUMNA DERECHA: FICHA DE DETALLE DEL ALUMNO           */}
        {/* ------------------------------------------------------ */}
        <div
          className={`${
            (!selectedUser && !selectedLead) ? 'hidden lg:block' : 'block'
          } lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-subtle flex flex-col min-h-[700px] overflow-hidden`}
        >
          {selectedLead ? (
            // ====================================================
            // DETALLE DE LEAD / INTERESADO
            // ====================================================
            <div className="p-5 sm:p-6 space-y-6">
              {/* Botón Volver en móvil */}
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="lg:hidden flex items-center gap-1 text-xs font-bold text-slate-600 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a la lista
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black text-lg flex items-center justify-center">
                    {selectedLead.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 font-headline uppercase">
                      {selectedLead.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Prospecto interesado en el tatami • {selectedLead.status}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleConvertLeadToStudent(selectedLead)}
                  disabled={actionLoading}
                  className="bg-studio-red hover:bg-studio-red/90 text-white font-bold text-xs uppercase"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> Convertir en Alumno Activo
                </Button>
              </div>

              {/* Barra de Etapa */}
              <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Ciclo de Vida
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Interesado</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">2</span>
                    <span>Clase Prueba</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                    <span>Alta Socio</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">4</span>
                    <span>Activo Tatami</span>
                  </div>
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Teléfono
                  </span>
                  <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-900">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{selectedLead.phone || 'No indicado'}</span>
                  </div>
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold mt-2 hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
                    </a>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Email
                  </span>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 truncate">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedLead.email || 'No indicado'}</span>
                  </div>
                </div>
              </div>

              {/* Notas del lead */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  Notas de seguimiento
                </span>
                <p className="text-xs text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-200/60 min-h-[80px]">
                  {selectedLead.notes || 'Sin observaciones registradas.'}
                </p>
              </div>
            </div>
          ) : selectedUser ? (
            // ====================================================
            // DETALLE DE ALUMNO (MAESTRO-DETALLE COMPLETO)
            // ====================================================
            <div className="flex flex-col h-full">
              {/* Botón Volver en móvil */}
              <div className="p-4 lg:hidden border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al listado
                </button>
              </div>

              {/* Cabecera de la Ficha */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-14 h-14 border-2 border-slate-300">
                      {selectedUser.photoUrl && <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.alias} />}
                      <AvatarFallback className="text-lg font-black bg-slate-900 text-white">
                        {selectedUser.alias.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => setUploaderOpen(true)}
                      className="absolute inset-0 bg-slate-900/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] font-bold"
                    >
                      Foto
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 font-headline uppercase">
                        {selectedUser.alias}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          selectedUser.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedUser.accountStatus === 'FROZEN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedUser.accountStatus}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{selectedUser.contactEmail}</span>
                      {selectedUser.phone && (
                        <>
                          <span>•</span>
                          <span>{selectedUser.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de Cuenta */}
                <div className="flex items-center gap-2">
                  {selectedUser.accountStatus === 'ACTIVE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setFreezeModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeactivateModalOpen(true)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Baja
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivateUser(selectedUser.uid)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Reactivar Alumno
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de Etapa de Ciclo de Vida */}
              <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Etapa
                </span>
                <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
                  <span className={`flex items-center gap-1 font-bold ${currentStage >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${currentStage >= 1 ? 'text-emerald-500' : 'text-slate-300'}`} />
                    Interesado
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className={`flex items-center gap-1 font-bold ${currentStage >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${currentStage >= 2 ? 'text-emerald-500' : 'text-slate-300'}`} />
                    Prueba
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className={`flex items-center gap-1 font-bold ${currentStage >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${currentStage >= 3 ? 'text-emerald-500' : 'text-slate-300'}`} />
                    Alta
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className={`flex items-center gap-1 font-bold ${currentStage >= 4 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${currentStage >= 4 ? 'text-emerald-500' : 'text-slate-300'}`} />
                    Activo
                  </span>
                </div>
              </div>

              {/* Navegación de 5 pestañas de la Ficha (¡SIN SALUD!) */}
              <div className="flex border-b border-slate-200/80 px-5 bg-white">
                <button
                  type="button"
                  onClick={() => setActiveTab('resumen')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'resumen'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Resumen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('datos')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'datos'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Datos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cinturon')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'cinturon'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Cinturón
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pagos')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'pagos'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Pagos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('asistencia')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'asistencia'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Asistencia
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('carta')}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'carta'
                      ? 'border-amber-500 text-amber-700 font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Carta FIFA</span>
                </button>
              </div>

              {/* Contenido de la pestaña activa */}
              <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
                {/* ---------------- PESTAÑA 1: RESUMEN ---------------- */}
                {activeTab === 'resumen' && (
                  <div className="space-y-5">
                    {/* Tarjetas KPI */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Tarifa Cuota
                        </span>
                        <span className="text-lg font-black text-slate-900 block mt-0.5">
                          {TIER_PRICES[selectedUser.pricingTier]?.price || '65 €'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {TIER_PRICES[selectedUser.pricingTier]?.name}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Graduación
                        </span>
                        <span className="text-lg font-black text-slate-900 block mt-0.5">
                          {selectedUser.belt}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {selectedUser.stripes} {selectedUser.stripes === 1 ? 'raya' : 'rayas'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Clases (60d)
                        </span>
                        <span className="text-lg font-black text-slate-900 block mt-0.5 font-mono">
                          {selectedUserBookings.length}
                        </span>
                        <span className="text-[10px] text-slate-500">sesiones tatami</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Retención
                        </span>
                        <span className="text-lg font-black text-slate-900 block mt-0.5">
                          {getRetentionRisk(selectedUser) === 'HIGH' ? (
                            <span className="text-rose-600">Alerta</span>
                          ) : (
                            <span className="text-emerald-600">Constante</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500">asistencia mensual</span>
                      </div>
                    </div>

                    {/* Últimas sesiones en tatami */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                        Últimas clases registradas
                      </span>
                      {selectedUserBookings.slice(0, 3).length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden">
                          {selectedUserBookings.slice(0, 3).map((b) => (
                            <div key={b.id} className="p-3 flex items-center justify-between bg-white text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">{b.date}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
                                Asistencia confirmada
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                          Sin asistencias en los últimos 60 días.
                        </p>
                      )}
                    </div>

                    {/* Observaciones Generales (No médicas) */}
                    <div className="space-y-1.5">
                      <label htmlFor="student-notes" className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                        Observaciones y Notas Internas
                      </label>
                      <textarea
                        id="student-notes"
                        rows={3}
                        value={datosForm.notes}
                        onChange={(e) => setDatosForm({ ...datosForm, notes: e.target.value })}
                        placeholder="Añadir notas de seguimiento técnico, objetivos deportivos o comentarios..."
                        className="w-full p-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:border-slate-800"
                      />
                      <Button
                        onClick={handleSaveDatos}
                        disabled={actionLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                      >
                        Guardar Observaciones
                      </Button>
                    </div>
                  </div>
                )}

                {/* ---------------- PESTAÑA 2: DATOS ---------------- */}
                {activeTab === 'datos' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveDatos();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Nombre completo / Alias
                        </label>
                        <Input
                          value={datosForm.alias}
                          onChange={(e) => setDatosForm({ ...datosForm, alias: e.target.value })}
                          required
                          className="bg-slate-50 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Email de contacto
                        </label>
                        <Input
                          type="email"
                          value={datosForm.contactEmail}
                          onChange={(e) => setDatosForm({ ...datosForm, contactEmail: e.target.value })}
                          required
                          className="bg-slate-50 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Teléfono
                        </label>
                        <Input
                          type="tel"
                          value={datosForm.phone}
                          onChange={(e) => setDatosForm({ ...datosForm, phone: e.target.value })}
                          className="bg-slate-50 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Fecha de Nacimiento
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={datosForm.birthDate}
                            onChange={(e) => setDatosForm({ ...datosForm, birthDate: e.target.value })}
                            className="bg-slate-50 text-xs flex-1"
                          />
                          {selectedUserAge !== null && (
                            <span className="text-xs text-slate-500 font-mono shrink-0">
                              {selectedUserAge} años
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Contacto de Emergencia (Nombre)
                        </label>
                        <Input
                          value={datosForm.emergencyContactName}
                          onChange={(e) =>
                            setDatosForm({ ...datosForm, emergencyContactName: e.target.value })
                          }
                          className="bg-slate-50 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Contacto de Emergencia (Teléfono)
                        </label>
                        <Input
                          type="tel"
                          value={datosForm.emergencyContactPhone}
                          onChange={(e) =>
                            setDatosForm({ ...datosForm, emergencyContactPhone: e.target.value })
                          }
                          className="bg-slate-50 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        Guardar Cambios
                      </Button>
                    </div>
                  </form>
                )}

                {/* ---------------- PESTAÑA 3: CINTURÓN ---------------- */}
                {activeTab === 'cinturon' && (
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Cinturón Adultos
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {ADULT_BELTS.map((belt) => (
                          <button
                            key={belt.value}
                            type="button"
                            onClick={() => setBeltForm({ ...beltForm, belt: belt.value })}
                            className={`p-3 rounded-xl text-center border-2 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              beltForm.belt === belt.value
                                ? 'border-slate-900 shadow-md ring-2 ring-slate-900/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-8 h-3 rounded-xs ${belt.bg} inline-block`} />
                            <span className="text-xs font-bold text-slate-800">{belt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Cinturones Infantiles (Kids)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {KIDS_BELTS.map((belt) => (
                          <button
                            key={belt.value}
                            type="button"
                            onClick={() => setBeltForm({ ...beltForm, belt: belt.value })}
                            className={`p-2 rounded-xl text-center border-2 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              beltForm.belt === belt.value
                                ? 'border-slate-900 shadow-md ring-2 ring-slate-900/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-6 h-2 rounded-xs ${belt.bg} inline-block`} />
                            <span className="text-[10px] font-bold text-slate-800 truncate w-full">{belt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Grados / Rayas (0 a 4)
                      </span>
                      <div className="flex items-center gap-2">
                        {[0, 1, 2, 3, 4].map((stripe) => (
                          <button
                            key={stripe}
                            type="button"
                            onClick={() => setBeltForm({ ...beltForm, stripes: stripe })}
                            className={`w-12 h-12 rounded-xl text-sm font-bold border-2 transition cursor-pointer flex items-center justify-center ${
                              beltForm.stripes === stripe
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {stripe === 0 ? 'Sin rayas' : `${stripe}ª`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Al guardar, se sincronizará automáticamente el rango del alumno en el tablet del Kiosco de recepción y tatami.
                      </span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={handleSaveGraduacion}
                        disabled={actionLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        Guardar Graduación
                      </Button>
                    </div>
                  </div>
                )}

                {/* ---------------- PESTAÑA 4: PAGOS ---------------- */}
                {activeTab === 'pagos' && (
                  <div className="space-y-6">
                    {/* Tarifa asignada */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Tarifa de Mensualidad
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(['STD', 'SF', 'FAM'] as PricingTier[]).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => handleSaveTariff(tier)}
                            className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                              tierForm === tier
                                ? 'border-slate-900 bg-slate-50/80 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-900 block">
                              {TIER_PRICES[tier].name}
                            </span>
                            <span className="text-sm font-black text-slate-900 mt-1 block">
                              {TIER_PRICES[tier].price} / mes
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botón Registrar Cobro */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Historial de Cobros
                      </span>
                      <Button
                        onClick={() => setQuickPaymentModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Registrar Cobro
                      </Button>
                    </div>

                    {/* Tabla de Cobros */}
                    {selectedUserPayments.length > 0 ? (
                      <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                        {selectedUserPayments.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between bg-white">
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {p.concept || 'Cuota mensual tatami'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Periodo: {p.period} • Método: {p.method}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 block">
                                {((p.amountCents || 6500) / 100).toFixed(2)} €
                              </span>
                              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                        No hay cobros registrados en el sistema para este alumno.
                      </p>
                    )}
                  </div>
                )}

                {/* ---------------- PESTAÑA 5: ASISTENCIA ---------------- */}
                {activeTab === 'asistencia' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Total Asistencias
                        </span>
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {selectedUserBookings.length}
                        </span>
                        <span className="text-[10px] text-slate-500 block">últimos 60 días</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Media Semanal
                        </span>
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {(selectedUserBookings.length / 8.5).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">clases / semana</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Estado Tatami
                        </span>
                        <span className="text-base font-bold text-emerald-700 block">
                          {selectedUserBookings.length >= 8 ? 'Alta Frecuencia' : 'Ritmo Regular'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">compromiso activo</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                        Registro de Clases Asistidas
                      </span>
                      {selectedUserBookings.length > 0 ? (
                        <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs max-h-[320px] overflow-y-auto">
                          {selectedUserBookings.map((b) => (
                            <div key={b.id} className="p-3 flex items-center justify-between bg-white">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-bold text-slate-900">{b.date}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">{b.sessionType || 'Clase regular'}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800">
                                Asistió
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                          Sin clases registradas en el periodo.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ---------------- PESTAÑA 6: CARTA FIFA FUT ---------------- */}
                {activeTab === 'carta' && (
                  <div className="py-2">
                    <FighterCard user={selectedUser} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ====================================================
            // ESTADO VACÍO (NINGÚN ALUMNO SELECCIONADO)
            // ====================================================
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <User className="w-12 h-12 stroke-1 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Selecciona un alumno o interesado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Haz clic en cualquier persona de la lista izquierda para consultar o editar su ficha completa.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal Cromo FIFA FUT (Vista previa interactiva) */}
      <Dialog open={!!modalCardUser} onOpenChange={(open) => !open && setModalCardUser(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          {modalCardUser && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <DialogTitle className="text-xl font-black uppercase text-slate-900 font-headline">
                    Carta Oficial — {modalCardUser.alias}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Cromo coleccionable FIFA Ultimate Team y radar de habilidades.
                  </DialogDescription>
                </div>
                <Button
                  onClick={() => {
                    syncFormsWithUser(modalCardUser);
                    setModalCardUser(null);
                    setDisplayMode('LIST');
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Abrir Ficha de Alumno
                </Button>
              </div>
              <FighterCard user={modalCardUser} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 3. MODALES DE ACCIÓN RÁPIDA (RADIX DIALOG)              */}
      {/* ======================================================== */}

      {/* Modal 1: Dar de alta alumno / Interesado */}
      <Dialog open={altaModalOpen} onOpenChange={setAltaModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-900 font-headline">
              {altaForm.isLeadOnly ? 'Registrar Interesado' : 'Dar de alta Alumno'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {altaForm.isLeadOnly
                ? 'Añadir un nuevo contacto interesado al embudo de prospectos.'
                : 'Registrar un nuevo atleta activo con acceso a tatami y clases.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStudentOrLead} className="space-y-3.5 mt-2">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAltaForm({ ...altaForm, isLeadOnly: false })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  !altaForm.isLeadOnly ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Alumno Activo
              </button>
              <button
                type="button"
                onClick={() => setAltaForm({ ...altaForm, isLeadOnly: true })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  altaForm.isLeadOnly ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Sólo Interesado (Lead)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre completo / Alias *</label>
              <Input
                value={altaForm.alias}
                onChange={(e) => setAltaForm({ ...altaForm, alias: e.target.value })}
                placeholder="Ej. Mario Silva"
                required
                className="bg-slate-50 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                <Input
                  type="email"
                  value={altaForm.email}
                  onChange={(e) => setAltaForm({ ...altaForm, email: e.target.value })}
                  placeholder="alumno@ejemplo.com"
                  className="bg-slate-50 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono</label>
                <Input
                  type="tel"
                  value={altaForm.phone}
                  onChange={(e) => setAltaForm({ ...altaForm, phone: e.target.value })}
                  placeholder="600 000 000"
                  className="bg-slate-50 text-xs"
                />
              </div>
            </div>

            {!altaForm.isLeadOnly && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Cinturón</label>
                    <select
                      value={altaForm.belt}
                      onChange={(e) => setAltaForm({ ...altaForm, belt: e.target.value as Belt })}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                    >
                      {ADULT_BELTS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa Mensual</label>
                    <select
                      value={altaForm.pricingTier}
                      onChange={(e) => setAltaForm({ ...altaForm, pricingTier: e.target.value as PricingTier })}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                    >
                      <option value="STD">Estándar (65 €)</option>
                      <option value="SF">Sin Fin / Ilimitado (85 €)</option>
                      <option value="FAM">Familiar (55 €)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Nacimiento</label>
                  <Input
                    type="date"
                    value={altaForm.birthDate}
                    onChange={(e) => setAltaForm({ ...altaForm, birthDate: e.target.value })}
                    className="bg-slate-50 text-xs"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Notas iniciales</label>
              <textarea
                rows={2}
                value={altaForm.notes}
                onChange={(e) => setAltaForm({ ...altaForm, notes: e.target.value })}
                placeholder="Observaciones de inscripción..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAltaModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-studio-red hover:bg-studio-red/90 text-white font-bold text-xs uppercase"
              >
                {altaForm.isLeadOnly ? 'Registrar Interesado' : 'Completar Alta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Congelar / Pausar Alumno */}
      <Dialog open={freezeModalOpen} onOpenChange={setFreezeModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900 font-headline">
              Pausar membresía de alumno
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pausar la cuota y acceso de {selectedUser?.alias}. Podrás reactivarlo en cualquier momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Motivo de la pausa</label>
              <Input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Ej. Vacaciones, viaje de trabajo, etc."
                className="bg-slate-50 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setFreezeModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmFreeze}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              Confirmar Pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Dar de Baja Alumno */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-rose-700 font-headline">
              Dar de baja definitiva
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ¿Confirmas la baja de {selectedUser?.alias}? El alumno pasará a la lista de Bajas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeactivateModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDeactivate}
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Confirmar Baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Registrar Cobro Rápido */}
      <Dialog open={quickPaymentModalOpen} onOpenChange={setQuickPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900 font-headline">
              Registrar Cobro
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrar pago de mensualidad para {selectedUser?.alias}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Importe (€)</label>
              <Input
                type="number"
                value={quickPaymentForm.amount}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, amount: e.target.value })}
                className="bg-slate-50 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Método de Cobro</label>
              <select
                value={quickPaymentForm.method}
                onChange={(e) =>
                  setQuickPaymentForm({
                    ...quickPaymentForm,
                    method: e.target.value as 'BIZUM' | 'CASH' | 'CARD',
                  })
                }
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
              >
                <option value="BIZUM">Bizum</option>
                <option value="CASH">Efectivo en recepción</option>
                <option value="CARD">Tarjeta de crédito</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Concepto</label>
              <Input
                value={quickPaymentForm.concept}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, concept: e.target.value })}
                className="bg-slate-50 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setQuickPaymentModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterQuickPayment}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Guardar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Subir Foto de Perfil */}
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
