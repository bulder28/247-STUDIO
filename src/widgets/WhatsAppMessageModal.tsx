import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import {
  WhatsAppTemplateData,
  generateWhatsAppMessage,
  openWhatsAppDirect,
} from '@/shared/utils/whatsappHelper';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultName?: string;
  defaultType?: WhatsAppTemplateData['templateType'];
  defaultDetails?: WhatsAppTemplateData['details'];
}

export const WhatsAppMessageModal: React.FC<WhatsAppMessageModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultName = 'Atleta',
  defaultType = 'TRIAL_CONFIRM',
  defaultDetails = {},
}) => {
  const [phone, setPhone] = useState(defaultPhone);
  const [name, setName] = useState(defaultName);
  const [templateType, setTemplateType] = useState<WhatsAppTemplateData['templateType']>(defaultType);
  const [date, setDate] = useState(defaultDetails.date || '');
  const [time, setTime] = useState(defaultDetails.time || '19:30');
  const [beltOrStripe, setBeltOrStripe] = useState(defaultDetails.beltOrStripe || 'Cinturón Azul');
  const [amount, setAmount] = useState(defaultDetails.amount || 60);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMessage = generateWhatsAppMessage({
    phone,
    recipientName: name,
    templateType,
    details: {
      date,
      time,
      beltOrStripe,
      amount,
      customText,
    },
  });

  const handleSend = () => {
    openWhatsAppDirect({
      phone,
      recipientName: name,
      templateType,
      details: {
        date,
        time,
        beltOrStripe,
        amount,
        customText,
      },
    });
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wider font-bold">
                Mensaje Rápido por WhatsApp
              </h2>
              <p className="text-xs text-emerald-100">Comunicación directa con alumnos y prospectos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Destinatario</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Móvil</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="612345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Plantillas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Plantilla de Mensaje</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'TRIAL_CONFIRM', label: '🥋 Confirmar Prueba' },
                { id: 'GRADUATION_CONGRATS', label: '🎉 Felicitación Grado' },
                { id: 'PAYMENT_REMINDER', label: '💳 Recordatorio Cuota' },
                { id: 'CUSTOM', label: '✍️ Personalizado' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplateType(item.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-left border transition ${
                    templateType === item.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parámetros condicionales */}
          {templateType === 'TRIAL_CONFIRM' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Día de la clase</label>
                <input
                  type="text"
                  placeholder="Ej. Este Lunes"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hora</label>
                <input
                  type="text"
                  placeholder="19:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {templateType === 'GRADUATION_CONGRATS' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Grado conseguido</label>
              <input
                type="text"
                placeholder="Cinturón Azul / 2º Grado"
                value={beltOrStripe}
                onChange={(e) => setBeltOrStripe(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          {templateType === 'PAYMENT_REMINDER' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Importe cuota (€)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          {templateType === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje Libre</label>
              <textarea
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Escribe el texto personalizado..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
              />
            </div>
          )}

          {/* Previsualización del mensaje */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Vista previa del mensaje</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar texto'}</span>
              </button>
            </div>
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
              {currentMessage}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!phone}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Abrir en WhatsApp</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};

