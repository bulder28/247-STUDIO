import { useEffect, useState } from 'react';
import { Search, ShieldCheck, User, UserPlus, Copy, Check, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadUserAvatar } from '@/lib/imageCompressor';
import type { MemberStatus, Profile, UserRole } from '@/types/database';

interface Plan {
  id: string;
  name: string;
  price_eur: number;
}

interface TrialGuest {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  trial_date: string;
  disciplines?: { name: string } | null;
}

export function AdminStudentsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trials, setTrials] = useState<TrialGuest[]>([]);
  const [subsByUser, setSubsByUser] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Alta nuevo usuario
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newBelt, setNewBelt] = useState('Blanco');
  const [newRole, setNewRole] = useState<UserRole>('client');
  const [newPlanId, setNewPlanId] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [paidNow, setPaidNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Bizum'>('Efectivo');
  const [trialGuestId, setTrialGuestId] = useState<string | null>(null);
  const [trialDateRef, setTrialDateRef] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAll = async () => {
    const [profRes, planRes, subRes, trialRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('plans').select('id, name, price_eur').eq('is_active', true).order('price_eur'),
      supabase
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('month_year', currentMonth)
        .eq('status', 'active'),
      supabase
        .from('trial_guests')
        .select('id, full_name, phone, email, trial_date, disciplines(name)')
        .is('converted_user_id', null)
        .order('trial_date', { ascending: false })
        .limit(10),
    ]);

    setProfiles((profRes.data as Profile[]) ?? []);
    setPlans((planRes.data as Plan[]) ?? []);
    setTrials((trialRes.data as unknown as TrialGuest[]) ?? []);

    const map: Record<string, string> = {};
    (subRes.data ?? []).forEach((s: { user_id: string; plan_id: string }) => {
      map[s.user_id] = s.plan_id;
    });
    setSubsByUser(map);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);

    let avatarUrl = selected.avatar_url;
    if (editPhotoFile) {
      try {
        avatarUrl = await uploadUserAvatar(selected.id, editPhotoFile);
      } catch {
        // Si falla la subida, guardamos el resto igualmente
      }
    }

    await supabase
      .from('profiles')
      .update({
        full_name: selected.full_name,
        phone: selected.phone,
        role: selected.role,
        status: selected.status,
        belt: selected.belt,
        belt_stripes: selected.belt_stripes,
        weight_category: selected.weight_category,
        avatar_url: avatarUrl,
      })
      .eq('id', selected.id);

    const assignedPlanId = subsByUser[selected.id];
    if (assignedPlanId) {
      await supabase.from('subscriptions').upsert(
        {
          user_id: selected.id,
          plan_id: assignedPlanId,
          month_year: currentMonth,
          status: selected.status === 'inactive' ? 'cancelled' : 'active',
        },
        { onConflict: 'user_id,month_year' }
      );
    }

    await loadAll();
    setSaving(false);
    setEditPhotoFile(null);
    setSelected(null);
  };

  const openNewFromTrial = (t: TrialGuest) => {
    setNewName(t.full_name);
    setNewEmail(t.email ?? '');
    setNewPhone(t.phone ?? '');
    setTrialGuestId(t.id);
    setTrialDateRef(t.trial_date);
    setCreateError(null);
    setShowNewModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const { data, error } = await supabase.functions.invoke('create-student', {
      body: {
        email: newEmail.trim(),
        full_name: newName.trim(),
        phone: newPhone.trim(),
        birth_date: newBirthDate || null,
        belt: newBelt,
        role: newRole,
        plan_id: newPlanId || null,
        month_year: currentMonth,
        paid_now: newPlanId ? paidNow : false,
        payment_method: paymentMethod,
        first_training_at: trialDateRef,
        trial_guest_id: trialGuestId,
      },
    });

    if (error || data?.error) {
      setCreateError(
        data?.error ??
          error?.message ??
          'Error al crear usuario. ¿Desplegaste la Edge Function create-student?'
      );
      setCreating(false);
      return;
    }

    if (newPhotoFile && data?.id) {
      try {
        const avatarUrl = await uploadUserAvatar(data.id, newPhotoFile);
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', data.id);
      } catch {
        // El usuario ya quedó creado aunque falle la foto
      }
    }

    setCreatedCredentials({
      name: newName.trim(),
      email: newEmail.trim(),
      tempPassword: data.tempPassword,
    });
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewBirthDate('');
    setNewPlanId('');
    setNewPhotoFile(null);
    setTrialGuestId(null);
    setTrialDateRef(null);
    setShowNewModal(false);
    setCreating(false);
    await loadAll();
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `Acceso App 247 STUDIO\nEmail: ${createdCredentials.email}\nClave temporal: ${createdCredentials.tempPassword}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
            BBDD Personal (Alumnos y Staff)
          </h1>
          <p className="text-sm text-slate-400">
            Gestiona altas, bajas, pausas, cinturones, roles y la tarifa mensual ({currentMonth}).
          </p>
        </div>
        <button
          onClick={() => {
            setTrialGuestId(null);
            setTrialDateRef(null);
            setCreateError(null);
            setShowNewModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2.5 text-sm font-semibold text-white transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Alumno
        </button>
      </div>

      {/* Clave temporal generada tras un alta */}
      {createdCredentials && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-200">
              Alta completada: {createdCredentials.name}
            </p>
            <p className="text-xs text-slate-200 mt-0.5">
              Email: <strong>{createdCredentials.email}</strong> · Clave temporal:{' '}
              <strong className="text-white text-sm">{createdCredentials.tempPassword}</strong>{' '}
              (la app le pedirá cambiarla al entrar).
            </p>
          </div>
          <button
            onClick={copyCredentials}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar acceso'}
          </button>
        </div>
      )}

      {/* Clases de prueba recientes pendientes de alta */}
      {trials.length > 0 && (
        <section className="rounded-2xl bg-studio-navy border border-amber-500/30 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Pruebas recientes pendientes de alta ({trials.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {trials.map((t) => (
              <div
                key={t.id}
                className="rounded-xl bg-studio-navy-deep px-3.5 py-2.5 border border-white/5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t.disciplines?.name} · {t.trial_date} · {t.phone || t.email || 'Sin contacto'}
                  </p>
                </div>
                <button
                  onClick={() => openNewFromTrial(t)}
                  className="px-3 py-1.5 rounded-lg bg-studio-red hover:bg-studio-red-dark text-xs font-semibold text-white shrink-0"
                >
                  Dar de alta
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-xl bg-studio-navy border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | MemberStatus)}
          className="rounded-xl bg-studio-navy border border-white/10 px-3 py-2.5 text-sm text-white"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="inactive">Bajas</option>
        </select>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-studio-navy border border-white/10 divide-y divide-white/5">
        {filtered.map((p) => {
          const planName =
            plans.find((pl) => pl.id === subsByUser[p.id])?.name ?? 'Sin tarifa este mes';
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-studio-navy-deep border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    {p.full_name}
                    {p.role !== 'client' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] uppercase px-1.5 py-0.5 rounded bg-studio-red/20 text-red-300">
                        <ShieldCheck className="w-3 h-3" /> {p.role}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {p.belt || 'Blanco'} · {planName}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : p.status === 'paused'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {p.status === 'active' ? 'Activo' : p.status === 'paused' ? 'Pausado' : 'Baja'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modal edición rápida */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSelected}
            className="w-full max-w-lg rounded-2xl bg-studio-navy border border-white/15 p-6 space-y-4 shadow-modal"
          >
            <h2 className="font-headline text-xl uppercase text-white">Editar Ficha</h2>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-studio-navy-deep px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-white/5">
                <Camera className="w-4 h-4 text-studio-red" />
                <span>{editPhotoFile ? editPhotoFile.name : 'Cambiar foto de perfil'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setEditPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Nombre completo
                </label>
                <input
                  value={selected.full_name}
                  onChange={(e) => setSelected({ ...selected, full_name: e.target.value })}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                <input
                  value={selected.phone ?? ''}
                  onChange={(e) => setSelected({ ...selected, phone: e.target.value })}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Estado</label>
                <select
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value as MemberStatus })
                  }
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="active">Activo</option>
                  <option value="paused">Pausado (lesión/descanso)</option>
                  <option value="inactive">Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Rol</label>
                <select
                  value={selected.role}
                  onChange={(e) => setSelected({ ...selected, role: e.target.value as UserRole })}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="client">Alumno (client)</option>
                  <option value="coach">Profesor (coach)</option>
                  <option value="admin">Administrador (admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Cinturón</label>
                <select
                  value={selected.belt ?? 'Blanco'}
                  onChange={(e) => setSelected({ ...selected, belt: e.target.value })}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Morado">Morado</option>
                  <option value="Marrón">Marrón</option>
                  <option value="Negro">Negro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Foto del alumno (opcional)
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-studio-navy-deep px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-white/5">
                  <Camera className="w-4 h-4 text-studio-red" />
                  <span>{newPhotoFile ? newPhotoFile.name : 'Hacer foto o elegir de galería'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    className="hidden"
                    onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Tarifa ({currentMonth})
                </label>
                <select
                  value={subsByUser[selected.id] ?? ''}
                  onChange={(e) =>
                    setSubsByUser((prev) => ({ ...prev, [selected.id]: e.target.value }))
                  }
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="">— Sin tarifa —</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.price_eur} €)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark text-sm font-semibold text-white"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Alta Nuevo Alumno / Staff */}
      {showNewModal && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-lg rounded-2xl bg-studio-navy border border-white/15 p-6 space-y-4 shadow-modal max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-headline text-xl uppercase text-white">Alta Nuevo Usuario</h2>
            <p className="text-xs text-slate-400">
              Se generará una clave temporal única y la app le pedirá cambiarla en su primer acceso.
            </p>

            {createError && (
              <div className="rounded-xl bg-studio-red/20 border border-studio-red/50 px-3 py-2 text-xs text-red-200">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Nombre y apellidos *
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Laura Gómez"
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Email acceso *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="laura@email.com"
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Fecha nacimiento
                </label>
                <input
                  type="date"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="client">Alumno (client)</option>
                  <option value="coach">Profesor (coach)</option>
                  <option value="admin">Administrador (admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Cinturón</label>
                <select
                  value={newBelt}
                  onChange={(e) => setNewBelt(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Morado">Morado</option>
                  <option value="Marrón">Marrón</option>
                  <option value="Negro">Negro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Foto del alumno (opcional)
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-studio-navy-deep px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-white/5">
                  <Camera className="w-4 h-4 text-studio-red" />
                  <span>{newPhotoFile ? newPhotoFile.name : 'Hacer foto o elegir de galería'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    className="hidden"
                    onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Tarifa ({currentMonth})
                </label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="">— Asignar más tarde —</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.price_eur} €)
                    </option>
                  ))}
                </select>
              </div>

              {newPlanId && (
                <div className="sm:col-span-2 rounded-xl bg-studio-navy-deep border border-white/10 p-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paidNow}
                      onChange={(e) => setPaidNow(e.target.checked)}
                      className="rounded"
                    />
                    ¿Ha abonado ya el primer mes?
                  </label>
                  {paidNow && (
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as 'Efectivo' | 'Bizum')
                      }
                      className="rounded-lg bg-studio-navy border border-white/10 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Bizum">Bizum</option>
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-50 text-sm font-semibold text-white"
              >
                {creating ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
