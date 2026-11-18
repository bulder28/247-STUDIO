import { useEffect, useState } from 'react';
import { Send, MessageCircle, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ForumViewPage } from '@/pages/shared/ForumViewPage';
import { PageHeader } from '@/components/PageHeader';
import { getChatSeenAt, markChatSeen, markForumSeen } from '@/lib/noticeRead';

interface PrivateMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ClientForumChatPage() {
  const { user } = useAuth();
  // ?tab=chat abre directamente el chat con dirección (p. ej. desde el aviso de pago).
  const [tab, setTab] = useState<'forum' | 'chat'>(() =>
    new URLSearchParams(window.location.search).get('tab') === 'chat' ? 'chat' : 'forum'
  );
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [body, setBody] = useState('');

  const loadMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('private_messages')
      .select('id, sender_id, body, created_at')
      .eq('client_id', user.id)
      .order('created_at');
    const list = (data as PrivateMessage[]) ?? [];
    setMessages(list);
    markChatSeen(user.id, list[list.length - 1]?.created_at);
    setHasUnreadChat(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    if (tab === 'forum') {
      markForumSeen(user.id);
      const seenChat = getChatSeenAt(user.id);
      let q = supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .neq('sender_id', user.id);
      if (seenChat) q = q.gt('created_at', seenChat);
      q.then(({ count }) => setHasUnreadChat((count ?? 0) > 0));
    } else {
      loadMessages();
    }
  }, [tab, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    await supabase.from('private_messages').insert({
      client_id: user.id,
      sender_id: user.id,
      body: body.trim(),
    });
    setBody('');
    await loadMessages();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tab === 'forum' ? 'Foro' : 'Chat con dirección'}
      />
      <div className="inline-flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
        <button
          onClick={() => setTab('forum')}
          className={`inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'forum' ? 'bg-studio-cream text-slate-950' : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Foro
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`relative inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'chat' ? 'bg-studio-cream text-slate-950' : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <MessageCircle className="w-4 h-4" /> Chat privado
          {hasUnreadChat && (
            <span className="inline-flex h-2 w-2 rounded-full bg-studio-red" aria-label="Mensajes sin leer" />
          )}
        </button>
      </div>

      {tab === 'forum' ? (
        <ForumViewPage embedded />
      ) : (
        <div className="rounded-2xl studio-panel border border-white/10 p-4 flex flex-col h-[65vh]">
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center mt-10">
                Escribe aquí cualquier duda privada a Mario / David.
              </p>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? 'ml-auto bg-studio-cream text-slate-950'
                        : 'mr-auto studio-panel-inset text-slate-200 border border-white/10'
                    }`}
                  >
                    <p>{m.body}</p>
                    <span className="block text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendMessage} className="mt-3 pt-3 border-t border-white/10 flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 min-h-11 rounded-xl studio-btn px-4 py-2 text-sm font-semibold text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

