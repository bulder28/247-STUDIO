import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { Mail, Phone } from 'lucide-react';
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Embudo de Clases de Prueba (Leads)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Prospectos captados en la web pública para su primera clase gratuita de Brazilian Jiu-Jitsu.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-100 rounded-3xl">
          <p className="text-sm font-bold text-white">No hay leads registrados en este momento.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-4 px-5">Interesado / Contacto</th>
                  <th className="py-4 px-4">Franja Seleccionada</th>
                  <th className="py-4 px-4">Estado del Embudo</th>
                  <th className="py-4 px-5 text-right">Acciones de Captación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-4 px-5">
                      <span className="font-extrabold text-sm text-white block">{lead.name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-700/40" /> {lead.email}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-700/40" /> {lead.phone}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-white font-semibold text-xs">
                      {lead.scheduleId}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          lead.status === 'CONVERTED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : lead.status === 'ATTENDED'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : lead.status === 'SCHEDULED'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : lead.status === 'LOST'
                            ? 'bg-studio-red/20 text-studio-red border border-studio-red/40'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right space-x-1.5">
                      {lead.status !== 'ATTENDED' && (
                        <button
                          onClick={() => handleUpdateStatus(lead.id, 'ATTENDED')}
                          className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-bold text-[11px] transition"
                        >
                          Asistió
                        </button>
                      )}

                      {lead.status !== 'CONVERTED' && (
                        <button
                          onClick={() => handleUpdateStatus(lead.id, 'CONVERTED')}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-bold text-[11px] transition"
                        >
                          Convertido (Alta)
                        </button>
                      )}

                      <Link
                        to={`/admin/alta-alumno?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone)}`}
                        className="px-2.5 py-1 bg-studio-red/20 text-studio-red hover:bg-studio-red/30 rounded-lg font-bold text-[11px] transition inline-block"
                      >
                        Crear Ficha →
                      </Link>

                      {lead.status !== 'LOST' && (
                        <button
                          onClick={() => handleUpdateStatus(lead.id, 'LOST')}
                          className="px-2.5 py-1 bg-studio-red/10 text-studio-red hover:bg-studio-red/20 rounded-lg font-bold text-[11px] transition"
                        >
                          Perdido
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
