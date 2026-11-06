import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Award,
  HeartPulse,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { deriveRetentionRisk } from '@/shared/domain/attendance';
import { calculateExactAge } from '@/shared/domain/minor';
import {
  AccountStatus,
  AdultBelt,
  Belt,
  BookingDomainModel,
  FighterStats,
  PricingTier,
  RetentionRisk,
  UserDomainModel,
} from '@/shared/domain/types';

export const PersonalPage: React.FC = () => {
  const [users, setUsers] = useState<UserDomainModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | PricingTier>('ALL');
  const [selectedUser, setSelectedUser] = useState<UserDomainModel | null>(null);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  const [editingBelt, setEditingBelt] = useState<Belt>('WHITE');
  const [editingStripes, setEditingStripes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();

  const fetchUsersAndHistory = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList: UserDomainModel[] = [];
      usersSnap.forEach((d) => uList.push({ uid: d.id, ...(d.data() as Omit<UserDomainModel, 'uid'>) }));
      setUsers(uList);

      const bookingsSnap = await getDocs(collection(db, 'bookings'));
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

  const getRetentionRiskForUser = (uid: string): RetentionRisk => {
    const userBookings = bookings.filter((b) => b.uid === uid);
    return deriveRetentionRisk(userBookings, now);
  };

  const handleActivateUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        accountStatus: 'ACTIVE',
        updatedAt: serverTimestamp(),
      });
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error activating user:', err);
    }
  };

  const handleDeactivateUser = async (uid: string) => {
    if (!confirm('¿Seguro que deseas pasar este alumno a INACTIVE? Perderá acceso a la reserva de clases.')) {
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        accountStatus: 'INACTIVE',
        updatedAt: serverTimestamp(),
      });
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error deactivating user:', err);
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

      setSelectedUser(null);
      await fetchUsersAndHistory();
    } catch (err) {
      console.error('Error saving user editor:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter;
    const matchesTier = tierFilter === 'ALL' || u.pricingTier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const adultBelts: AdultBelt[] = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">BBDD Personal y Alumnos</h1>
          <p className="text-xs text-studio-cream/70 mt-0.5">
            Censo oficial de atletas de 247Studio, control de cinturones, grados y riesgo de retención.
          </p>
        </div>

        <Link
          to="/admin/alta-alumno"
          className="py-3 px-5 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dar de Alta Alumno
        </Link>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-studio-cream/50 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alias, email o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="PENDING">Pendientes</option>
            <option value="INACTIVE">Inactivos</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
          >
            <option value="ALL">Todas las Tarifas</option>
            <option value="STD">Estándar (STD)</option>
            <option value="SF">Socio Fundador (SF)</option>
            <option value="FAM">Familiar (FAM)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Alumnos */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-studio-cream">
              <thead className="bg-studio-navy text-[10px] font-black uppercase tracking-widest text-studio-cream/70 border-b border-white/10">
                <tr>
                  <th className="py-4 px-5">Atleta / Contacto</th>
                  <th className="py-4 px-4">Cinturón / Grados</th>
                  <th className="py-4 px-4">Tarifa</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4">Retención</th>
                  <th className="py-4 px-4">Alertas</th>
                  <th className="py-4 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const retentionRisk = getRetentionRiskForUser(u.uid);
                  const isNearAdult = u.birthDate && calculateExactAge(u.birthDate, now) === 17;
                  const hasMedicalNotes = Boolean(u.medicalNotes && u.medicalNotes.trim().length > 0);

                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition">
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-sm text-white">{u.alias}</div>
                        <div className="text-[11px] text-studio-cream/70">{u.contactEmail}</div>
                        <div className="text-[10px] text-studio-cream/50">{u.phone}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-white uppercase">{u.belt}</span>
                        <span className="text-studio-cream/60 block text-[11px]">
                          {u.stripes} {u.stripes === 1 ? 'grado' : 'grados'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.pricingTier === 'SF'
                              ? 'bg-studio-red text-white'
                              : 'bg-white/10 text-studio-cream'
                          }`}
                        >
                          {u.pricingTier}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : u.accountStatus === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-studio-red/20 text-studio-red border border-studio-red/30'
                          }`}
                        >
                          {u.accountStatus}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            retentionRisk === 'HIGH'
                              ? 'bg-studio-red/25 text-studio-red border border-studio-red/50'
                              : retentionRisk === 'MEDIUM'
                              ? 'bg-amber-500/25 text-amber-400 border border-amber-500/50'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {retentionRisk}
                        </span>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        {hasMedicalNotes && (
                          <span
                            title={u.medicalNotes}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 cursor-help"
                          >
                            <HeartPulse className="w-3 h-3 text-studio-red" /> Médica
                          </span>
                        )}

                        {isNearAdult && (
                          <span
                            title="Atleta cumple 18 años pronto. Graduación a ADULT recomendada."
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30 block"
                          >
                            <AlertTriangle className="w-3 h-3 text-blue-400" /> Próximo Adulto
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        {u.accountStatus === 'PENDING' && (
                          <button
                            onClick={() => handleActivateUser(u.uid)}
                            className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[11px] hover:bg-emerald-500/30 transition"
                          >
                            Activar
                          </button>
                        )}

                        <button
                          onClick={() => openEditor(u)}
                          className="px-2.5 py-1 bg-white/10 text-white rounded-lg font-bold text-[11px] hover:bg-white/20 transition"
                        >
                          Grados & Stats
                        </button>

                        {u.accountStatus === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivateUser(u.uid)}
                            className="px-2.5 py-1 bg-studio-red/10 text-studio-red border border-studio-red/30 rounded-lg font-bold text-[11px] hover:bg-studio-red/20 transition"
                          >
                            Baja
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

      {/* Modal Editor de Cinturón, Grados y 8 Atributos */}
      {selectedUser && editingStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-studio-navy-light border border-white/20 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-lg font-black text-white">{selectedUser.alias}</h3>
                <span className="text-xs text-studio-cream/60">Editor Técnico y Ficha de Tatami</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-full text-studio-cream/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Selector de Cinturón y Grados */}
              <div className="grid grid-cols-2 gap-3 bg-studio-navy p-3.5 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-cream mb-1">
                    Cinturón
                  </label>
                  <select
                    value={editingBelt}
                    onChange={(e) => setEditingBelt(e.target.value as Belt)}
                    className="w-full px-3 py-2 bg-studio-navy-light border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
                  >
                    {adultBelts.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-cream mb-1">
                    Grados (Stripes: 0 a 4)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={editingStripes}
                    onChange={(e) => setEditingStripes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-studio-navy-light border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
                  />
                </div>
              </div>

              {/* 8 Atributos Técnicos del Luchador (0 a 100) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-studio-cream mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-studio-red" /> 8 Atributos del Atleta (247Studio)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(editingStats) as (keyof FighterStats)[]).map((key) => (
                    <div key={key} className="bg-studio-navy p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold uppercase tracking-wider text-studio-cream text-[11px]">
                          {key}
                        </span>
                        <span className="font-black text-white">{editingStats[key]}%</span>
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
                        className="w-full accent-studio-red cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-studio-cream hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEditor}
                className="flex-1 py-2.5 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
