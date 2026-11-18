import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Home, CalendarDays, MessageSquare, Bell, User, Tags, HelpCircle } from 'lucide-react';
import { PortalShell } from '@/layouts/PortalShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CHAT_SEEN_EVENT,
  DOCS_UPDATED_EVENT,
  FORUM_SEEN_EVENT,
  getChatSeenAt,
  getForumSeenAt,
  getNoticesSeenAt,
  NOTICES_SEEN_EVENT,
} from '@/lib/noticeRead';

const secondaryNav = [
  { to: '/app/tarifas', label: 'Tarifas', icon: Tags },
  { to: '/app/faqs', label: 'Ayuda', icon: HelpCircle },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadAvisos, setUnreadAvisos] = useState(0);
  const [unreadForum, setUnreadForum] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [pendingSignDocs, setPendingSignDocs] = useState(0);

  const fetchAvisosBadge = useCallback(async () => {
    if (!user?.id) {
      setUnreadAvisos(0);
      return;
    }
    const seenAt = getNoticesSeenAt(user.id);
    let noticesQ = supabase.from('notices').select('id', { count: 'exact', head: true });
    let eventsQ = supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString());

    if (seenAt) {
      noticesQ = noticesQ.gt('created_at', seenAt);
      eventsQ = eventsQ.gt('created_at', seenAt);
    }

    const [noticesRes, eventsRes] = await Promise.all([noticesQ, eventsQ]);
    setUnreadAvisos((noticesRes.count ?? 0) + (eventsRes.count ?? 0));
  }, [user?.id]);

  const fetchForumBadge = useCallback(async () => {
    if (!user?.id) {
      setUnreadForum(0);
      return;
    }
    const seenAt = getForumSeenAt(user.id);
    let q = supabase.from('announcements').select('id', { count: 'exact', head: true });
    if (seenAt) {
      q = q.gt('created_at', seenAt);
    }
    const { count } = await q;
    setUnreadForum(count ?? 0);
  }, [user?.id]);

  const fetchChatBadge = useCallback(async () => {
    if (!user?.id) {
      setUnreadChat(0);
      return;
    }
    const seenAt = getChatSeenAt(user.id);
    let q = supabase
      .from('private_messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .neq('sender_id', user.id);
    if (seenAt) {
      q = q.gt('created_at', seenAt);
    }
    const { count } = await q;
    setUnreadChat(count ?? 0);
  }, [user?.id]);

  const fetchDocsBadge = useCallback(async () => {
    if (!user?.id) {
      setPendingSignDocs(0);
      return;
    }
    // Documentos que sube la academia y exigen firma (pendientes o rechazados).
    const { count } = await supabase
      .from('document_assignments')
      .select('id, academy_documents!inner(requires_signature)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected'])
      .eq('academy_documents.requires_signature', true);
    setPendingSignDocs(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    fetchAvisosBadge();
    fetchForumBadge();
    fetchChatBadge();
    fetchDocsBadge();

    const onNoticesSeen = () => setUnreadAvisos(0);
    const onForumSeen = () => setUnreadForum(0);
    const onChatSeen = () => setUnreadChat(0);
    const onDocsUpdated = () => {
      fetchDocsBadge();
    };
    const onFocus = () => {
      fetchAvisosBadge();
      fetchForumBadge();
      fetchChatBadge();
      fetchDocsBadge();
    };

    window.addEventListener(NOTICES_SEEN_EVENT, onNoticesSeen);
    window.addEventListener(FORUM_SEEN_EVENT, onForumSeen);
    window.addEventListener(CHAT_SEEN_EVENT, onChatSeen);
    window.addEventListener(DOCS_UPDATED_EVENT, onDocsUpdated);
    window.addEventListener('focus', onFocus);

    const channel = user?.id
      ? supabase
          .channel(`client-comms-badges-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, fetchAvisosBadge)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAvisosBadge)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchForumBadge)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'private_messages', filter: `client_id=eq.${user.id}` },
            fetchChatBadge
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'document_assignments', filter: `user_id=eq.${user.id}` },
            fetchDocsBadge
          )
          .subscribe()
      : null;

    return () => {
      window.removeEventListener(NOTICES_SEEN_EVENT, onNoticesSeen);
      window.removeEventListener(FORUM_SEEN_EVENT, onForumSeen);
      window.removeEventListener(CHAT_SEEN_EVENT, onChatSeen);
      window.removeEventListener(DOCS_UPDATED_EVENT, onDocsUpdated);
      window.removeEventListener('focus', onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAvisosBadge, fetchForumBadge, fetchChatBadge, fetchDocsBadge, user?.id]);

  const primaryNav = useMemo(
    () => [
      { to: '/app', label: 'Inicio', icon: Home, end: true },
      { to: '/app/horario', label: 'Horario', icon: CalendarDays },
      { to: '/app/foro', label: 'Foro', icon: MessageSquare, badgeCount: unreadForum + unreadChat },
      { to: '/app/avisos', label: 'Avisos', icon: Bell, badgeCount: unreadAvisos, ringBell: true },
      // Con documentos pendientes de firma, Perfil pasa a ser una campana que vibra.
      pendingSignDocs > 0
        ? {
            to: '/app/perfil',
            label: 'Firmar',
            icon: Bell,
            badgeCount: pendingSignDocs,
            ringBell: true,
          }
        : { to: '/app/perfil', label: 'Perfil', icon: User },
    ],
    [unreadForum, unreadChat, unreadAvisos, pendingSignDocs]
  );

  return (
    <PortalShell roleLabel="Pinto, Madrid" primaryNav={primaryNav} secondaryNav={secondaryNav}>
      {children}
    </PortalShell>
  );
}
