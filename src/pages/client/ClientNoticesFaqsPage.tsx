import { useEffect, useState } from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Avisos
        </h1>
        <p className="text-sm text-slate-400">Avisos personales y comunicados importantes.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-headline text-lg uppercase text-studio-red flex items-center gap-2">
          <Bell className="w-4 h-4" /> Avisos Personales
        </h2>
        {personal.length === 0 ? (
          <p className="text-sm text-slate-400">No tienes avisos personales.</p>
        ) : (
          personal.map((n) => (
            <div key={n.id} className="rounded-2xl bg-studio-navy border border-studio-red/30 p-4">
              <p className="font-semibold text-white text-sm">{n.title}</p>
              <p className="text-sm text-slate-300 mt-1">{n.message}</p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-headline text-lg uppercase text-white">Avisos Generales</h2>
        {general.length === 0 ? (
          <p className="text-sm text-slate-400">No hay avisos generales.</p>
        ) : (
          general.map((n) => (
            <div key={n.id} className="rounded-2xl bg-studio-navy border border-white/10 p-4">
              <div className="flex justify-between items-center gap-2">
                <p className="font-semibold text-white text-sm">{n.title}</p>
                <span className="text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{n.message}</p>
            </div>
          ))
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
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-studio-red" /> Preguntas Frecuentes
        </h1>
      </div>
      <div className="space-y-3">
        {faqs.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay preguntas frecuentes publicadas.</p>
        ) : (
          faqs.map((f) => (
            <details
              key={f.id}
              className="rounded-2xl bg-studio-navy border border-white/10 p-4 group"
            >
              <summary className="cursor-pointer font-semibold text-sm text-white list-none flex justify-between items-center">
                <span>{f.question}</span>
                <span className="text-studio-red text-lg">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">{f.answer}</p>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

