import type { ReactNode } from 'react';
import { Home, CalendarDays, MessageSquare, Bell, User, Tags, HelpCircle } from 'lucide-react';
import { PortalShell } from '@/layouts/PortalShell';

const primaryNav = [
  { to: '/app', label: 'Inicio', icon: Home, end: true },
  { to: '/app/horario', label: 'Horario', icon: CalendarDays },
  { to: '/app/foro', label: 'Foro', icon: MessageSquare },
  { to: '/app/avisos', label: 'Avisos', icon: Bell },
  { to: '/app/perfil', label: 'Perfil', icon: User },
];

const secondaryNav = [
  { to: '/app/tarifas', label: 'Tarifas', icon: Tags },
  { to: '/app/faqs', label: 'Ayuda', icon: HelpCircle },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell roleLabel="Pinto, Madrid" primaryNav={primaryNav} secondaryNav={secondaryNav}>
      {children}
    </PortalShell>
  );
}
