import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  ShieldCheck,
  User,
  UserPlus,
  Copy,
  Check,
  Camera,
  Upload,
  FileWarning,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadUserAvatar } from '@/lib/imageCompressor';
import { getLocalMonthYear, calculateAge, isMinorAge } from '@/lib/dateUtils';
import { getEffectivePlanPrice } from '@/lib/pricing';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import {
  getDocumentCompliance,
  type DocSignature,
  type DocTemplate,
} from '@/lib/documents';
import type { MemberStatus, Profile, UserRole } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';

interface Plan {
  id: string;
  name: string;
  price_eur: number;
  plan_disciplines?: { discipline_id: string }[];
}

interface Discipline {
  id: string;
  name: string;
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
  const currentMonth = getLocalMonthYear();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [trials, setTrials] = useState<TrialGuest[]>([]);
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [signaturesByUser, setSignaturesByUser] = useState<Record<string, DocSignature[]>>({});
  const [subsByUser, setSubsByUser] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | string>('all');
  const [docFilter, setDocFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'new' | 'edit' | null>(null);
  const [photoUploadWarning, setPhotoUploadWarning] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Alta nuevo usuario
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newFatherName, setNewFatherName] = useState('');
  const [newFatherPhone, setNewFatherPhone] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [newMotherPhone, setNewMotherPhone] = useState('');
  const [newBelt, setNewBelt] = useState('Blanco');
  const [newRole, setNewRole] = useState<UserRole>('client');
  const [newGuardianId, setNewGuardianId] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [newIsFounder, setNewIsFounder] = useState(false);
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
    const [profRes, planRes, discRes, subRes, trialRes, tplRes, sigRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase
        .from('plans')
        .select('id, name, price_eur, plan_disciplines(discipline_id)')
        .eq('is_active', true)
        .order('price_eur'),
      supabase.from('disciplines').select('id, name').eq('is_active', true).order('sort_order'),
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
      supabase.from('document_templates').select('*').eq('is_active', true),
      supabase
        .from('document_signatures')
        .select('user_id, template_id, template_version, signed_at'),
    ]);

    setProfiles((profRes.data as Profile[]) ?? []);
    setPlans((planRes.data as Plan[]) ?? []);
    setDisciplines((discRes.data as Discipline[]) ?? []);
    setTrials((trialRes.data as unknown as TrialGuest[]) ?? []);
    setDocTemplates((tplRes.data as DocTemplate[]) ?? []);

    const sigMap: Record<string, DocSignature[]> = {};
    ((sigRes.data as DocSignature[]) ?? []).forEach((s) => {
      if (!s.user_id) return;
      if (!sigMap[s.user_id]) sigMap[s.user_id] = [];
      sigMap[s.user_id].push(s);
    });
    setSignaturesByUser(sigMap);

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
    if (!matchesSearch || !matchesStatus) return false;
    if (disciplineFilter !== 'all') {
      const userPlan = plans.find((pl) => pl.id === subsByUser[p.id]);
      const hasDiscipline = Boolean(
        userPlan?.plan_disciplines?.some((pd) => pd.discipline_id === disciplineFilter)
      );
      if (!hasDiscipline) return false;
    }
    if (docFilter === 'all') return true;
    if (p.role !== 'client') return docFilter === 'complete';
    const comp = getDocumentCompliance(docTemplates, signaturesByUser[p.id] ?? [], p.birth_date);
    return docFilter === 'pending' ? comp.pending.length > 0 : comp.isComplete;
  });

  const handleSaveSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditError(null);

    if (isMinorAge(selected.birth_date)) {
      const hasFather = Boolean(selected.father_name?.trim() && selected.father_phone?.trim());
      const hasMother = Boolean(selected.mother_name?.trim() && selected.mother_phone?.trim());
      if (!hasFather && !hasMother) {
        setEditError(
          'Al ser menor (≤ 14 años), debe constar al menos el nombre y teléfono del padre o de la madre.'
        );
        return;
      }
    }

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
        alias: selected.alias || null,
        phone: selected.phone,
        birth_date: selected.birth_date || null,
        role: selected.role,
        status: selected.status,
        belt: selected.belt,
        belt_stripes: selected.belt_stripes ?? 0,
        weight_category: selected.weight_category,
        guardian_user_id: selected.guardian_user_id || null,
        father_name: selected.father_name?.trim() || null,
        father_phone: selected.father_phone?.trim() || null,
        mother_name: selected.mother_name?.trim() || null,
        mother_phone: selected.mother_phone?.trim() || null,
        is_founder: Boolean(selected.is_founder),
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
    } else if (selected.status === 'inactive') {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', selected.id)
        .eq('month_year', currentMonth);
    }

    await loadAll();
    setSaving(false);
    setEditPhotoFile(null);
    if (editPhotoPreview) {
      URL.revokeObjectURL(editPhotoPreview);
      setEditPhotoPreview(null);
    }
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
    setCreateError(null);

    if (isMinorAge(newBirthDate)) {
      const hasFather = Boolean(newFatherName.trim() && newFatherPhone.trim());
      const hasMother = Boolean(newMotherName.trim() && newMotherPhone.trim());
      if (!hasFather && !hasMother) {
        setCreateError(
          'Al ser menor (≤ 14 años), debe constar al menos el nombre y teléfono del padre o de la madre.'
        );
        return;
      }
    }

    setCreating(true);

    const { data, error } = await supabase.functions.invoke('create-student', {
      body: {
        email: newEmail.trim().toLowerCase(),
        full_name: newName.trim(),
        phone: newPhone.trim(),
        birth_date: newBirthDate || null,
        belt: newBelt || null,
        role: newRole,
        guardian_user_id: newGuardianId || null,
        father_name: newFatherName.trim() || null,
        father_phone: newFatherPhone.trim() || null,
        mother_name: newMotherName.trim() || null,
        mother_phone: newMotherPhone.trim() || null,
        is_founder: newIsFounder,
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

    setPhotoUploadWarning(null);
    if (newPhotoFile && data?.id) {
      try {
        const avatarUrl = await uploadUserAvatar(data.id, newPhotoFile);
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', data.id);
      } catch {
        setPhotoUploadWarning(
          `Usuario "${newName.trim()}" creado, pero no se pudo subir la foto. Puedes repetirla desde su ficha.`
        );
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
    setNewFatherName('');
    setNewFatherPhone('');
    setNewMotherName('');
    setNewMotherPhone('');
    setNewGuardianId('');
    setNewPlanId('');
    setNewIsFounder(false);
    setNewPhotoFile(null);
    if (newPhotoPreview) {
      URL.revokeObjectURL(newPhotoPreview);
      setNewPhotoPreview(null);
    }
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
      <PageHeader
        title="Alumnos y staff"
        subtitle={<>Gestiona altas, bajas, pausas, cinturones, roles y la tarifa mensual ({currentMonth}).</>}
        actions={
          <>
            <button
              onClick={() => {
                setTrialGuestId(null);
                setTrialDateRef(null);
                setCreateError(null);
                setShowNewModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl studio-btn px-4 py-2.5 text-sm font-semibold text-white transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Alumno
            </button>
          </>
        }
      />

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
        <section className="rounded-2xl studio-panel border border-amber-500/30 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Pruebas recientes pendientes de alta ({trials.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {trials.map((t) => (
              <div
                key={t.id}
                className="rounded-xl studio-panel-inset px-3.5 py-2.5 border border-white/5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t.disciplines?.name} · {t.trial_date} · {t.phone || t.email || 'Sin contacto'}
                  </p>
                </div>
                <button
                  onClick={() => openNewFromTrial(t)}
                  className="px-3 py-1.5 rounded-lg studio-btn text-xs font-semibold text-white shrink-0"
                >
                  Dar de alta
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {photoUploadWarning && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{photoUploadWarning}</span>
          <button
            type="button"
            onClick={() => setPhotoUploadWarning(null)}
            className="underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-xl studio-field pl-10 pr-4 py-2.5 text-sm text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | MemberStatus)}
          className="rounded-xl studio-field px-3 py-2.5 text-sm text-white"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="inactive">Bajas</option>
        </select>
        <select
          value={disciplineFilter}
          onChange={(e) => setDisciplineFilter(e.target.value)}
          className="rounded-xl studio-field px-3 py-2.5 text-sm text-white"
        >
          <option value="all">Todas las disciplinas</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value as 'all' | 'pending' | 'complete')}
          className="rounded-xl studio-field px-3 py-2.5 text-sm text-white"
        >
          <option value="all">Docs: Todos</option>
          <option value="pending">Con docs pendientes</option>
          <option value="complete">Docs completos</option>
        </select>
      </div>

      {/* Lista */}
      <div className="rounded-2xl studio-panel border border-white/10 divide-y divide-white/5">
        {filtered.map((p) => {
          const planName =
            plans.find((pl) => pl.id === subsByUser[p.id])?.name ?? 'Sin tarifa este mes';
          const minorAge = isMinorAge(p.birth_date) ? calculateAge(p.birth_date) : null;
          const comp =
            p.role === 'client'
              ? getDocumentCompliance(docTemplates, signaturesByUser[p.id] ?? [], p.birth_date)
              : null;
          return (
            <div
              key={p.id}
              onClick={() => {
                setEditError(null);
                setSelected(p);
              }}
              className="group p-4 flex items-center justify-between gap-4 hover:bg-white/[0.07] hover:shadow-[inset_3px_0_0_0_#dc2626] cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full studio-panel-inset border border-white/10 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200 group-hover:scale-110 group-hover:ring-2 group-hover:ring-studio-red/75 group-hover:shadow-[0_0_16px_rgba(220,38,38,0.45)]">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <User className="w-4 h-4 text-slate-400 transition-colors duration-200 group-hover:text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex flex-wrap items-center gap-1.5">
                    {p.full_name}
                    {p.is_founder && (
                      <span
                        title="Socio Fundador (-10%)"
                        className="inline-flex items-center text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      >
                        SF
                      </span>
                    )}
                    {minorAge !== null && (
                      <span className="inline-flex items-center text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        Menor · {minorAge}a
                      </span>
                    )}
                    {comp && comp.totalRequired > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          comp.isComplete
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-studio-red/20 text-red-200 border border-studio-red/30'
                        }`}
                      >
                        {comp.isComplete ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <FileWarning className="w-3 h-3" />
                        )}
                        {comp.isComplete
                          ? `Docs ${comp.signedCount}/${comp.totalRequired}`
                          : `Faltan ${comp.pending.length} docs`}
                      </span>
                    )}
                    {!p.avatar_url && p.role === 'client' && (
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                        Sin foto
                      </span>
                    )}
                    {p.role !== 'client' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] uppercase px-1.5 py-0.5 rounded bg-studio-red/20 text-red-300">
                        <ShieldCheck className="w-3 h-3" /> {p.role}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {p.belt ? `${p.belt} · ${planName}` : planName}
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
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onSubmit={handleSaveSelected}
              className="w-full max-w-lg rounded-2xl studio-panel border border-white/15 p-6 space-y-4 shadow-modal max-h-[90vh] overflow-y-auto"
            >
            <h2 className="font-headline text-xl uppercase text-white">Editar Ficha</h2>

            {editError && (
              <div className="rounded-xl bg-studio-red/20 border border-studio-red/50 px-3 py-2 text-xs text-red-200">
                {editError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-14 h-14 rounded-full studio-panel-inset border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                {editPhotoPreview || selected.avatar_url ? (
                  <img
                    src={editPhotoPreview || selected.avatar_url || ''}
                    alt={selected.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setCameraTarget('edit')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 studio-panel-inset px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
              >
                <Camera className="w-4 h-4 text-studio-red" />
                Realizar foto
              </button>
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 studio-panel-inset px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-white/5">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>{editPhotoFile ? editPhotoFile.name : 'Subir archivo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setEditPhotoFile(f);
                    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
                    setEditPhotoPreview(f ? URL.createObjectURL(f) : null);
                  }}
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                <input
                  value={selected.phone ?? ''}
                  onChange={(e) => setSelected({ ...selected, phone: e.target.value })}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Estado</label>
                <select
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value as MemberStatus })
                  }
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="client">Alumno (client)</option>
                  <option value="coach">Profesor (coach)</option>
                  <option value="admin">Administrador (admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Cinturón</label>
                <select
                  value={selected.belt ?? ''}
                  onChange={(e) => {
                    const nextBelt = e.target.value || null;
                    setSelected({
                      ...selected,
                      belt: nextBelt,
                      belt_stripes: nextBelt ? selected.belt_stripes : 0,
                    });
                  }}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">Sin cinturón (No-Gi / MMA / Lucha)</option>
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Morado">Morado</option>
                  <option value="Marrón">Marrón</option>
                  <option value="Negro">Negro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Grados (0–4)</label>
                <select
                  value={selected.belt ? (selected.belt_stripes ?? 0) : 0}
                  disabled={!selected.belt}
                  onChange={(e) =>
                    setSelected({ ...selected, belt_stripes: Number(e.target.value) })
                  }
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white disabled:opacity-45"
                >
                  {[0, 1, 2, 3, 4].map((g) => (
                    <option key={g} value={g}>
                      {g} {g === 1 ? 'grado' : 'grados'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Alias / Apodo tatami
                </label>
                <input
                  value={selected.alias ?? ''}
                  onChange={(e) => setSelected({ ...selected, alias: e.target.value })}
                  placeholder="Opcional (ayuda con homónimos)"
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Fecha nacimiento
                </label>
                <input
                  type="date"
                  value={selected.birth_date ?? ''}
                  onChange={(e) => setSelected({ ...selected, birth_date: e.target.value })}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>

              {(isMinorAge(selected.birth_date) ||
                selected.father_name ||
                selected.father_phone ||
                selected.mother_name ||
                selected.mother_phone) && (
                <div className="sm:col-span-2 rounded-xl bg-sky-500/10 border border-sky-400/25 p-3.5 space-y-3">
                  <p className="text-xs font-semibold text-sky-300 uppercase">
                    Datos de Padre y Madre (Menor ≤ 14 años)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Nombre del padre
                      </label>
                      <input
                        value={selected.father_name ?? ''}
                        onChange={(e) => setSelected({ ...selected, father_name: e.target.value })}
                        placeholder="Nombre y apellidos"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Teléfono del padre
                      </label>
                      <input
                        value={selected.father_phone ?? ''}
                        onChange={(e) => setSelected({ ...selected, father_phone: e.target.value })}
                        placeholder="600 000 000"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Nombre de la madre
                      </label>
                      <input
                        value={selected.mother_name ?? ''}
                        onChange={(e) => setSelected({ ...selected, mother_name: e.target.value })}
                        placeholder="Nombre y apellidos"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Teléfono de la madre
                      </label>
                      <input
                        value={selected.mother_phone ?? ''}
                        onChange={(e) => setSelected({ ...selected, mother_phone: e.target.value })}
                        placeholder="600 000 000"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Familiar / Tutor vinculado (Kids / Hermanos)
                </label>
                <select
                  value={selected.guardian_user_id ?? ''}
                  onChange={(e) =>
                    setSelected({ ...selected, guardian_user_id: e.target.value || null })
                  }
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">— Ninguno —</option>
                  {profiles
                    .filter((other) => other.id !== selected.id)
                    .map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.full_name} ({other.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-xl studio-panel-inset border border-amber-400/25 px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-amber-300 uppercase">
                      Socio Fundador (SF · -10%)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Aplica un 10% de descuento en la tarifa mensual. El administrador puede
                      activarlo o revocarlo en cualquier momento.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(selected.is_founder)}
                    onChange={(e) => setSelected({ ...selected, is_founder: e.target.checked })}
                    className="rounded w-4 h-4 accent-amber-400 shrink-0"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">— Sin tarifa —</option>
                  {plans.map((pl) => {
                    const effective = getEffectivePlanPrice(pl.price_eur, selected.is_founder);
                    return (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({effective} €{selected.is_founder ? ' · SF -10%' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selected.role === 'client' && docTemplates.length > 0 && (() => {
                const sigs = signaturesByUser[selected.id] ?? [];
                const comp = getDocumentCompliance(docTemplates, sigs, selected.birth_date);
                return (
                  <div className="sm:col-span-2 rounded-xl studio-panel-inset border border-white/10 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white uppercase">
                        Documentación Obligatoria
                      </p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          comp.isComplete
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-studio-red/20 text-red-200'
                        }`}
                      >
                        {comp.signedCount} / {comp.totalRequired} firmados
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {comp.required.map((doc) => {
                        const signed = sigs.find(
                          (s) => s.template_id === doc.id && s.template_version === doc.version
                        );
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-slate-300 truncate">{doc.title}</span>
                            {signed ? (
                              <span className="text-emerald-300 shrink-0">
                                Firmado ({new Date(signed.signed_at).toLocaleDateString('es-ES')})
                              </span>
                            ) : (
                              <span className="text-red-300 font-semibold shrink-0">Pendiente</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
                className="px-5 py-2 rounded-xl studio-btn text-sm font-semibold text-white"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Alta Nuevo Alumno / Staff */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onSubmit={handleCreateUser}
              className="w-full max-w-lg rounded-2xl studio-panel border border-white/15 p-6 space-y-4 shadow-modal max-h-[90vh] overflow-y-auto"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>

              {isMinorAge(newBirthDate) && (
                <div className="sm:col-span-2 rounded-xl bg-sky-500/10 border border-sky-400/25 p-3.5 space-y-3">
                  <p className="text-xs font-semibold text-sky-300 uppercase">
                    Datos de Padre y Madre (Menor ≤ 14 años) *
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Nombre del padre
                      </label>
                      <input
                        value={newFatherName}
                        onChange={(e) => setNewFatherName(e.target.value)}
                        placeholder="Nombre y apellidos"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Teléfono del padre
                      </label>
                      <input
                        value={newFatherPhone}
                        onChange={(e) => setNewFatherPhone(e.target.value)}
                        placeholder="600 000 000"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Nombre de la madre
                      </label>
                      <input
                        value={newMotherName}
                        onChange={(e) => setNewMotherName(e.target.value)}
                        placeholder="Nombre y apellidos"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 uppercase mb-1">
                        Teléfono de la madre
                      </label>
                      <input
                        value={newMotherPhone}
                        onChange={(e) => setNewMotherPhone(e.target.value)}
                        placeholder="600 000 000"
                        className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">Sin cinturón (No-Gi / MMA / Lucha)</option>
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Morado">Morado</option>
                  <option value="Marrón">Marrón</option>
                  <option value="Negro">Negro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Tutor / Hermano vinculado (opcional)
                </label>
                <select
                  value={newGuardianId}
                  onChange={(e) => setNewGuardianId(e.target.value)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">— Ninguno —</option>
                  {profiles.map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Foto del alumno (opcional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-12 h-12 rounded-full studio-panel-inset border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                    {newPhotoPreview ? (
                      <img src={newPhotoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraTarget('new')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 studio-panel-inset px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
                  >
                    <Camera className="w-4 h-4 text-studio-red" />
                    Realizar foto
                  </button>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 studio-panel-inset px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-white/5">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>{newPhotoFile ? newPhotoFile.name : 'Subir archivo / galería'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setNewPhotoFile(f);
                        if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
                        setNewPhotoPreview(f ? URL.createObjectURL(f) : null);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-xl studio-panel-inset border border-amber-400/25 px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-amber-300 uppercase">
                      Socio Fundador (SF · -10%)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Descuento del 10% sobre el precio final de la tarifa (revocable por Admin).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newIsFounder}
                    onChange={(e) => setNewIsFounder(e.target.checked)}
                    className="rounded w-4 h-4 accent-amber-400 shrink-0"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="">— Asignar más tarde —</option>
                  {plans.map((pl) => {
                    const effective = getEffectivePlanPrice(pl.price_eur, newIsFounder);
                    return (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({effective} €{newIsFounder ? ' · SF -10%' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              {newPlanId && (
                <div className="sm:col-span-2 rounded-xl studio-panel-inset border border-white/10 p-3 flex flex-wrap items-center justify-between gap-3">
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
                      className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-xs text-white"
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
                className="px-5 py-2 rounded-xl studio-btn disabled:opacity-50 text-sm font-semibold text-white"
              >
                {creating ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <CameraCaptureModal
        open={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onCapture={(file) => {
          if (cameraTarget === 'new') {
            setNewPhotoFile(file);
            if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
            setNewPhotoPreview(URL.createObjectURL(file));
          } else if (cameraTarget === 'edit') {
            setEditPhotoFile(file);
            if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
            setEditPhotoPreview(URL.createObjectURL(file));
          }
        }}
      />
    </div>
  );
}
