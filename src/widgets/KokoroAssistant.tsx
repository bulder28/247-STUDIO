import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import {
  ArrowRight,
  Send,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { askGeminiKokoro } from '@/shared/ai/geminiClient';
import {
  generateKokoroResponse,
  interpretKokoroIntent,
  KokoroActionPayload,
  KokoroContext,
} from '@/shared/domain/kokoro';

interface ChatMessage {
  id: string;
  sender: 'user' | 'kokoro';
  text: string;
  badge?: string;
  action?: KokoroActionPayload;
  timestamp: string;
}

export const KokoroAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { role, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('kokoro_gemini_key') || '');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const kokoroRole = role === 'admin' ? 'admin' : 'student';

  const [liveMetrics, setLiveMetrics] = useState<{
    totalActiveUsers: number;
    frozenCount: number;
    atRiskCount: number;
    monthlyRevenueEstimateCents: number;
  }>({
    totalActiveUsers: 0,
    frozenCount: 0,
    atRiskCount: 0,
    monthlyRevenueEstimateCents: 0,
  });

  // Cargar métricas reales de la base de datos cuando se abre Kokoro (exclusivo para Administradores)
  useEffect(() => {
    if (!isOpen || kokoroRole !== 'admin') return;
    const loadLiveMetrics = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let active = 0;
        let frozen = 0;
        usersSnap.forEach((d) => {
          const st = d.data().accountStatus;
          if (st === 'ACTIVE') active++;
          else if (st === 'FROZEN' || st === 'PAUSED') frozen++;
        });

        const paySnap = await getDocs(collection(db, 'payments'));
        let revCents = 0;
        paySnap.forEach((d) => {
          const p = d.data();
          if (p.status === 'PAID') revCents += p.amountCents || 0;
        });

        setLiveMetrics({
          totalActiveUsers: active,
          frozenCount: frozen,
          atRiskCount: 0,
          monthlyRevenueEstimateCents: revCents,
        });
      } catch (err) {
        console.warn('Metrics load fallback:', err);
      }
    };
    loadLiveMetrics();
  }, [isOpen, kokoroRole]);

  // Mensaje inicial de bienvenida
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const defaultAlias = userData?.alias || (role === 'admin' ? 'Mario y David' : 'Guerrero');
    return [
      {
        id: 'msg_init',
        sender: 'kokoro',
        badge: kokoroRole === 'admin' ? 'COPILOTO ADMIN' : 'SENSEI VIRTUAL',
        text:
          kokoroRole === 'admin'
            ? `¡Oss ${defaultAlias}! Soy KOKORO, tu copiloto inteligente de 247Studio. Puedo ayudarte a revisar alumnos ausentes con riesgo de abandono, verificar la caja, planificar graduaciones o ajustar las cartas FIFA. ¿Qué revisamos hoy?`
            : `¡Oss ${defaultAlias}! Soy KOKORO, el sensei virtual de 247Studio. Pregúntame sobre cómo subir tu carta FIFA a Oro, tus horas para el próximo grado, horarios de clase o reglas del tatami.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Auto-scroll al final del chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Preguntas sugeridas según el rol
  const quickSuggestions =
    kokoroRole === 'admin'
      ? [
          { label: '🤖 ¿Cómo hacer la app autónoma?', query: '¿Cómo podemos hacer la app autónoma para gestionar el club sin depender de nadie?' },
          { label: '❄️ Pausar cuota por lesión', query: '¿Cómo congelar o pausar la cuota a un alumno lesionado?' },
          { label: '📸 Fotos en cartas FIFA', query: '¿Cómo subimos y recortamos fotos de los alumnos para sus cartas FIFA?' },
          { label: '🔴 Alumnos ausentes > 15 días', query: '¿Qué alumnos están en riesgo de abandono?' },
          { label: '💡 ¿Qué mejoras sugieres?', query: '¿Crees que podemos incluir alguna mejora en la app y el club?' },
          { label: '📊 Balance de caja este mes', query: '¿Cuánto dinero hemos cobrado este mes en caja?' },
          { label: '🥋 Alumnos listos para graduar', query: '¿Cómo van las graduaciones y promociones?' },
          { label: '🩴 Normas sagradas del tatami', query: '¿Cuáles son las reglas de kimono y chanclas?' },
        ]
      : [
          { label: '🥋 ¿Cómo subo mi carta a Oro?', query: '¿Cómo subo mi carta FIFA a Oro Raro?' },
          { label: '🎯 Mi próximo grado y horas', query: '¿Cuándo me toca el siguiente cinturón y cuántas horas me faltan?' },
          { label: '⚖️ Categorías de peso IBJJF', query: '¿Cuáles son los pesos y categorías oficiales en Gi y No-Gi?' },
          { label: '📅 Horario de clases hoy', query: '¿A qué hora son las clases de No-Gi y Gi hoy?' },
          { label: '🩴 Normas de higiene y kimono', query: '¿Es obligatorio llevar chanclas y kimono limpio?' },
          { label: '🔥 Consejo para pasar la guardia', query: 'Dame un consejo de técnica para pasar la guardia' },
        ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // 1. Intentar responder mediante el modelo LLM real (Google Gemini) si hay API key
    try {
      const llmText = await askGeminiKokoro(text, apiKey || undefined, kokoroRole);
      if (llmText) {
        const botMsg: ChatMessage = {
          id: `kok_${Date.now()}`,
          sender: 'kokoro',
          badge: 'GEMINI AI ⚡ LIVE',
          text: llmText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Continuar al motor determinista si falla
    }

    // 2. Motor determinista enriquecido con conocimiento Kaizen
    setTimeout(() => {
      const context: KokoroContext = {
        role: kokoroRole,
        currentUser: userData || null,
        totalActiveUsers: liveMetrics.totalActiveUsers,
        frozenCount: liveMetrics.frozenCount,
        atRiskCount: liveMetrics.atRiskCount,
        todayClassesCount: 4,
        monthlyRevenueEstimateCents: liveMetrics.monthlyRevenueEstimateCents,
      };

      const intent = interpretKokoroIntent(text, kokoroRole);
      const res = generateKokoroResponse(intent, context);

      const botMsg: ChatMessage = {
        id: `kok_${Date.now()}`,
        sender: 'kokoro',
        badge: res.badge,
        text: res.text,
        action: res.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleActionClick = (action?: KokoroActionPayload) => {
    if (!action) return;
    if (action.url) {
      navigate(action.url);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. BOTÓN FLOTANTE KOKORO EN LA ESQUINA INFERIOR DERECHA   */}
      {/* ======================================================== */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-[#09090B] text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-xl cursor-pointer hover:scale-105 transition animate-in fade-in slide-in-from-bottom-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
            <span>Hablar con <strong className="text-white font-black">KOKORO</strong></span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir asistente inteligente KOKORO"
          className="relative w-14 h-14 rounded-full bg-[#09090B] text-white border-2 border-zinc-800 shadow-xl flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 group"
        >
          {/* Kanji Kokoro (心) / Sello Marcial de Honor */}
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="font-serif text-xl font-black text-brand-accent select-none group-hover:rotate-6 transition-transform">
              心
            </span>
            <span className="text-[7px] font-black uppercase tracking-widest text-white/90 -mt-0.5">
              KOKORO
            </span>
          </div>

          {/* Indicador de Estado: En Línea */}
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090B] ring-2 ring-emerald-400/40 animate-pulse" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. VENTANA DE CHAT DE KOKORO (MODAL / POPOVER FLOTANTE)  */}
      {/* ======================================================== */}
      {isOpen && (
        <div className="fixed bottom-22 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[400px] h-[560px] max-h-[85vh] rounded-3xl bg-white border border-[#E4E4E7] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Cabecera del Asistente */}
          <div className="bg-[#09090B] text-white p-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-accent/15 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-serif text-2xl font-black shadow-inner">
                心
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-lg uppercase tracking-wider font-black text-white leading-none">
                    KOKORO
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {kokoroRole === 'admin' ? 'Copiloto Admin' : 'Sensei Tatami'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {apiKey ? '⚡ Gemini LLM Activo' : 'Tatami 247 · En Línea'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {kokoroRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configuración de IA Gemini"
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    apiKey ? 'text-brand-accent bg-brand-accent/20' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Cerrar chat con Kokoro"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Panel de Configuración Gemini LLM (Exclusivo para Administrador) */}
          {kokoroRole === 'admin' && showSettings && (
            <div className="bg-zinc-900 text-white p-3.5 border-b border-zinc-800 text-xs space-y-2 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Motor LLM Generativo (Google Gemini)
                </span>
                <span className="text-[10px] text-zinc-400">
                  {apiKey ? '🟢 Live API' : '⚪ Motor Base'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-tight">
                Para que KOKORO razone con total libertad sobre cualquier tema, introduce tu clave gratuita de Google AI Studio:
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setApiKey(val);
                    if (val) localStorage.setItem('kokoro_gemini_key', val);
                    else localStorage.removeItem('kokoro_gemini_key');
                  }}
                  placeholder="Pega tu clave AIzaSy..."
                  className="flex-1 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent"
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey('');
                      localStorage.removeItem('kokoro_gemini_key');
                    }}
                    className="px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Borrar
                  </button>
                )}
              </div>
              <div className="text-[10px] text-zinc-400">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-zinc-300 font-semibold"
                >
                  Obtener clave gratis en Google AI Studio →
                </a>
              </div>
            </div>
          )}

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F4F4F5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Insignia / Badge de contexto */}
                {msg.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#9F1239] bg-[#FFE4E6] px-2 py-0.5 rounded-md mb-1 inline-flex items-center gap-1 border border-rose-200">
                    <Sparkles className="w-2.5 h-2.5 text-brand-accent" />
                    {msg.badge}
                  </span>
                )}

                {/* Burbuja de Texto */}
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#09090B] text-white rounded-tr-xs'
                      : 'bg-white text-[#09090B] border border-[#E4E4E7] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Acción Interactiva (Generative UI) */}
                  {msg.action && msg.action.type !== 'NONE' && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleActionClick(msg.action)}
                        className="w-full py-2 px-3 rounded-xl bg-[#09090B] hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>{msg.action.label || 'Ver detalle'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-zinc-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Indicador de escritura animado */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#E4E4E7] w-24">
                <span className="w-2 h-2 rounded-full bg-[#09090B] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#09090B] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#09090B] animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Preguntas Sugeridas */}
          <div className="px-3 pt-2 pb-1 bg-white border-t border-[#E4E4E7] overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.query)}
                className="shrink-0 text-[10px] font-bold text-[#09090B] bg-zinc-100 hover:bg-[#FFE4E6] hover:text-[#9F1239] hover:border-rose-200 border border-[#E4E4E7] rounded-full px-2.5 py-1 transition cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Formulario de Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-[#E4E4E7] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                kokoroRole === 'admin'
                  ? 'Pregunta a Kokoro sobre mejoras, caja, ausencias...'
                  : 'Pregunta sobre tu carta FIFA, cinturón, clases...'
              }
              className="flex-1 px-3.5 py-2.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs text-[#09090B] placeholder-zinc-400 focus:outline-none focus:border-[#09090B]"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 rounded-xl bg-[#09090B] hover:bg-zinc-800 disabled:opacity-40 text-white transition cursor-pointer shrink-0"
              aria-label="Enviar mensaje a Kokoro"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
