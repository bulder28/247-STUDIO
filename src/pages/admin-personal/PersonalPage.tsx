import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Award,
  Camera,
  Download,
  HeartPulse,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/shared/api/firebase';
import { deriveRetentionRisk } from '@/shared/domain/attendance';
import { calculateExactAge } from '@/shared/domain/minor';
import { SAMPLE_ATHLETES_20 } from '@/shared/mock/sampleAthletes';
import {
  AccountStatus,
  AdultBelt,
  Belt,
  BookingDomainModel,
  FighterStats,
  KidsBelt,
  PricingTier,
  RetentionRisk,
  UserDomainModel,
} from '@/shared/domain/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { exportStudentsToCsv } from '@/shared/utils/csvExporter';
import { BeltStatisticsCard, BeltStatsData } from '@/widgets/BeltStatisticsCard';
import { FifaFighterCard } from '@/widgets/FifaFighterCard';
import { FighterRadarChart } from '@/widgets/FighterRadarChart';
import { PhotoUploaderModal } from '@/widgets/PhotoUploaderModal';

export const PersonalPage: React.FC = () => {
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | PricingTier>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RetentionRisk>('ALL');
  const [beltFilter, setBeltFilter] = useState<string>('ALL');
  const [displayMode, setDisplayMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [includeMockAthletes, setIncludeMockAthletes] = useState(false);
  const [modalPreviewMode, setModalPreviewMode] = useState<'RADAR' | 'CARD'>('CARD');
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDomainModel | null>(null);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  const [editingBelt, setEditingBelt] = useState<Belt>('WHITE');
  const [editingStripes, setEditingStripes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para modales Radix Dialog (sustituyen prompt y confirm)
  const [freezeUserTarget, setFreezeUserTarget] = useState<UserDomainModel | null>(null);
  const [freezeReason, setFreezeReason] = useState('Lesión deportiva');
  const [deactivateUserTarget, setDeactivateUserTarget] = useState<UserDomainModel | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const now = new Date();

  const fetchUsersAndHistory = async () => {
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const minDateStr = sixtyDaysAgo.toISOString().slice(0, 10);

      const bookingsQuery = query(collection(db, 'bookings'), where('date', '>=', minDateStr));
      const [usersSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(bookingsQuery),
      ]);

      const uList: UserDomainModel[] = [];
      usersSnap.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      setUsers(uList);

      const bList: BookingDomainModel[] = [];
      bookingsSnap.forEach((d) => bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
      setBookings(bList);
    } catch (err) {
      console.error('Error fetching admin personal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndHistory();
  }, []);

  // Pre-indexación O(B) en memoria mediante useMemo para búsquedas O(1)
  const bookingsByUid = React.useMemo(() => {
    const map = new Map<string, BookingDomainModel[]>();
    for (const b of bookings) {
      const list = map.get(b.uid);
      if (list) {
        list.push(b);
      } else {
        map.set(b.uid, [b]);
      }
    }
    return map;
  }, [bookings]);

  // Consulta de riesgo O(1) por usuario
  const getRetentionRiskForUser = React.useCallback(
    (user: UserDomainModel): RetentionRisk => {
      if (user.accountStatus === 'FROZEN' || user.accountStatus === 'PAUSED') {
        return 'LOW';
      }
      const userBookings = bookingsByUid.get(user.uid) || [];
      return deriveRetentionRisk(userBookings, now);
    },
    [bookingsByUid, now]
  );

  const handleActivateUser = async (uid: string) => {
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
      } catch {
        // kiosk_member might not exist yet
      }
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error activating user:', err);
    }
  };

  const handleConfirmFreeze = async () => {
    if (!freezeUserTarget) return;
    setActionInProgress(true);
    try {
      await updateDoc(doc(db, 'users', freezeUserTarget.uid), {
        accountStatus: 'FROZEN',
        freezeReason: freezeReason.trim() || 'Lesión deportiva',
        frozenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'kiosk_members', freezeUserTarget.uid), {
          accountStatus: 'PAUSED',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // kiosk_member might not exist yet
      }
      setFreezeUserTarget(null);
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error freezing user:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateUserTarget) return;
    setActionInProgress(true);
    try {
      await updateDoc(doc(db, 'users', deactivateUserTarget.uid), {
        accountStatus: 'INACTIVE',
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'kiosk_members', deactivateUserTarget.uid), {
          accountStatus: 'INACTIVE',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // kiosk_member might not exist yet
      }
      setDeactivateUserTarget(null);
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error deactivating user:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const openEditor = (user: UserDomainModel) => {
    setSelectedUser(user);
    setEditingBelt(user.belt || 'WHITE');
    setEditingStripes(user.stripes || 0);
    setEditingStats(
      user.stats || {
        tecnica: 50,
        fuerza: 50,
        elasticidad: 50,
        guardia: 50,
        pase: 50,
        derribos: 50,
        leglocks: 50,
        finalizacion: 50,
      }
    );
  };

  const handleSaveEditor = async () => {
    if (!selectedUser || !editingStats) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        belt: editingBelt,
        stripes: editingStripes,
        stats: editingStats,
        updatedAt: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'kiosk_members', selectedUser.uid), {
          belt: editingBelt,
          stripes: editingStripes,
          fullName: (selectedUser as any).fullName || selectedUser.alias || '',
          accountStatus: selectedUser.accountStatus || 'ACTIVE',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // kiosk_member might not exist yet
      }

      setSelectedUser(null);
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error saving user editor:', err);
    } finally {
      setSaving(false);
    }
  };

  // 20 Atletas de muestra combinados para visualización top
  const effectiveUsers = React.useMemo(() => {
    if (!includeMockAthletes) return users;
    const realUids = new Set(users.map((u) => u.uid));
    const mocks = SAMPLE_ATHLETES_20.filter((m) => !realUids.has(m.uid));
    return [...users, ...mocks];
  }, [users, includeMockAthletes]);

  // Resumen del Radar Anti-Abandono
  const retentionStats = React.useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    effectiveUsers.forEach((u) => {
      if (u.accountStatus !== 'ACTIVE') return;
      const risk = getRetentionRiskForUser(u);
      if (risk === 'HIGH') high++;
      else if (risk === 'MEDIUM') medium++;
      else low++;
    });

    return { high, medium, low };
  }, [effectiveUsers, getRetentionRiskForUser]);

  const isKidBelt = (b: Belt) =>
    b.includes('GREY') || b.includes('YELLOW') || b.includes('ORANGE') || b.includes('GREEN');

  const isProfessorUser = (u: UserDomainModel) => {
    const isCoach =
      u.alias?.toLowerCase().includes('mario') ||
      u.alias?.toLowerCase().includes('david') ||
      u.permissions?.includes('ADMIN') ||
      u.permissions?.includes('COACH');
    return isCoach && (u.belt === 'BLACK' || u.belt === 'BROWN');
  };

  const profesorCount = effectiveUsers.filter(isProfessorUser).length;
  const blackCount = effectiveUsers.filter((u) => u.belt === 'BLACK').length;
  const brownCount = effectiveUsers.filter((u) => u.belt === 'BROWN').length;
  const purpleCount = effectiveUsers.filter((u) => u.belt === 'PURPLE').length;
  const blueCount = effectiveUsers.filter((u) => u.belt === 'BLUE').length;
  const whiteCount = effectiveUsers.filter((u) => u.belt === 'WHITE').length;

  const beltStatsData: BeltStatsData = {
    profesorCount,
    blackCount,
    brownCount,
    purpleCount,
    blueCount,
    whiteCount,
    totalCount: effectiveUsers.length,
  };

  const filteredUsers = effectiveUsers.filter((u) => {
    const matchesSearch =
      u.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter;
    const matchesTier = tierFilter === 'ALL' || u.pricingTier === tierFilter;
    const userRisk = getRetentionRiskForUser(u);
    const matchesRisk = riskFilter === 'ALL' || userRisk === riskFilter;

    const matchesBelt =
      beltFilter === 'ALL' ||
      (beltFilter === 'PROFESOR'
        ? isProfessorUser(u)
        : beltFilter === 'KIDS'
        ? isKidBelt(u.belt)
        : u.belt === beltFilter);

    return matchesSearch && matchesStatus && matchesTier && matchesRisk && matchesBelt;
  });

  const adultBelts: AdultBelt[] = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
  const kidsBelts: KidsBelt[] = [
    'WHITE',
    'GREY_WHITE',
    'GREY',
    'GREY_BLACK',
    'YELLOW_WHITE',
    'YELLOW',
    'YELLOW_BLACK',
    'ORANGE_WHITE',
    'ORANGE',
    'ORANGE_BLACK',
    'GREEN_WHITE',
    'GREEN',
    'GREEN_BLACK',
  ];

  const [mobileSection, setMobileSection] = useState<'censo' | 'cinturones' | 'retencion'>('censo');

  return (
    <div className="space-y-3 md:space-y-6 pb-2 md:pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">Alumnos</h1>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Censo oficial de atletas de 247Studio, control de cinturones, grados y radar de retención.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportStudentsToCsv(filteredUsers)}
            className="py-2 sm:py-3 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <Link
            to="/admin/alta-alumno"
            className="py-2 sm:py-3 px-3.5 sm:px-5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Alta Alumno
          </Link>
        </div>
      </div>

      {/* Selector de sub-pestañas móvil sin scroll vertical */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileSection('censo')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'censo' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          👥 Censo ({filteredUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('cinturones')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'cinturones' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          🥋 Cinturones
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('retencion')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileSection === 'retencion' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          🚨 Retención
        </button>
      </div>

      {/* ======================================================== */}
      {/* RADAR ANTI-ABANDONO (ANTI-CHURN & RETENCIÓN DE TATAMI)  */}
      {/* ======================================================== */}
      <div
        className={`${
          mobileSection === 'retencion' ? 'grid' : 'hidden md:grid'
        } grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4`}
      >
        {/* Riesgo Alto */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none shadow-xs ${
            riskFilter === 'HIGH'
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/50 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Riesgo de Abandono (Alto)
            </span>
            <Badge variant={riskFilter === 'HIGH' ? 'destructive' : 'secondary'} className="text-[9px]">
              {riskFilter === 'HIGH' ? 'Filtro activo' : 'Filtrar'}
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-900 font-mono tracking-tight">
              {retentionStats.high}
            </span>
            <span className="text-xs text-rose-700 font-medium">alumnos &gt; 12-21 días ausentes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Requieren mensaje de reactivación directa por WhatsApp.
          </p>
        </motion.div>

        {/* Riesgo Medio */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRiskFilter(riskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none shadow-xs ${
            riskFilter === 'MEDIUM'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-amber-600" /> Asistencia Irregular (Medio)
            </span>
            <Badge variant={riskFilter === 'MEDIUM' ? 'warning' : 'secondary'} className="text-[9px]">
              {riskFilter === 'MEDIUM' ? 'Filtro activo' : 'Filtrar'}
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-900 font-mono tracking-tight">
              {retentionStats.medium}
            </span>
            <span className="text-xs text-amber-700 font-medium">caída en frecuencia semanal</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Alumnos que redujeron su ritmo habitual de clases.
          </p>
        </motion.div>

        {/* Activos Saludables */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRiskFilter(riskFilter === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none shadow-xs ${
            riskFilter === 'LOW'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Frecuencia Óptima (Bajo)
            </span>
            <Badge variant={riskFilter === 'LOW' ? 'success' : 'secondary'} className="text-[9px]">
              {riskFilter === 'LOW' ? 'Filtro activo' : 'Filtrar'}
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-900 font-mono tracking-tight">
              {retentionStats.low}
            </span>
            <span className="text-xs text-emerald-700 font-medium">ritmo constante en tatami</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Alumnos fieles con asistencia periódica semanal.
          </p>
        </motion.div>
      </div>

      {/* Estadísticas de Cinturones con Cinturones Anudados */}
      <div className={mobileSection === 'cinturones' ? 'block' : 'hidden md:block'}>
        <BeltStatisticsCard
          stats={beltStatsData}
          activeFilter={beltFilter}
          onSelectBelt={(rankKey) => setBeltFilter(rankKey)}
        />
      </div>

      {/* Barra de Filtros y Censo */}
      <div className={`${mobileSection === 'censo' ? 'block' : 'hidden md:block'} space-y-3 md:space-y-6`}>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alias, email o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Toggle Vista: Cartas FIFA vs Tabla Censo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDisplayMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                displayMode === 'CARDS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" /> Cartas FIFA
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                displayMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabla Censo
            </button>
          </div>

          {/* Toggle 20 Atletas Demo para Preview Top */}
          <button
            type="button"
            onClick={() => setIncludeMockAthletes(!includeMockAthletes)}
            title="Activar o desactivar los 20 atletas de muestra con fotos y stats completas"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              includeMockAthletes
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>20 Demo: {includeMockAthletes ? 'ON' : 'OFF'}</span>
          </button>

          {beltFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setBeltFilter('ALL')}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Quitar filtro cinturón
            </button>
          )}

          {riskFilter !== 'ALL' && (
            <button
              onClick={() => setRiskFilter('ALL')}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Quitar filtro riesgo
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="FROZEN">Pausa / Lesión</option>
            <option value="PENDING">Pendientes</option>
            <option value="INACTIVE">Inactivos</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Todas las Tarifas</option>
            <option value="STD">Estándar (STD)</option>
            <option value="SF">Socio Fundador (SF)</option>
            <option value="FAM">Familiar (FAM)</option>
          </select>
        </div>
      </div>

      {/* Contenido Principal: Cartas FIFA vs Tabla Censo */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayMode === 'CARDS' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 px-1 gap-2">
            <span>
              Mostrando <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong> atletas en formato{' '}
              <span className="font-extrabold text-amber-600">FIFA Ultimate Team</span>. Haz clic en cualquier carta para ver/editar su radar y atributos.
            </span>
            {includeMockAthletes && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto">
                <Sparkles className="w-3 h-3 text-amber-600" /> 20 Atletas demo cargados
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center pt-2">
            {filteredUsers.map((athlete) => (
              <div
                key={athlete.uid}
                onClick={() => openEditor(athlete)}
                className="cursor-pointer group flex flex-col items-center"
              >
                <FifaFighterCard athlete={athlete} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-4 px-5">Atleta / Contacto</th>
                  <th className="py-4 px-4">Cinturón / Grados</th>
                  <th className="py-4 px-4">Tarifa</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4">Radar Retención</th>
                  <th className="py-4 px-4">Alertas</th>
                  <th className="py-4 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isFrozen = u.accountStatus === 'FROZEN' || u.accountStatus === 'PAUSED';
                  const retentionRisk = getRetentionRiskForUser(u);
                  const isNearAdult = u.birthDate && calculateExactAge(u.birthDate, now) === 17;
                  const hasMedicalNotes = Boolean(u.medicalNotes && u.medicalNotes.trim().length > 0);

                  const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
                  const waMessage = encodeURIComponent(
                    `Hola ${u.alias}, ¿qué tal todo? Te echamos de menos en el tatami de 247Studio. ¡Dinos si necesitas adaptar tu horario o si podemos ayudarte en algo!`
                  );

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border border-slate-200 shrink-0">
                            {u.photoUrl && <AvatarImage src={u.photoUrl} alt={u.alias} />}
                            <AvatarFallback className="bg-slate-900 text-amber-400 font-bold text-xs">
                              {u.alias.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-extrabold text-sm text-slate-900">{u.alias}</div>
                            <div className="text-[11px] text-slate-500">{u.contactEmail}</div>
                            <div className="text-[10px] text-slate-400">{u.phone || 'Sin teléfono'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 uppercase">{u.belt}</span>
                        <span className="text-slate-400 block text-[11px]">
                          {u.stripes} {u.stripes === 1 ? 'grado' : 'grados'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.pricingTier === 'SF'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.pricingTier}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            u.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isFrozen
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : u.accountStatus === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isFrozen ? '❄️ Pausa Deportiva' : u.accountStatus}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isFrozen
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : retentionRisk === 'HIGH'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : retentionRisk === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isFrozen
                              ? 'En Pausa'
                              : retentionRisk === 'HIGH'
                              ? 'Riesgo Alto'
                              : retentionRisk === 'MEDIUM'
                              ? 'Irregular'
                              : 'Al Día'}
                          </span>

                          {/* Botón WhatsApp Anti-Abandono */}
                          {!isFrozen && retentionRisk !== 'LOW' && cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Reactivar alumno por WhatsApp"
                              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        {hasMedicalNotes && (
                          <span
                            title={u.medicalNotes}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 cursor-help"
                          >
                            <HeartPulse className="w-3 h-3 text-brand-accent" /> Médica
                          </span>
                        )}

                        {isNearAdult && (
                          <span
                            title="Atleta cumple 18 años pronto. Graduación a ADULT recomendada."
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 block"
                          >
                            <AlertTriangle className="w-3 h-3 text-blue-600" /> Próximo Adulto
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right space-x-1.5">
                        {u.accountStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleActivateUser(u.uid)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] hover:bg-emerald-100 transition cursor-pointer"
                          >
                            Activar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditor(u)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-bold text-[11px] hover:bg-slate-200 transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-brand-accent" />
                          <span>Radar & Stats</span>
                        </button>

                        {isFrozen && (
                          <button
                            type="button"
                            onClick={() => handleActivateUser(u.uid)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px] hover:bg-blue-100 transition cursor-pointer"
                            title="Reactivar alumno de su pausa deportiva"
                          >
                            Reactivar
                          </button>
                        )}

                        {u.accountStatus === 'ACTIVE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setFreezeUserTarget(u);
                                setFreezeReason('Lesión deportiva');
                              }}
                              className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px] hover:bg-blue-100 transition cursor-pointer"
                              title="Pausar cuota y asistencia por lesión médica o viaje"
                            >
                              ❄️ Pausa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeactivateUserTarget(u)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold text-[11px] hover:bg-rose-100 transition cursor-pointer"
                            >
                              Baja
                            </button>
                          </>
                        )}

                        {u.accountStatus === 'INACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleActivateUser(u.uid)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold text-[11px] hover:bg-slate-200 transition cursor-pointer"
                            title="Reactivar alumno dado de baja"
                          >
                            Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Modal Editor de Cinturón, Grados y 8 Atributos con Radar FIFA en Vivo (Radix Dialog & Tabs) */}
      <Dialog
        open={!!selectedUser && !!editingStats}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {selectedUser && editingStats && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900">
                  {selectedUser.alias}
                </DialogTitle>
                <p className="text-xs text-slate-400">
                  Editor Técnico y Radar de Habilidades FIFA Ultimate Team
                </p>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Preview Interactivo con Radix Tabs: Polígono Radar vs Carta FIFA Shield */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                  <Tabs
                    defaultValue={modalPreviewMode}
                    value={modalPreviewMode}
                    onValueChange={(val) => setModalPreviewMode(val as any)}
                    className="w-full flex flex-col items-center"
                  >
                    <TabsList className="w-56 mb-3">
                      <TabsTrigger value="CARD" className="text-xs font-bold">Carta FIFA FUT</TabsTrigger>
                      <TabsTrigger value="RADAR" className="text-xs font-bold">Polígono Radar</TabsTrigger>
                    </TabsList>

                    <TabsContent value="CARD" className="py-2 flex justify-center w-full">
                      <FifaFighterCard
                        athlete={{
                          ...selectedUser,
                          belt: editingBelt,
                          stripes: editingStripes,
                          stats: editingStats,
                        }}
                        size="sm"
                      />
                    </TabsContent>

                    <TabsContent value="RADAR" className="py-2 flex justify-center w-full">
                      <FighterRadarChart stats={editingStats} alias={selectedUser.alias} size={250} />
                    </TabsContent>
                  </Tabs>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUploaderOpen(true)}
                    className="mt-3"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                    <span>Subir / Cambiar Foto de Carta</span>
                  </Button>
                </div>

                {/* Selector de Cinturón y Grados */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Cinturón
                    </label>
                    <select
                      value={editingBelt}
                      onChange={(e) => setEditingBelt(e.target.value as Belt)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    >
                      {(selectedUser.beltSystem === 'KIDS' ? kidsBelts : adultBelts).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Grados (Stripes: 0 a 4)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={4}
                      value={editingStripes}
                      onChange={(e) => setEditingStripes(parseInt(e.target.value, 10) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Sliders de los 8 Atributos */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-brand-accent" /> Ajuste de los 8 Atributos (0 a 100)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(editingStats) as (keyof FighterStats)[]).map((key) => (
                      <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                            {key}
                          </span>
                          <span className="font-mono font-black text-brand-accent">{editingStats[key]}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={editingStats[key]}
                          onChange={(e) =>
                            setEditingStats((prev) =>
                              prev ? { ...prev, [key]: parseInt(e.target.value, 10) } : prev
                            )
                          }
                          className="w-full accent-brand-accent cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 pt-3 border-t border-slate-200/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEditor}
                  variant="default"
                  className="flex-1"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Subida de Foto Autónoma para Carta FIFA */}
      {uploaderOpen && selectedUser && (
        <PhotoUploaderModal
          currentPhotoUrl={selectedUser.photoUrl}
          athleteAlias={selectedUser.alias}
          onSave={async (photoDataUrl) => {
            setSelectedUser((prev) => (prev ? { ...prev, photoUrl: photoDataUrl } : prev));
            setUsers((prev) =>
              prev.map((u) => (u.uid === selectedUser.uid ? { ...u, photoUrl: photoDataUrl } : u))
            );
            try {
              await updateDoc(doc(db, 'users', selectedUser.uid), {
                photoUrl: photoDataUrl,
                updatedAt: serverTimestamp(),
              });
            } catch {
              // En modo muestra o si falla la red, el estado local ya está actualizado
            }
          }}
          onClose={() => setUploaderOpen(false)}
        />
      )}

      {/* Modal Radix Dialog: Pausa Deportiva (sustituye prompt) */}
      <Dialog open={!!freezeUserTarget} onOpenChange={(open) => !open && setFreezeUserTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pausa Deportiva / Congelación</DialogTitle>
            <DialogDescription>
              Indica el motivo de la pausa deportiva para{' '}
              <strong className="text-slate-900">{freezeUserTarget?.alias}</strong> (ej: Lesión médica, Viaje laboral).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Motivo de la Pausa
            </label>
            <Input
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="Ej: Esguince de rodilla, Viaje laboral..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFreezeUserTarget(null)}
              disabled={actionInProgress}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirmFreeze}
              disabled={actionInProgress || !freezeReason.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionInProgress ? 'Guardando...' : 'Confirmar Pausa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Radix Dialog: Baja Alumno (sustituye confirm) */}
      <Dialog open={!!deactivateUserTarget} onOpenChange={(open) => !open && setDeactivateUserTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar de Baja al Alumno</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas pasar a <strong className="text-slate-900">{deactivateUserTarget?.alias}</strong> a estado <span className="font-bold text-rose-600">INACTIVE</span>? Perderá acceso a la reserva de clases en la app.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateUserTarget(null)}
              disabled={actionInProgress}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Procesando...' : 'Confirmar Baja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
