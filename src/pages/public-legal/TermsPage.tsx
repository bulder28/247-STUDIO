import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <Scale className="w-4 h-4" />
          <span>Reglamento y Condiciones de la Academia</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-wider">
          Términos y Condiciones de Uso
        </h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Normas de tatami, membresía y seguridad deportiva de 247Studio (Madrid)
        </p>
      </div>

      <div className="space-y-6 text-xs leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            1. Normas de Higiene y Etiqueta en el Tatami
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>El kimono (Gi) o equipamiento de No-Gi (rashguard y pantalón técnico) debe estar rigurosamente limpio en cada sesión.</li>
            <li>Uso obligatorio de calzado (chanclas) al transitar fuera del tatami a aseos o vestuarios. Nunca pisar el tatami con calzado de calle.</li>
            <li>Uñas de manos y pies cortadas e higiene personal para evitar lesiones a compañeros. No portar anillos, pendientes, cadenas ni piercings durante el combate.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            2. Cuotas, Renovaciones y Abandono
          </h2>
          <p>
            Las cuotas se devengan mensualmente del 1 al 7 de cada mes natural. El impago trascurrido el período de gracia facultará la suspensión temporal del acceso hasta su regularización. Las suspensiones temporales (congelación) por causa médica o de fuerza mayor deben comunicarse a través de la app y ser autorizadas por la dirección.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-wide">
            3. Exención de Responsabilidad Deportiva (Waiver)
          </h2>
          <p>
            El Brazilian Jiu-Jitsu, Grappling, Lucha y MMA son disciplinas de contacto físico que conllevan riesgo inherente de lesión muscular o articular. Todo practicante debe haber suscrito la declaración de aptitud física y exención de responsabilidad deportiva antes de participar activamente en combates (sparring).
          </p>
        </section>
      </div>
    </div>
  );
};
