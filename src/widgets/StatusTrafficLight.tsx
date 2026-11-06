import React from 'react';
import { AlertOctagon, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { DerivedPaymentStatus } from '@/shared/domain/types';

interface StatusTrafficLightProps {
  status: DerivedPaymentStatus;
  subtext?: string;
  className?: string;
}

export const StatusTrafficLight: React.FC<StatusTrafficLightProps> = ({
  status,
  subtext,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'OK':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/50',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500',
          badgeText: 'text-studio-navy font-bold',
          title: 'AL DÍA (OK)',
          icon: CheckCircle2,
          description: subtext || 'Acceso permitido a todas las clases de tu tarifa.',
        };
      case 'PENDING_VALIDATION':
        return {
          bg: 'bg-amber-500/15 border-amber-500/50',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500',
          badgeText: 'text-studio-navy font-bold',
          title: 'PAGO EN REVISIÓN',
          icon: Clock,
          description: subtext || 'Pago notificado por el alumno. Pendiente de verificación por admin.',
        };
      case 'GRACE':
        return {
          bg: 'bg-blue-500/15 border-blue-500/50',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-500',
          badgeText: 'text-white font-bold',
          title: 'PERIODO DE CORTESÍA (GRACIA)',
          icon: ShieldAlert,
          description: subtext || 'Tienes 7 días desde tu primera clase para regularizar tu cuota.',
        };
      case 'NOK':
      default:
        return {
          bg: 'bg-studio-red/15 border-studio-red/50',
          text: 'text-studio-red',
          badgeBg: 'bg-studio-red',
          badgeText: 'text-white font-bold',
          title: 'PAGO PENDIENTE (BLOQUEADO)',
          icon: AlertOctagon,
          description: subtext || 'Cuota vencida o saldo de sesiones agotado. Contacta con recepción.',
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 ${config.bg} ${className}`}
      role="status"
      aria-label={`Estado de membresía: ${config.title}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${config.badgeBg} ${config.badgeText} shadow-lg shadow-black/20`}>
          <IconComponent className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-studio-cream/70">
              Estado de Membresía
            </span>
          </div>
          <h2 className={`text-xl font-extrabold tracking-wide ${config.text}`}>
            {config.title}
          </h2>
          <p className="text-xs text-studio-cream/80 mt-1 leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
};
