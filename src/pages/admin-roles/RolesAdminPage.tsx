import React, { useEffect, useState } from 'react';
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
import { auth } from '@/shared/api/firebase';
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
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/admin-set-role', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      console.error('Error fetching staff list:', err);
      setError(
        'No se pudo conectar con el servicio de roles de Firebase Admin. Asegúrate de ejecutar la app a través de Netlify CLI o tener las funciones configuradas.'
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
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();

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
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      await fetchUsers();
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
      const token = await auth.currentUser.getIdToken();
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
            Control total: Caja, Tarifas, Censo médico y Roles.
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
            Paso de lista, horarios y tatami. Sin acceso a caja ni fichas médicas.
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
            Cuentas con Custom Claims asignados por Firebase Admin.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

            {inviteResult?.success ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>¡Rol configurado con éxito!</span>
                  </div>
                  <p>{inviteResult.message}</p>
                </div>

                {inviteResult.invitationLink && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                      Enlace de Acceso / Contraseña:
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.invitationLink}
                      className="w-full text-xs font-mono bg-white p-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteResult.invitationLink!)}
                        className="flex-1 py-2 px-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition hover:bg-slate-800 flex items-center justify-center gap-1.5"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                      </button>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `¡Hola! Se ha creado tu acceso a 247Studio como ${inviteResult.role}. Configura tu contraseña aquí: ${inviteResult.invitationLink}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteResult(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="profesor@247studio.es"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Rol a Asignar *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="coach">Profesor / Entrenador (Coach)</option>
                    <option value="admin">Director del Centro (Admin)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {inviteRole === 'coach'
                      ? 'Tendrá acceso al portal de staff (/staff/login) para pasar lista y ver horarios. No tendrá acceso a caja ni cobros.'
                      : 'Tendrá privilegios completos de administración, caja, tarifas y censo.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {inviting ? 'Procesando...' : 'Asignar / Invitar'}
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
