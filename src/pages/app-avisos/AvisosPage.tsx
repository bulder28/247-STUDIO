import React, { useState } from 'react';
import { AlertCircle, Bell, Calendar, CheckCircle2, Info, Pin } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

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
  const hasWaiverPending = !userData?.waiverSignedAt;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-1">
          <Bell className="w-4 h-4" />
          <span>Tablón Oficial</span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">Avisos y Comunicados</h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Avisos personalizados para tu perfil y comunicados oficiales de la academia.
        </p>
      </div>

      {/* Selector de filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
            filter === 'all'
              ? 'bg-studio-red text-white'
              : 'bg-white/5 text-studio-cream/70 hover:bg-white/10'
          }`}
        >
          Todos los avisos
        </button>
        <button
          onClick={() => setFilter('personal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
            filter === 'personal'
              ? 'bg-studio-red text-white'
              : 'bg-white/5 text-studio-cream/70 hover:bg-white/10'
          }`}
        >
          Mis avisos personales
        </button>
        <button
          onClick={() => setFilter('general')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
            filter === 'general'
              ? 'bg-studio-red text-white'
              : 'bg-white/5 text-studio-cream/70 hover:bg-white/10'
          }`}
        >
          Comunicados del centro
        </button>
      </div>

      {/* SECCIÓN 1: Avisos Personales (si aplican) */}
      {(filter === 'all' || filter === 'personal') && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-studio-cream uppercase tracking-wider flex items-center gap-2">
            <span>Avisos Personales</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-mono">
              {(hasPendingPayment ? 1 : 0) + (hasWaiverPending ? 1 : 0) + 1}
            </span>
          </h2>

          {hasPendingPayment && (
            <div className="p-4 rounded-2xl bg-studio-red/15 border border-studio-red/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-studio-red shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Cuota Mensual Pendiente de Regularización</h3>
                <p className="text-xs text-studio-cream/80">
                  Tu cuota actual requiere validación. Puedes abonarla en metálico en recepción o mediante transferencia/Bizum para mantener activo tu acceso.
                </p>
              </div>
            </div>
          )}

          {hasWaiverPending && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Consentimiento y Exención de Responsabilidad Pendiente</h3>
                <p className="text-xs text-studio-cream/80">
                  Por normativa del seguro deportivo, firma digitalmente la exención de responsabilidad desde tu sección de Perfil.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-studio-navy-light/80 border border-white/10 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Asistencia y Progresión Registrada</h3>
              <p className="text-xs text-studio-cream/70">
                Tu registro en la tablet de recepción está al día. Cada check-in acumula para tus horas de tatami y evaluación de grados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: Comunicados Generales */}
      {(filter === 'all' || filter === 'general') && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-studio-cream uppercase tracking-wider flex items-center gap-2">
            <span>Comunicados Oficiales de 247Studio</span>
          </h2>

          <div className="space-y-3">
            {generalNotices.map((notice) => (
              <div
                key={notice.id}
                className="p-5 rounded-2xl bg-studio-navy-light border border-white/10 hover:border-white/20 transition space-y-2 relative"
              >
                {notice.pinned && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-studio-red mb-1">
                    <Pin className="w-3 h-3 rotate-45" />
                    <span>Fijado en cabecera</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h3 className="text-base font-extrabold text-white">{notice.title}</h3>
                  <span className="text-[11px] text-studio-cream/60 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {notice.date}
                  </span>
                </div>
                <p className="text-xs text-studio-cream/80 leading-relaxed">{notice.message}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-studio-cream/50 border-t border-white/5">
                  <span>Publicado por: <strong className="text-white">{notice.author}</strong></span>
                  <span className="text-studio-cream/40">247Studio Academy</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
