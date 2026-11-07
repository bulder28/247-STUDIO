import React, { useState } from 'react';
import { AlertCircle, Bell, Calendar, CheckCircle2, Pin } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Badge } from '@/shared/ui/badge';

interface AcademyNotice {
  id: string;
  type: 'urgent' | 'info' | 'event';
  title: string;
  date: string;
  message: string;
  author: string;
  pinned?: boolean;
}

export const AvisosPage: React.FC = () => {
  const { userData } = useAuth();
  const [filter, setFilter] = useState<'all' | 'personal' | 'general'>('all');

  const generalNotices: AcademyNotice[] = [
    {
      id: '1',
      type: 'event',
      title: 'Seminario Especial Mario & David de Técnicas de Piernas',
      date: '15 de Noviembre · 18:00',
      message: 'Masterclass intensiva sobre control de talón y defensas modernas de leglocks. Plazas limitadas. Reserva tu puesto en recepción.',
      author: 'Mario Bros (Head Coach)',
      pinned: true,
    },
    {
      id: '2',
      type: 'info',
      title: 'Horario Especial Próximo Día Festivo',
      date: 'Publicado hace 2 días',
      message: 'El próximo viernes el centro mantendrá sesión especial de Open Mat matinal de 11:00 a 13:00 para todas las disciplinas. Las clases de tarde se reanudan normalmente.',
      author: '247Studio Staff',
    },
    {
      id: '3',
      type: 'urgent',
      title: 'Recordatorio de Higiene y Calzado fuera del Tatami',
      date: 'Publicado hace 5 días',
      message: 'Es estrictamente obligatorio el uso de chanclas o calzado limpio al salir del tatami a zonas comunes y baños. Protegemos la salud de todos en el tatami.',
      author: 'David (Instructor)',
    },
  ];

  const hasPendingPayment = userData?.paymentStatusCache === 'NOK' || userData?.paymentStatusCache === 'GRACE';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-brand-accent text-xs font-black uppercase tracking-wider mb-1">
          <Bell className="w-4 h-4" />
          <span>Tablón Oficial</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Avisos y Comunicados</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Avisos personalizados para tu perfil y comunicados oficiales de 247Studio Pinto.
        </p>
      </div>

      {/* Selector de filtros */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto w-fit shadow-2xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Todos los avisos
        </button>
        <button
          onClick={() => setFilter('personal')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'personal'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mis avisos personales
        </button>
        <button
          onClick={() => setFilter('general')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'general'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Comunicados del centro
        </button>
      </div>

      {/* SECCIÓN 1: Avisos Personales (si aplican) */}
      {(filter === 'all' || filter === 'personal') && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>Avisos Personales</span>
            <Badge variant="secondary" className="text-[10px]">
              {(hasPendingPayment ? 1 : 0) + 1}
            </Badge>
          </h2>

          {hasPendingPayment && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">Cuota Mensual Pendiente de Regularización</h3>
                <p className="text-xs text-rose-700">
                  Tu cuota actual requiere validación. Puedes abonarla en metálico en recepción o mediante Bizum/tarjeta en el TPV de caja.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-subtle">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Asistencia y Progresión Registrada</h3>
              <p className="text-xs text-slate-500">
                Tu registro en la tablet de recepción está al día. Cada check-in acumula para tus horas de tatami y evaluación de grados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: Comunicados Generales */}
      {(filter === 'all' || filter === 'general') && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>Comunicados Oficiales de 247Studio</span>
          </h2>

          <div className="space-y-3">
            {generalNotices.map((notice) => (
              <div
                key={notice.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition shadow-subtle space-y-2 relative"
              >
                {notice.pinned && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-accent mb-1">
                    <Pin className="w-3.5 h-3.5 rotate-45" />
                    <span>Fijado en cabecera</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {notice.date}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notice.message}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>Publicado por: <strong className="text-slate-800 font-bold">{notice.author}</strong></span>
                  <span className="text-slate-400 font-medium">247Studio Academy</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
