import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Home, CalendarDays, MessageSquare, Bell, User, Tags, HelpCircle } from 'lucide-react';
import { PortalShell } from '@/layouts/PortalShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getNoticesSeenAt, NOTICES_SEEN_EVENT } from '@/lib/noticeRead';

const secondaryNav = [
  { to: '/app/tarifas', label: 'Tarifas', icon: Tags },
  { to: '/app/faqs', label: 'Ayuda', icon: HelpCircle },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadNotices, setUnreadNotices] = useState(0);

  const fetchUnreadNotices = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotices(0);
      return;
    }
    const seenAt = getNoticesSeenAt(user.id);
    let query = supabase.from('notices').select('id', { count: 'exact', head: true });
    if (seenAt) {
      query = query.gt('created_at', seenAt);
    }
    const { count } = await query;
    setUnreadNotices(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadNotices();

    const onSeen = () => setUnreadNotices(0);
    const onFocus = () => {
      fetchUnreadNotices();
    };
    window.addEventListener(NOTICES_SEEN_EVENT, onSeen);
    window.addEventListener('focus', onFocus);

    const channel = user?.id
      ? supabase
          .channel(`client-notices-badge-${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notices' },
            () => {
              fetchUnreadNotices();
            }
          )
          .subscribe()
      : null;

    return () => {
      window.removeEventListener(NOTICES_SEEN_EVENT, onSeen);
      window.removeEventListener('focus', onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchUnreadNotices, user?.id]);

  const primaryNav = useMemo(
    () => [
      { to: '/app', label: 'Inicio', icon: Home, end: true },
      { to: '/app/horario', label: 'Horario', icon: CalendarDays },
      { to: '/app/foro', label: 'Foro', icon: MessageSquare },
      { to: '/app/avisos', label: 'Avisos', icon: Bell, badgeCount: unreadNotices },
      { to: '/app/perfil', label: 'Perfil', icon: User },
    ],
    [unreadNotices]
  );

  return (
    <PortalShell roleLabel="Pinto, Madrid" primaryNav={primaryNav} secondaryNav={secondaryNav}>
      {children}
    </PortalShell>
  );
}
