import type { ReactNode } from 'react';
import { ClipboardCheck, CalendarDays, Megaphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PortalShell } from '@/layouts/PortalShell';

const coachNav = [
  { to: '/coach', label: 'Pasar lista', icon: ClipboardCheck, end: true },
  { to: '/coach/horario', label: 'Horario', icon: CalendarDays },
  { to: '/coach/foro', label: 'Foro', icon: Megaphone },
];

export function CoachLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <PortalShell
      roleLabel={profile?.full_name ? `Profesor, ${profile.full_name}` : 'Profesor'}
      primaryNav={coachNav}
    >
      {children}
    </PortalShell>
  );
}
