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
  // Semáforo plano y legible desde lejos: color sólido + texto con contraste AA.
  const getStatusConfig = () => {
    switch (status) {
      case 'OK':
        return {
          box: 'bg-[#2BD07F] text-studio-navy',
          title: 'Al día',
          icon: CheckCircle2,
          description: subtext || 'Acceso permitido a todas las clases de tu tarifa.',
        };
      case 'PENDING_VALIDATION':
        return {
          box: 'bg-[#F5B731] text-studio-navy',
          title: 'Pago en revisión',
          icon: Clock,
          description: subtext || 'Has notificado tu pago. Falta que recepción lo verifique.',
        };
      case 'GRACE':
        return {
          box: 'bg-[#6DB0FF] text-studio-navy',
          title: 'Periodo de cortesía',
          icon: ShieldAlert,
          description: subtext || 'Tienes 7 días desde tu primera clase para regularizar tu cuota.',
        };
      case 'NOK':
      default:
        return {
          box: 'bg-studio-red-dark text-white',
          title: 'Pago pendiente',
          icon: AlertOctagon,
          description: subtext || 'Cuota vencida o saldo de sesiones agotado. Habla con recepción.',
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${config.box} ${className}`}
      role="status"
      aria-label={`Estado de membresía: ${config.title}`}
    >
      <div className="flex items-center gap-5">
        <IconComponent className="h-12 w-12 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold opacity-80">Tu membresía</p>
          <h2 className="font-display text-5xl uppercase">{config.title}</h2>
          <p className="mt-1.5 text-sm font-medium leading-snug">{config.description}</p>
        </div>
      </div>
    </div>
  );
};
