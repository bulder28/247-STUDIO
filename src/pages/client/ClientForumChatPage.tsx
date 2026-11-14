import { useEffect, useState } from 'react';
import { Send, MessageCircle, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ForumViewPage } from '@/pages/shared/ForumViewPage';

interface PrivateMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ClientForumChatPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'forum' | 'chat'>('forum');
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [body, setBody] = useState('');

  const loadMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('private_messages')
      .select('id, sender_id, body, created_at')
      .eq('client_id', user.id)
      .order('created_at');
    setMessages((data as PrivateMessage[]) ?? []);
  };

  useEffect(() => {
    if (tab === 'chat') {
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
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setTab('forum')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'forum' ? 'bg-studio-red text-white' : 'bg-studio-navy text-slate-300'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Foro Oficial
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'chat' ? 'bg-studio-red text-white' : 'bg-studio-navy text-slate-300'
          }`}
        >
          <MessageCircle className="w-4 h-4" /> Chat con Admin
        </button>
      </div>

      {tab === 'forum' ? (
        <ForumViewPage />
      ) : (
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-4 flex flex-col h-[65vh]">
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
                        ? 'ml-auto bg-studio-red text-white'
                        : 'mr-auto bg-studio-navy-deep text-slate-200 border border-white/10'
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
              className="flex-1 rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-sm font-semibold text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

