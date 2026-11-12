import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 text-studio-cream/90">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-studio-red hover:underline uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la página principal</span>
      </Link>

      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Cumplimiento RGPD (UE) 2016/679 & LOPDGDD 3/2018</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-wider">
          Política de Privacidad y Protección de Datos
        </h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Última actualización: Noviembre 2026 · 247Studio BJJ & Grappling Academy (Madrid)
        </p>
      </div>

      <div className="space-y-6 text-xs leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            1. Responsable del Tratamiento
          </h2>
          <p>
            El responsable del tratamiento de sus datos es <strong>247Studio Academy</strong>, con sede en Madrid (España). Correo electrónico de contacto para privacidad y derechos de protección de datos:{' '}
            <strong className="text-white">info@247studiobjj.com</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            2. Finalidad del Tratamiento y Base Jurídica
          </h2>
          <p>Tratamos la información que nos facilita con las siguientes finalidades:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Gestión de miembros y acceso:</strong> Control y registro de asistencias a clase en recepción y seguro deportivo obligatorio (Base: Ejecución de contrato de membresía).</li>
            <li><strong>Gestión de pagos y cuotas:</strong> Control de facturación, contabilidad y registro de métodos de pago autorizados (Base: Obligación legal y contractual).</li>
            <li><strong>Datos de Salud (Art. 9.2.a RGPD):</strong> Las lesiones o patologías médicas declaradas por el atleta se tratan exclusivamente bajo su <strong>consentimiento explícito</strong> para adaptar la intensidad del entrenamiento y prevenir accidentes en el tatami.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            3. Protección Especial de Datos de Menores de Edad
          </h2>
          <p>
            De acuerdo con el Artículo 8 del RGPD y el Artículo 7 de la LOPDGDD, para el tratamiento de datos de deportistas menores de 14 años se exige inexcusablemente el consentimiento expreso del padre, madre o tutor legal acreditado. Los datos del menor y de su tutor se conservan con medidas de seguridad reforzadas y nunca se ceden a terceros con fines publicitarios.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            4. Derechos del Interesado (ARCO-POL)
          </h2>
          <p>
            Cualquier alumno o tutor puede ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Supresión, Limitación del tratamiento, Portabilidad y Oposición</strong> enviando un correo a <strong className="text-white">info@247studiobjj.com</strong> indicando su nombre y documento de identidad. Asimismo, tiene derecho a reclamar ante la Agencia Española de Protección de Datos (AEPD).
          </p>
        </section>
      </div>
    </div>
  );
};
