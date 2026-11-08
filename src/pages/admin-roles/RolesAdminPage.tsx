import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { auth, db } from '@/shared/api/firebase';
import { Role } from '@/shared/domain/types';

interface StaffUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  emailVerified: boolean;
  disabled: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export const RolesAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'coach' | 'student'>('ALL');

  // Modal invitar / asignar rol
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'coach' | 'admin'>('coach');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    success: boolean;
    message: string;
    invitationLink?: string | null;
    email: string;
    role: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Acción rápida de cambio de rol
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setError(null);

      // 1. Carga inmediata y resiliente desde Firestore (siempre disponible)
      let firestoreUsers: StaffUser[] = [];
      try {
        const snap = await getDocs(collection(db, 'users'));
        firestoreUsers = snap.docs.map((d) => {
          const data = d.data();
          const permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
          let role: Role = 'student';
          if (permissions.includes('admin')) role = 'admin';
          else if (permissions.includes('coach')) role = 'coach';
          else if (permissions.includes('kiosk')) role = 'kiosk';

          return {
            uid: d.id,
            email: data.authEmail || data.contactEmail || null,
            displayName: data.alias || null,
            role,
            emailVerified: true,
            disabled: data.accountStatus === 'INACTIVE' || data.accountStatus === 'SUSPENDED',
            createdAt: data.createdAt,
          };
        });

        if (firestoreUsers.length > 0) {
          setUsers(firestoreUsers);
        }
      } catch (fsErr) {
        console.warn('Aviso leyendo usuarios de Firestore:', fsErr);
      }

      // 2. Enriquecer con Firebase Auth Custom Claims vía Netlify Function (token forzado)
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(true);
          const res = await fetch('/.netlify/functions/admin-set-role', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.users) && data.users.length > 0) {
              const netlifyUsers: StaffUser[] = data.users;
              const map = new Map<string, StaffUser>();

              // Priorizar datos de Firestore y enriquecer con Auth
              firestoreUsers.forEach((u) => map.set(u.uid, u));
              netlifyUsers.forEach((u) => {
                const existing = map.get(u.uid);
                map.set(u.uid, {
                  ...existing,
                  ...u,
                  displayName: u.displayName || existing?.displayName || '',
                });
              });

              setUsers(Array.from(map.values()));
              setError(null);
            }
          } else if (firestoreUsers.length === 0) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `HTTP ${res.status}`);
          }
        } catch (fnErr) {
          // Si Firestore ya entregó usuarios, no mostramos un banner bloqueante
          if (firestoreUsers.length === 0) {
            throw fnErr;
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching staff list:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el servicio de roles de Firebase Admin.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSetRole = async (targetEmailOrUid: string, newRole: Role) => {
    try {
      setUpdatingUid(targetEmailOrUid);
      setError(null);

      // 1. Identificar UID y actualizar Firestore de forma optimista
      const targetUser = users.find(
        (u) => u.uid === targetEmailOrUid || u.email === targetEmailOrUid
      );
      const targetUid = targetUser?.uid || (targetEmailOrUid.includes('@') ? null : targetEmailOrUid);

      if (targetUid) {
        await updateDoc(doc(db, 'users', targetUid), {
          permissions: [newRole],
          updatedAt: serverTimestamp(),
        }).catch((err) => console.warn('Aviso actualizando rol en Firestore:', err));
      }

      // 2. Actualización optimista en interfaz
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid || (u.email && u.email === targetEmailOrUid)
            ? { ...u, role: newRole }
            : u
        )
      );

      // 3. Sincronizar Custom Claims en Firebase Auth si el servicio serverless está disponible
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        const isEmail = targetEmailOrUid.includes('@');
        const bodyPayload = isEmail
          ? { email: targetEmailOrUid, role: newRole }
          : { uid: targetEmailOrUid, role: newRole };

        const res = await fetch('/.netlify/functions/admin-set-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.warn('Aviso sincronizando claim en Auth:', errJson.error || res.status);
        }
      }
    } catch (err: unknown) {
      console.error('Error changing user role:', err);
      const msg = err instanceof Error ? err.message : 'Error al actualizar rol';
      setError(msg);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setInviteResult(null);

    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken(true);
      const cleanEmail = inviteEmail.trim().toLowerCase();

      const res = await fetch('/.netlify/functions/admin-set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setInviteResult({
        success: true,
        message: data.message,
        invitationLink: data.invitationLink,
        email: cleanEmail,
        role: inviteRole,
      });

      await fetchUsers();
    } catch (err: unknown) {
      console.error('Error inviting staff:', err);
      const msg = err instanceof Error ? err.message : 'Error al invitar staff';
      setError(msg);
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.displayName && u.displayName.toLowerCase().includes(s)) ||
      u.uid.toLowerCase().includes(s);
    return matchesRole && matchesSearch;
  });

  const staffCount = users.filter((u) => u.role === 'admin' || u.role === 'coach').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const coachCount = users.filter((u) => u.role === 'coach').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] font-mono font-black uppercase tracking-wider">
              Seguridad & Claims
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-amber-600" /> Equipo & Privilegios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión oficial de claims en Firebase Auth: Administradores, Profesores y Staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchUsers();
            }}
            disabled={refreshing}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInviteEmail('');
              setInviteRole('coach');
              setInviteResult(null);
              setShowInviteModal(true);
            }}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Invitar Miembro</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Error en operaciones de staff:</strong>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Directores (Admin)
            </span>
            <span className="text-xl font-black font-mono text-slate-900">{adminCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Control total: Alumnos, Caja, Tarifas, Horarios y Roles.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" /> Profesores (Coach)
            </span>
            <span className="text-xl font-black font-mono text-slate-900">{coachCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Paso de lista, horarios y tatami. Sin acceso a caja ni tarifas.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" /> Total Staff Activo
            </span>
            <span className="text-xl font-black font-mono text-slate-900">{staffCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Cuentas con privilegios de gestión en 247 STUDIO.
          </p>
        </div>
      </div>

      {/* Buscador y Filtro */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3.5 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por email, nombre o UID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Todos los roles</option>
            <option value="admin">Solo Directores (Admin)</option>
            <option value="coach">Solo Profesores (Coach)</option>
            <option value="student">Alumnos (Student)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios y Roles */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se encontraron usuarios con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Usuario / Email</th>
                  <th className="py-3 px-4">Rol en Firebase</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Estado Email</th>
                  <th className="py-3 px-4 text-right">Acciones de Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredUsers.map((u) => {
                  const isCurrentAdmin = u.uid === user?.uid;
                  const isBusy = updatingUid === u.uid || updatingUid === u.email;

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {u.displayName || u.email?.split('@')[0] || 'Sin nombre'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {u.email || 'Sin correo asociado'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-black uppercase">
                            <Shield className="w-3 h-3 text-amber-600" /> Director
                          </span>
                        ) : u.role === 'coach' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-300 text-blue-800 text-[10px] font-black uppercase">
                            <UserCheck className="w-3 h-3 text-blue-600" /> Profesor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                            Alumno
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                        {u.uid}
                      </td>

                      <td className="py-3 px-4">
                        {u.emailVerified ? (
                          <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No verificado</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-[10px] text-slate-400 italic">Sesión actual</span>
                        ) : isBusy ? (
                          <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleSetRole(u.uid, 'admin')}
                                title="Promocionar a Director (Admin)"
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold transition cursor-pointer"
                              >
                                Hacer Admin
                              </button>
                            )}

                            {u.role !== 'coach' && (
                              <button
                                type="button"
                                onClick={() => handleSetRole(u.uid, 'coach')}
                                title="Asignar rol de Profesor (Coach)"
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold transition cursor-pointer"
                              >
                                Hacer Coach
                              </button>
                            )}

                            {u.role !== 'student' && (
                              <button
                                type="button"
                                onClick={() => handleSetRole(u.uid, 'student')}
                                title="Revocar privilegios y dejar como Alumno"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-[10px] font-bold transition cursor-pointer"
                              >
                                Revocar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Invitar Staff */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-600" /> Invitar / Asignar Rol
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Si el usuario ya existe en Firebase, se actualizará su rol de inmediato. Si no existe, se creará su cuenta y se generará un enlace para definir contraseña.
            </p>

            {inviteResult && (
              <div
                className={`p-4 rounded-2xl mb-4 text-xs ${
                  inviteResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{inviteResult.message}</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  <p>Email: <span className="font-mono font-bold text-slate-900">{inviteResult.email}</span></p>
                  <p>Rol: <span className="font-bold uppercase text-slate-900">{inviteResult.role}</span></p>
                </div>

                {inviteResult.invitationLink && (
                  <div className="mt-3 pt-2 border-t border-emerald-200">
                    <span className="font-bold text-[10px] text-slate-500 uppercase block mb-1">
                      Enlace de Activación (Enviar por WhatsApp/Email):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.invitationLink}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-mono text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteResult.invitationLink!)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shrink-0 cursor-pointer"
                        title="Copiar enlace"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ejemplo@247studio.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol a Asignar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole('coach')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inviteRole === 'coach'
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Profesor (Coach)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inviteRole === 'admin'
                        ? 'bg-amber-50 border-amber-400 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Director (Admin)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>{inviteResult ? 'Invitar Otro' : 'Asignar / Crear'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
