import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'General' | 'Pagos' | 'Entrenamientos' | 'Kiosco';
  question: string;
  answer: string;
}

export const FaqsPage: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('1');

  const faqs: FaqItem[] = [
    {
      id: '1',
      category: 'General',
      question: '¿Qué necesito para mi primera clase de BJJ o Grappling?',
      answer:
        'Para BJJ Gi necesitas tu kimono (Gi) limpio y cinturón. Para Grappling / No-Gi, camiseta técnica (rashguard) ajustada y pantalón corto sin bolsillos ni cremalleras. Es obligatorio traer chanclas para salir del tatami y una botella de agua.',
    },
    {
      id: '2',
      category: 'Entrenamientos',
      question: '¿Cómo funciona el registro de asistencia en la tablet?',
      answer:
        'Al entrar a la academia, abre tu app en el móvil en la sección "Home" para ver tu código QR personal o muestra tu número de socio. En la tablet de recepción seleccionas "Check-in", acercas tu QR o buscas tu nombre y confirmas si entrenas o vienes de observador.',
    },
    {
      id: '3',
      category: 'Pagos',
      question: '¿Cuándo se abonan las cuotas mensuales y qué métodos hay?',
      answer:
        'Las cuotas se abonan entre el día 1 y el día 7 de cada mes. Si pagas por transferencia o Bizum, puedes notificarlo desde la pestaña "Programas y Tarifas" para que los administradores validen tu comprobante. También puedes abonarlo en metálico en recepción.',
    },
    {
      id: '4',
      category: 'General',
      question: '¿Puedo suspender temporalmente mi cuota por lesión o viaje?',
      answer:
        'Sí. Desde la sección "Programas y Tarifas" puedes solicitar una suspensión temporal (congelación) indicando motivo y fecha estimada. La solicitud quedará en revisión y será validada por los administradores (Mario o David).',
    },
    {
      id: '5',
      category: 'Entrenamientos',
      question: '¿Cómo se evalúa la graduación y los grados en los cinturones?',
      answer:
        'En 247Studio la graduación se basa en horas de tatami acumuladas, consistencia en la asistencia, dominio de los 8 atributos técnicos (técnica, guardia, pase, derribos, etc.) y código de conducta deportiva.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-1">
          <HelpCircle className="w-4 h-4" />
          <span>Ayuda & Soporte</span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">Preguntas Frecuentes (FAQs)</h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Todo lo que necesitas saber sobre el funcionamiento de 247Studio, normas de tatami y cuotas.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="rounded-2xl bg-studio-navy-light border border-white/10 overflow-hidden transition"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-studio-red/20 text-studio-red border border-studio-red/30">
                    {faq.category}
                  </span>
                  <span className="text-sm font-extrabold text-white">{faq.question}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-studio-red shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-studio-cream/50 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-studio-cream/80 leading-relaxed border-t border-white/5">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
