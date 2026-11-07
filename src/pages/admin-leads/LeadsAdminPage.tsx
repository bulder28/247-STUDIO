import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { WhatsAppMessageModal } from '@/widgets/WhatsAppMessageModal';

export type LeadSource = 'INSTAGRAM' | 'GOOGLE' | 'WALK_IN' | 'REFERRAL' | 'KIOSK' | 'OTHER';

export interface LeadModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  scheduleId?: string;
  programInterest?: string;
  source?: LeadSource;
  notes?: string;
  status: 'NEW' | 'SCHEDULED' | 'ATTENDED' | 'CONVERTED' | 'LOST';
  createdAt: any;
}

export const LeadsAdminPage: React.FC = () => {
  const [leads, setLeads] = useState<LeadModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLeadForWhatsapp, setSelectedLeadForWhatsapp] = useState<LeadModel | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadModel['status']>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | LeadSource>('ALL');

  // Modal Registrar Prospecto Walk-In
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'WALK_IN' as LeadSource,
    programInterest: 'BJJ Adultos Gi',
    notes: '',
  });

  const fetchLeads = async () => {
    try {
      const snap = await getDocs(collection(db, 'leads'));
      const list: LeadModel[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<LeadModel, 'id'>) }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setLeads(list);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleUpdateStatus = async (leadId: string, status: LeadModel['status']) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
      await fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWalkinLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const id = `lead_${Date.now()}`;
      await setDoc(doc(db, 'leads', id), {
        name: walkinForm.name.trim(),
        phone: walkinForm.phone.trim(),
        email: walkinForm.email.trim(),
        source: walkinForm.source,
        programInterest: walkinForm.programInterest,
        notes: walkinForm.notes.trim(),
        status: 'SCHEDULED',
        createdAt: serverTimestamp(),
      });

      setShowWalkinModal(false);
      setWalkinForm({
        name: '',
        phone: '',
        email: '',
        source: 'WALK_IN',
        programInterest: 'BJJ Adultos Gi',
        notes: '',
      });
      await fetchLeads();
    } catch (err) {
      console.error('Error creating walkin lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Métricas del embudo REA
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'NEW' || l.status === 'SCHEDULED').length;
  const attendedLeads = leads.filter((l) => l.status === 'ATTENDED' || l.status === 'CONVERTED').length;
  const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;

  const showupRate = totalLeads > 0 ? Math.round((attendedLeads / totalLeads) * 100) : 0;
  const conversionRate = attendedLeads > 0 ? Math.round((convertedLeads / attendedLeads) * 100) : 0;

  // Filtrado de prospectos
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      searchTerm === '' ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone && l.phone.includes(searchTerm)) ||
      (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesSource = sourceFilter === 'ALL' || (l.source || 'OTHER') === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getSourceBadge = (source?: LeadSource) => {
    switch (source) {
      case 'INSTAGRAM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">Instagram DM</span>;
      case 'GOOGLE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Google Maps / Web</span>;
      case 'REFERRAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Recomendado</span>;
      case 'KIOSK':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Kiosco Recepción</span>;
      case 'WALK_IN':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Mostrador Walk-In</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Embudo de Captación & Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Pipeline de prospección, clases de prueba gratuitas y conversión a altas oficiales de 247Studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWalkinModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Prospecto Walk-In</span>
          </button>

          <Link
            to="/admin/alta-alumno"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Dar de Alta Directa</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards del Embudo REA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Prospectos
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {totalLeads}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            {newLeads} pendientes de clase
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Tasa Show-Up (Asistencia)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {showupRate}%
          </div>
          <span className="text-[11px] text-amber-700 font-medium block mt-1">
            {attendedLeads} pisaron el tatami
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Tasa Conversión a Alta
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {conversionRate}%
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            {convertedLeads} convertidos en socios
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            MRR Potencial Generado
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {convertedLeads * 75} €
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Cuota estimada a 75€/mes
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar prospecto por nombre, teléfono o email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none"
          >
            <option value="ALL">Todos los Orígenes</option>
            <option value="WALK_IN">Mostrador Walk-In</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="GOOGLE">Google Maps / Web</option>
            <option value="REFERRAL">Recomendación</option>
            <option value="KIOSK">Kiosco Recepción</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="NEW">Nuevos</option>
            <option value="SCHEDULED">Programados</option>
            <option value="ATTENDED">Asistieron a Clase</option>
            <option value="CONVERTED">Convertidos (Alta)</option>
            <option value="LOST">No Interesados</option>
          </select>
        </div>
      </div>

      {/* Tabla de Leads */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
          <p className="text-sm font-semibold text-slate-700">No se encontraron prospectos con los filtros actuales.</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setSourceFilter('ALL'); }}
            className="text-xs font-bold text-studio-red hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Interesado / Contacto</th>
                  <th className="py-3.5 px-4">Canal Origen</th>
                  <th className="py-3.5 px-4">Disciplina / Interés</th>
                  <th className="py-3.5 px-4">Estado del Embudo</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp Directo</th>
                  <th className="py-3.5 px-5 text-right">Acciones de Captación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-5">
                      <span className="font-extrabold text-sm text-slate-900 block">{lead.name}</span>
                      {lead.email && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.phone || 'Sin teléfono'}
                      </span>
                      {lead.notes && (
                        <span className="text-[10px] text-slate-400 block mt-1 italic">
                          "{lead.notes}"
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {getSourceBadge(lead.source)}
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-800 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 font-medium text-[11px]">
                        {lead.programInterest || lead.scheduleId || 'BJJ General'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                          lead.status === 'CONVERTED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : lead.status === 'ATTENDED'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : lead.status === 'SCHEDULED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : lead.status === 'LOST'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {lead.status === 'NEW'
                          ? 'Nuevo'
                          : lead.status === 'SCHEDULED'
                          ? 'Programado'
                          : lead.status === 'ATTENDED'
                          ? 'Asistió'
                          : lead.status === 'CONVERTED'
                          ? 'Alumno Alta'
                          : 'Perdido'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      {lead.phone ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForWhatsapp(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition cursor-pointer shadow-sm"
                          title="Enviar WhatsApp de confirmación o bienvenida"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right space-x-1.5">
                      {lead.status !== 'ATTENDED' && lead.status !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lead.id, 'ATTENDED')}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          Asistió
                        </button>
                      )}

                      {lead.status !== 'CONVERTED' && (
                        <Link
                          to={`/admin/alta-alumno?leadId=${encodeURIComponent(lead.id)}&name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email || '')}&phone=${encodeURIComponent(lead.phone || '')}`}
                          className="px-3 py-1 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-lg font-bold text-xs transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span>Crear Ficha →</span>
                        </Link>
                      )}

                      {lead.status !== 'LOST' && lead.status !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lead.id, 'LOST')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-xs transition cursor-pointer"
                          title="Marcar como no interesado"
                        >
                          <X className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Prospecto Walk-In (Radix UI Dialog) */}
      <Dialog open={showWalkinModal} onOpenChange={setShowWalkinModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Prospecto Walk-In</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateWalkinLead} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nombre Completo *
              </label>
              <Input
                type="text"
                required
                placeholder="Ej. Lucas Fernández"
                value={walkinForm.name}
                onChange={(e) => setWalkinForm({ ...walkinForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Teléfono (WhatsApp) *
                </label>
                <Input
                  type="tel"
                  required
                  placeholder="Ej. 612 345 678"
                  value={walkinForm.phone}
                  onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="lucas@email.com"
                  value={walkinForm.email}
                  onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Canal de Captación
                </label>
                <select
                  value={walkinForm.source}
                  onChange={(e) => setWalkinForm({ ...walkinForm, source: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="WALK_IN">Mostrador Walk-In</option>
                  <option value="INSTAGRAM">Instagram DM</option>
                  <option value="GOOGLE">Google Maps / Web</option>
                  <option value="REFERRAL">Amigo / Alumno</option>
                  <option value="KIOSK">Kiosco Recepción</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Interés Principal
                </label>
                <select
                  value={walkinForm.programInterest}
                  onChange={(e) => setWalkinForm({ ...walkinForm, programInterest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="BJJ Adultos Gi">BJJ Adultos Gi</option>
                  <option value="No-Gi Submission Grappling">No-Gi Grappling</option>
                  <option value="BJJ Kids & Teens">BJJ Kids & Teens</option>
                  <option value="Defensa Personal">Defensa Personal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Notas / Horario sugerido
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Quiere venir a probar clase de martes 19:30, tiene kimono prestado..."
                value={walkinForm.notes}
                onChange={(e) => setWalkinForm({ ...walkinForm, notes: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWalkinModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="studio"
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Registrando...' : 'Registrar Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedLeadForWhatsapp && (
        <WhatsAppMessageModal
          isOpen={Boolean(selectedLeadForWhatsapp)}
          onClose={() => setSelectedLeadForWhatsapp(null)}
          defaultName={selectedLeadForWhatsapp.name}
          defaultPhone={selectedLeadForWhatsapp.phone}
          defaultType="TRIAL_CONFIRM"
          defaultDetails={{
            date: 'Esta semana',
            time: '19:30',
          }}
        />
      )}
    </div>
  );
};
