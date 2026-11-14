import { useEffect, useState } from 'react';
import { Megaphone, Bell, HelpCircle, MessageCircle, FileSignature, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Discipline {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client?: { full_name: string } | null;
}

interface SignedDocRow {
  id: string;
  signer_name: string;
  signer_dni: string | null;
  signature_image_url: string;
  signed_at: string;
  profiles?: { full_name: string } | null;
  document_templates?: { title: string } | null;
}

export function AdminCommunicationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'forum' | 'notices' | 'chats' | 'docs' | 'faqs'>('forum');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  // Foro
  const [forumTitle, setForumTitle] = useState('');
  const [forumContent, setForumContent] = useState('');
  const [forumDiscipline, setForumDiscipline] = useState('');

  // Avisos
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  // FAQs
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  // Chats Privados
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [activeClientId, setActiveClientId] = useState<string>('');
  const [replyText, setReplyText] = useState('');

  // Documentos Firmados
  const [signedDocs, setSignedDocs] = useState<SignedDocRow[]>([]);
  const [previewSig, setPreviewSig] = useState<SignedDocRow | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('disciplines')
      .select('id, name')
      .order('sort_order')
      .then(({ data }) => setDisciplines((data as Discipline[]) ?? []));
  }, []);

  const loadChats = async () => {
    const { data } = await supabase
      .from('private_messages')
      .select('id, client_id, sender_id, body, created_at, client:profiles!private_messages_client_id_fkey(full_name)')
      .order('created_at');
    const msgs = (data as unknown as ChatMessage[]) ?? [];
    setAllMessages(msgs);
    if (!activeClientId && msgs.length > 0) {
      setActiveClientId(msgs[0].client_id);
    }
  };

  const loadSignedDocs = async () => {
    const { data } = await supabase
      .from('document_signatures')
      .select('id, signer_name, signer_dni, signature_image_url, signed_at, profiles(full_name), document_templates(title)')
      .order('signed_at', { ascending: false });
    setSignedDocs((data as unknown as SignedDocRow[]) ?? []);
  };

  useEffect(() => {
    if (tab === 'chats') loadChats();
    if (tab === 'docs') loadSignedDocs();
  }, [tab]);

  const publishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !forumTitle.trim() || !forumContent.trim()) return;
    await supabase.from('announcements').insert({
      title: forumTitle.trim(),
      content: forumContent.trim(),
      discipline_id: forumDiscipline || null,
      author_id: user.id,
    });
    setForumTitle('');
    setForumContent('');
    setFeedback('Comunicado publicado en el Foro.');
  };

  const publishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) return;
    await supabase.from('notices').insert({
      target_user_id: null,
      notice_type: 'general',
      title: noticeTitle.trim(),
      message: noticeMessage.trim(),
    });
    setNoticeTitle('');
    setNoticeMessage('');
    setFeedback('Aviso general enviado a todos los alumnos.');
  };

  const addFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    await supabase.from('faqs').insert({
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
    });
    setFaqQuestion('');
    setFaqAnswer('');
    setFeedback('FAQ añadida.');
  };

  const sendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClientId || !replyText.trim()) return;
    await supabase.from('private_messages').insert({
      client_id: activeClientId,
      sender_id: user.id,
      body: replyText.trim(),
    });
    setReplyText('');
    await loadChats();
  };

  // Agrupar conversaciones por alumno
  const conversations = Array.from(
    allMessages.reduce((map, m) => {
      if (!map.has(m.client_id)) {
        map.set(m.client_id, {
          clientId: m.client_id,
          name: m.client?.full_name ?? 'Alumno',
          lastMsg: m.body,
        });
      } else {
        map.get(m.client_id)!.lastMsg = m.body;
      }
      return map;
    }, new Map<string, { clientId: string; name: string; lastMsg: string }>())
  ).map(([, v]) => v);

  const activeThread = allMessages.filter((m) => m.client_id === activeClientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Comunicación y Documentación
        </h1>
        <p className="text-sm text-slate-400">
          Foro, Avisos, Chats privados con alumnos, Firmas legales y FAQs.
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'forum', label: 'Foro', icon: Megaphone },
          { id: 'chats', label: 'Chats Privados', icon: MessageCircle },
          { id: 'docs', label: 'Firmas', icon: FileSignature },
          { id: 'notices', label: 'Avisos', icon: Bell },
          { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setFeedback(null);
              setTab(id as typeof tab);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === id ? 'bg-studio-red text-white' : 'bg-studio-navy text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'forum' && (
        <form
          onSubmit={publishAnnouncement}
          className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Disciplina</label>
            <select
              value={forumDiscipline}
              onChange={(e) => setForumDiscipline(e.target.value)}
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="">Todas las disciplinas (General)</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Título</label>
            <input
              value={forumTitle}
              onChange={(e) => setForumTitle(e.target.value)}
              required
              placeholder="Ej. Seminario de Leglocks este sábado"
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Mensaje</label>
            <textarea
              rows={4}
              value={forumContent}
              onChange={(e) => setForumContent(e.target.value)}
              required
              placeholder="Escribe el comunicado..."
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-studio-red hover:bg-studio-red-dark px-5 py-2.5 text-sm font-semibold text-white"
          >
            Publicar en Foro
          </button>
        </form>
      )}

      {tab === 'chats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[55vh]">
          <div className="rounded-2xl bg-studio-navy border border-white/10 p-3 space-y-2">
            <p className="text-xs uppercase text-slate-400 px-2 pt-1">Conversaciones</p>
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500 px-2">Ningún alumno ha escrito todavía.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.clientId}
                  onClick={() => setActiveClientId(c.clientId)}
                  className={`w-full text-left rounded-xl p-3 transition ${
                    activeClientId === c.clientId
                      ? 'bg-studio-red text-white'
                      : 'bg-studio-navy-deep text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs opacity-75 truncate">{c.lastMsg}</p>
                </button>
              ))
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl bg-studio-navy border border-white/10 p-4 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-96">
              {activeThread.map((m) => {
                const isClient = m.sender_id === m.client_id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      isClient
                        ? 'mr-auto bg-studio-navy-deep text-slate-200 border border-white/10'
                        : 'ml-auto bg-studio-red text-white'
                    }`}
                  >
                    <p>{m.body}</p>
                  </div>
                );
              })}
            </div>
            {activeClientId && (
              <form onSubmit={sendAdminReply} className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder al alumno..."
                  className="flex-1 rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="rounded-2xl bg-studio-navy border border-white/10 divide-y divide-white/5">
          {signedDocs.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">Aún no hay documentos firmados por alumnos.</p>
          ) : (
            signedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {doc.profiles?.full_name} — {doc.document_templates?.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Firmante: {doc.signer_name} {doc.signer_dni ? `(${doc.signer_dni})` : ''} ·{' '}
                    {new Date(doc.signed_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewSig(doc)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white"
                >
                  Ver Firma
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'notices' && (
        <form
          onSubmit={publishNotice}
          className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Título del Aviso</label>
            <input
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              required
              placeholder="Ej. Festivo próximo viernes"
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Texto</label>
            <textarea
              rows={3}
              value={noticeMessage}
              onChange={(e) => setNoticeMessage(e.target.value)}
              required
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-studio-red hover:bg-studio-red-dark px-5 py-2.5 text-sm font-semibold text-white"
          >
            Enviar Aviso General
          </button>
        </form>
      )}

      {tab === 'faqs' && (
        <form
          onSubmit={addFaq}
          className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Pregunta</label>
            <input
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              required
              placeholder="Ej. ¿Qué necesito traer el primer día?"
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Respuesta</label>
            <textarea
              rows={3}
              value={faqAnswer}
              onChange={(e) => setFaqAnswer(e.target.value)}
              required
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-studio-red hover:bg-studio-red-dark px-5 py-2.5 text-sm font-semibold text-white"
          >
            Guardar FAQ
          </button>
        </form>
      )}

      {previewSig && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewSig(null)}
        >
          <div
            className="rounded-2xl bg-studio-navy border border-white/15 p-6 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg uppercase text-white">
              Firma de {previewSig.signer_name}
            </h3>
            <img
              src={previewSig.signature_image_url}
              alt="Firma"
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10"
            />
            <button
              onClick={() => setPreviewSig(null)}
              className="w-full rounded-xl bg-studio-red py-2 text-sm font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
