import { useEffect, useState } from 'react';
import { Megaphone, Bell, HelpCircle, MessageCircle, FileSignature, Send, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import CollapsibleCard from '@/components/CollapsibleCard';

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

interface EventItem {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string | null;
  description: string | null;
}

interface NoticeItem {
  id: string;
  title: string;
  message: string;
  notice_type: string;
  created_at: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number | null;
}

export function AdminCommunicationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'forum' | 'notices' | 'chats' | 'docs' | 'events' | 'faqs'>('forum');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  // Foro
  const [forumTitle, setForumTitle] = useState('');
  const [forumContent, setForumContent] = useState('');
  const [forumDiscipline, setForumDiscipline] = useState('');

  // Avisos
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticesList, setNoticesList] = useState<NoticeItem[]>([]);

  // Eventos
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'Seminario' | 'Competición' | 'Graduación' | 'Open Mat'>('Seminario');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('247 STUDIO Pinto');
  const [eventDescription, setEventDescription] = useState('');
  const [eventsList, setEventsList] = useState<EventItem[]>([]);

  // FAQs
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqsList, setFaqsList] = useState<FaqItem[]>([]);

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

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, event_type, event_date, location, description')
      .eq('is_active', true)
      .order('event_date', { ascending: true });
    setEventsList((data as EventItem[]) ?? []);
  };

  const loadNotices = async () => {
    const { data } = await supabase
      .from('notices')
      .select('id, title, message, notice_type, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    setNoticesList((data as NoticeItem[]) ?? []);
  };

  const loadFaqs = async () => {
    const { data } = await supabase
      .from('faqs')
      .select('id, question, answer, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    setFaqsList((data as FaqItem[]) ?? []);
  };

  useEffect(() => {
    if (tab === 'chats') loadChats();
    if (tab === 'docs') loadSignedDocs();
    if (tab === 'events') loadEvents();
    if (tab === 'notices') loadNotices();
    if (tab === 'faqs') loadFaqs();
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
    await loadNotices();
  };

  const deleteNotice = async (id: string) => {
    await supabase.from('notices').delete().eq('id', id);
    setFeedback('Aviso eliminado.');
    await loadNotices();
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    const { error } = await supabase.from('events').insert({
      title: eventTitle.trim(),
      event_type: eventType,
      event_date: new Date(eventDate).toISOString(),
      location: eventLocation.trim() || '247 STUDIO Pinto',
      description: eventDescription.trim() || null,
      is_active: true,
    });
    if (error) {
      setFeedback(`Error al crear evento: ${error.message}`);
      return;
    }
    setEventTitle('');
    setEventDate('');
    setEventLocation('247 STUDIO Pinto');
    setEventDescription('');
    setFeedback('Evento publicado correctamente.');
    await loadEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setFeedback('Evento eliminado.');
    await loadEvents();
  };

  const addFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    await supabase.from('faqs').insert({
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      sort_order: faqsList.length + 1,
      is_active: true,
    });
    setFaqQuestion('');
    setFaqAnswer('');
    setFeedback('FAQ añadida.');
    await loadFaqs();
  };

  const deleteFaq = async (id: string) => {
    await supabase.from('faqs').delete().eq('id', id);
    setFeedback('FAQ eliminada.');
    await loadFaqs();
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
      <PageHeader
        title="Crear comunicaciones"
      />

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
          { id: 'events', label: 'Eventos', icon: Calendar },
          { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setFeedback(null);
              setTab(id as typeof tab);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === id ? 'bg-studio-cream text-slate-950' : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'forum' && (
        <form
          onSubmit={publishAnnouncement}
          className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Disciplina</label>
            <select
              value={forumDiscipline}
              onChange={(e) => setForumDiscipline(e.target.value)}
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl studio-btn px-5 py-2.5 text-sm font-semibold text-white"
          >
            Publicar en Foro
          </button>
        </form>
      )}

      {tab === 'chats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[55vh]">
          <div className="rounded-2xl studio-panel border border-white/10 p-3 space-y-2">
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
                      ? 'bg-studio-cream text-slate-950'
                      : 'studio-panel-inset text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs opacity-75 truncate">{c.lastMsg}</p>
                </button>
              ))
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl studio-panel border border-white/10 p-4 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-96">
              {activeThread.map((m) => {
                const isClient = m.sender_id === m.client_id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      isClient
                        ? 'mr-auto studio-panel-inset text-slate-200 border border-white/10'
                        : 'ml-auto bg-studio-cream text-slate-950'
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
                  className="flex-1 rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  className="rounded-xl studio-btn px-4 py-2 text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="rounded-2xl studio-panel border border-white/10 divide-y divide-white/5">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form
            onSubmit={publishNotice}
            className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
          >
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Título del Aviso</label>
              <input
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                required
                placeholder="Ej. Festivo próximo viernes"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Texto</label>
              <textarea
                rows={3}
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                required
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl studio-btn px-5 py-2.5 text-sm font-semibold text-white"
            >
              Enviar Aviso General
            </button>
          </form>

          <CollapsibleCard title="Avisos publicados" meta={`${noticesList.length}`}>
            {noticesList.length === 0 ? (
              <p className="text-sm text-slate-400">No hay avisos recientes.</p>
            ) : (
              <div className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
                {noticesList.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl studio-panel-inset border border-white/5 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{n.title}</span>
                        <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {n.notice_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(n.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNotice(n.id)}
                      title="Eliminar aviso"
                      className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>
        </div>
      )}

      {tab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form
            onSubmit={addEvent}
            className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
          >
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Título del Evento</label>
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                required
                placeholder="Ej. Seminario de Grappling con Mario"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Tipo de Evento</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as typeof eventType)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                >
                  <option value="Seminario">Seminario</option>
                  <option value="Competición">Competición</option>
                  <option value="Graduación">Graduación</option>
                  <option value="Open Mat">Open Mat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Ubicación</label>
              <input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="247 STUDIO Pinto"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Descripción (opcional)</label>
              <textarea
                rows={3}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Detalles de horario, requisitos o inscripción..."
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl studio-btn px-5 py-2.5 text-sm font-semibold text-white"
            >
              Publicar Evento
            </button>
          </form>

          <CollapsibleCard title="Eventos y Seminarios activos" meta={`${eventsList.length}`}>
            {eventsList.length === 0 ? (
              <p className="text-sm text-slate-400">No hay eventos publicados todavía.</p>
            ) : (
              <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
                {eventsList.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl studio-panel-inset border border-white/5 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-studio-red/20 text-red-300 border border-studio-red/30 font-semibold">
                          {ev.event_type}
                        </span>
                        <span className="text-sm font-semibold text-white">{ev.title}</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {new Date(ev.event_date).toLocaleString('es-ES', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{ev.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEvent(ev.id)}
                      title="Eliminar evento"
                      className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>
        </div>
      )}

      {tab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form
            onSubmit={addFaq}
            className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
          >
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Pregunta</label>
              <input
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                required
                placeholder="Ej. ¿Qué necesito traer el primer día?"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Respuesta</label>
              <textarea
                rows={3}
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                required
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl studio-btn px-5 py-2.5 text-sm font-semibold text-white"
            >
              Guardar FAQ
            </button>
          </form>

          <CollapsibleCard title="Preguntas Frecuentes publicadas" meta={`${faqsList.length}`}>
            {faqsList.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay FAQs en base de datos (los alumnos ven las 6 FAQs oficiales por defecto).
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
                {faqsList.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl studio-panel-inset border border-white/5 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-white">{f.question}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{f.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFaq(f.id)}
                      title="Eliminar FAQ"
                      className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>
        </div>
      )}

      {previewSig && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewSig(null)}
        >
          <div
            className="rounded-2xl studio-panel border border-white/15 p-6 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg uppercase text-white">
              Firma de {previewSig.signer_name}
            </h3>
            <img
              src={previewSig.signature_image_url}
              alt="Firma"
              className="w-full rounded-xl studio-panel-inset border border-white/10"
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
