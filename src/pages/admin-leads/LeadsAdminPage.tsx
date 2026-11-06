import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { Mail, MessageCircle, Phone, UserPlus, X } from 'lucide-react';
import { db } from '@/shared/api/firebase';

interface LeadModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  scheduleId: string;
  status: 'NEW' | 'SCHEDULED' | 'ATTENDED' | 'CONVERTED' | 'LOST';
  createdAt: any;
}

export const LeadsAdminPage: React.FC = () => {
  const [leads, setLeads] = useState<LeadModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const snap = await getDocs(collection(db, 'leads'));
      const list: LeadModel[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<LeadModel, 'id'>) }));
      list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setLeads(list);
    } catch (err) {
      console.error(err);
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

  const getWhatsappLink = (phone: string, name: string) => {
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanDigits.startsWith('34') ? cleanDigits : `34${cleanDigits}`;
    const msg = encodeURIComponent(
      `¡Hola ${name}! Te escribimos de 247Studio BJJ Pinto acerca de tu clase de prueba gratuita. ¿Tienes alguna duda sobre la ubicación o el horario para tu primera sesión?`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  // Métricas del embudo
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'NEW' || l.status === 'SCHEDULED').length;
  const attendedLeads = leads.filter((l) => l.status === 'ATTENDED').length;
  const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Embudo de Clases de Prueba
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Prospectos captados en la web y kiosco para probar Brazilian Jiu-Jitsu en 247Studio.
          </p>
        </div>

        <Link
          to="/admin/alta-alumno"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Añadir Alumno Manual</span>
        </Link>
      </div>

      {/* KPI Cards del Embudo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Prospectos
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {totalLeads}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Por Asistir
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {newLeads}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            Asistieron a Clase
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {attendedLeads}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Convertidos (Altas)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {convertedLeads}
          </div>
        </div>
      </div>

      {/* Tabla de Leads */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <p className="text-sm font-semibold text-slate-600">No hay prospectos registrados en este momento.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Interesado / Contacto</th>
                  <th className="py-3.5 px-4">Clase Solicitada</th>
                  <th className="py-3.5 px-4">Estado del Embudo</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp Directo</th>
                  <th className="py-3.5 px-5 text-right">Acciones de Captación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-5">
                      <span className="font-extrabold text-sm text-slate-900 block">{lead.name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-800 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 font-mono text-[11px]">
                        {lead.scheduleId || 'Reserva Libre'}
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
                        <a
                          href={getWhatsappLink(lead.phone, lead.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition"
                          title="Abrir chat en WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Contactar</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right space-x-1.5">
                      {lead.status !== 'ATTENDED' && lead.status !== 'CONVERTED' && (
                        <button
                          onClick={() => handleUpdateStatus(lead.id, 'ATTENDED')}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          Asistió
                        </button>
                      )}

                      {lead.status !== 'CONVERTED' && (
                        <Link
                          to={`/admin/alta-alumno?leadId=${encodeURIComponent(lead.id)}&name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone)}`}
                          className="px-3 py-1 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-lg font-bold text-xs transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span>Crear Ficha →</span>
                        </Link>
                      )}

                      {lead.status !== 'LOST' && lead.status !== 'CONVERTED' && (
                        <button
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
    </div>
  );
};
