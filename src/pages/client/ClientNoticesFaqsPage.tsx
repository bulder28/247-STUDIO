import { useEffect, useState } from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';

interface Notice {
  id: string;
  target_user_id: string | null;
  title: string;
  message: string;
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

  useEffect(() => {
    supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotices((data as Notice[]) ?? []));
  }, [user]);

  const personal = notices.filter((n) => n.target_user_id !== null);
  const general = notices.filter((n) => n.target_user_id === null);

  const renderNotice = (n: Notice, personalNotice: boolean) => {
    const d = new Date(n.created_at);
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
        <time className="block text-xs text-slate-500 tabular-nums" dateTime={n.created_at}>
          {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </time>
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
