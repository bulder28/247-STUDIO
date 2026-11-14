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

export function ClientFaqsPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question, answer')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setFaqs((data as FaqItem[]) ?? []));
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

