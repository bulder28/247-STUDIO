import { useEffect, useState } from 'react';
import { Bell, Calendar, HelpCircle, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { getNoticesSeenAt, markNoticesSeen } from '@/lib/noticeRead';

interface Notice {
  id: string;
  target_user_id: string | null;
  title: string;
  message: string;
  created_at: string;
}

interface GymEventItem {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string | null;
  description: string | null;
  created_at: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function ClientNoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<GymEventItem[]>([]);
  const [prevSeenAt] = useState<string | null>(() =>
    user?.id ? getNoticesSeenAt(user.id) : null
  );

  useEffect(() => {
    Promise.all([
      supabase.from('notices').select('*').order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, title, event_type, event_date, location, description, created_at')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date'),
    ]).then(([noticesRes, eventsRes]) => {
      const noticeList = (noticesRes.data as Notice[]) ?? [];
      const eventList = (eventsRes.data as GymEventItem[]) ?? [];
      setNotices(noticeList);
      setEvents(eventList);

      if (user?.id) {
        const latestNotice = noticeList[0]?.created_at ?? '';
        const latestEvent = eventList.reduce(
          (max, ev) => (ev.created_at > max ? ev.created_at : max),
          ''
        );
        const latest = latestNotice > latestEvent ? latestNotice : latestEvent;
        markNoticesSeen(user.id, latest || undefined);
      }
    });
  }, [user]);

  const personal = notices.filter((n) => n.target_user_id !== null);
  const general = notices.filter((n) => n.target_user_id === null);

  const renderNotice = (n: Notice, personalNotice: boolean) => {
    const d = new Date(n.created_at);
    const isUnread = !prevSeenAt || n.created_at > prevSeenAt;
    return (
      <li key={n.id} className="relative pl-8 pb-7 last:pb-0">
        {/* Línea de tiempo: nudo del cinturón por cada aviso */}
        <span
          aria-hidden
          className="absolute left-[7px] top-2 bottom-0 w-px bg-white/10 [li:last-child>&]:hidden"
        />
        <span
          aria-hidden
          className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-[4px] rotate-45 ${
            personalNotice ? 'bg-studio-red' : 'bg-studio-cream/80'
          }`}
        />
        <div className="flex items-center gap-2">
          <time className="block text-xs text-slate-500 tabular-nums" dateTime={n.created_at}>
            {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </time>
          {isUnread && (
            <span className="inline-flex items-center rounded-full bg-studio-red/20 border border-studio-red/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-studio-red">
              Nuevo
            </span>
          )}
        </div>
        <h3 className="font-headline text-xl uppercase text-white leading-tight mt-0.5">{n.title}</h3>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed max-w-2xl whitespace-pre-line">
          {n.message}
        </p>
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Avisos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="rounded-3xl studio-panel border border-studio-red/30 p-6 sm:p-7">
          <h2 className="text-sm font-semibold text-slate-300 mb-5 flex items-center gap-2">
            <Bell className="w-4 h-4 text-studio-red" /> Para ti
            {personal.length > 0 && (
              <span className="ml-auto text-xs font-normal text-slate-500 tabular-nums">
                {personal.length}
              </span>
            )}
          </h2>
          {personal.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nada pendiente. Si dirección te escribe un aviso personal, aparecerá aquí.
            </p>
          ) : (
            <ul>{personal.map((n) => renderNotice(n, true))}</ul>
          )}
        </section>

        <section className="rounded-3xl studio-panel border border-white/10 p-6 sm:p-7">
          <h2 className="text-sm font-semibold text-slate-300 mb-5 flex items-center">
            Para toda la academia
            {general.length > 0 && (
              <span className="ml-auto text-xs font-normal text-slate-500 tabular-nums">
                {general.length}
              </span>
            )}
          </h2>
          {general.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay avisos generales.</p>
          ) : (
            <ul>{general.map((n) => renderNotice(n, false))}</ul>
          )}
        </section>
      </div>

      {/* Eventos próximos publicados por Dirección */}
      <section className="rounded-3xl studio-panel border border-white/10 p-6 sm:p-7">
        <h2 className="text-sm font-semibold text-slate-300 mb-5 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-studio-red" />
          Próximos eventos
          {events.length > 0 && (
            <span className="ml-auto text-xs font-normal text-slate-500 tabular-nums">
              {events.length}
            </span>
          )}
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">
            No hay seminarios, competiciones ni eventos próximos publicados.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => {
              const d = new Date(ev.event_date);
              const dayNum = Number.isNaN(d.getTime()) ? '--' : String(d.getDate()).padStart(2, '0');
              const monthShort = Number.isNaN(d.getTime())
                ? ''
                : d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
              const timeStr = Number.isNaN(d.getTime())
                ? ''
                : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const isUnread = !prevSeenAt || ev.created_at > prevSeenAt;
              return (
                <article
                  key={ev.id}
                  className="rounded-2xl studio-panel-inset border border-white/10 p-4 flex items-start gap-4 hover:border-studio-red/40 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-studio-red/15 border border-studio-red/35 flex flex-col items-center justify-center shrink-0">
                    <span className="font-headline text-lg text-white leading-none">{dayNum}</span>
                    <span className="text-[10px] uppercase font-bold text-studio-red-text leading-tight mt-0.5">
                      {monthShort}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-studio-red-text font-bold uppercase tracking-wider">
                        {ev.event_type}
                      </span>
                      {timeStr && (
                        <span className="text-[11px] text-slate-500 tabular-nums">{timeStr}</span>
                      )}
                      {isUnread && (
                        <span className="inline-flex items-center rounded-full bg-studio-red/20 border border-studio-red/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-studio-red">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline text-lg uppercase text-white leading-tight">
                      {ev.title}
                    </h3>
                    {ev.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-sm text-slate-300 leading-relaxed pt-1 whitespace-pre-line">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const DEFAULT_OFFICIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-default-1',
    question: '¿Qué material necesito traer el primer día?',
    answer:
      'Para clases de Grappling No-Gi, MMA o Wrestling basta con camiseta ajustada (rashguard o técnica sin cremalleras) y pantalón corto sin bolsillos. Para clases de BJJ Gi se requiere kimono; si es tu clase de prueba gratuita avísanos y te prestamos uno.',
  },
  {
    id: 'faq-default-2',
    question: '¿Cuál es la diferencia entre BJJ Gi y Grappling (No-Gi)?',
    answer:
      'En BJJ Gi se entrena con kimono tradicional permitiendo agarres en solapas y mangas. En Grappling (No-Gi) se entrena sin kimono, con un ritmo más dinámico y agarres directos al cuerpo y extremidades. Tu tarifa de BJJ incluye ambas modalidades.',
  },
  {
    id: 'faq-default-3',
    question: '¿Cómo funciona el Bono de 8 clases o la Clase Suelta?',
    answer:
      'El Bono de 8 clases (70 €) te da 8 accesos a cualquier sesión de BJJ, MMA o Lucha sin compromiso mensual. Cada vez que el profesor pasa lista en el tatami se descuenta automáticamente 1 crédito y ves los restantes en tu pantalla de Inicio.',
  },
  {
    id: 'faq-default-4',
    question: '¿Cuándo se abona la cuota mensual?',
    answer:
      'Dispones de los primeros 7 días desde tu primer entrenamiento del mes para abonar la cuota en recepción (Efectivo o Bizum). Pasado ese plazo sin regularizar, tu ficha aparecerá marcada en seguimiento como factura pendiente.',
  },
  {
    id: 'faq-default-5',
    question: '¿Cómo funcionan los grupos Kids 1 y Kids 2?',
    answer:
      'Kids 2 (3 a 6 años) trabaja psicomotricidad, equilibrio, juego guiado y valores de tatami. Kids 1 (+7 años hasta 14) profundiza en técnica real de Jiu-Jitsu, respeto y defensa personal. Todos los menores de hasta 14 años deben tener datos de padre/madre y autorizaciones firmadas.',
  },
  {
    id: 'faq-default-6',
    question: '¿Qué ventajas tiene el plan Socio Fundador (SF)?',
    answer:
      'Los alumnos reconocidos como Socio Fundador (SF) por la dirección disfrutan de un 10% de descuento aplicado directamente sobre el precio final de su tarifa mensual mientras mantengan dicha condición.',
  },
];

export function ClientFaqsPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_OFFICIAL_FAQS);

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question, answer')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setFaqs(data as FaqItem[]);
        } else {
          setFaqs(DEFAULT_OFFICIAL_FAQS);
        }
      });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Preguntas frecuentes"
      />

      {faqs.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay preguntas frecuentes publicadas.</p>
      ) : (
        <div className="rounded-3xl studio-panel border border-white/10 px-5 sm:px-8 divide-y divide-white/[0.07] max-w-3xl">
          {faqs.map((f) => (
            <details key={f.id} className="studio-faq group py-5">
              <summary className="cursor-pointer flex justify-between items-start gap-4 text-white transition-colors hover:text-studio-cream">
                <span className="font-headline text-lg sm:text-xl uppercase leading-snug">
                  {f.question}
                </span>
                <span
                  aria-hidden
                  className="studio-faq-mark grid place-items-center w-8 h-8 shrink-0 rounded-full border border-white/15 text-studio-cream text-xl leading-none"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-2xl">{f.answer}</p>
            </details>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-400 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
        ¿No encuentras tu duda? Escríbenos desde el chat del Foro o pregunta en recepción.
      </p>
    </div>
  );
}
