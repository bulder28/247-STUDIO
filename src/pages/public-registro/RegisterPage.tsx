import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Lock,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, profileMissing, loading: authLoading } = useAuth();

  // Si ya tiene cuenta y ficha activa en la academia, redirigir a su área de alumno o admin
  useEffect(() => {
    if (!user || authLoading || profileMissing !== false) return;
    navigate(role && role !== 'student' ? '/login' : '/app/home', { replace: true });
  }, [user, authLoading, profileMissing, role, navigate]);

  return (
    <div className="min-h-screen bg-studio-navy flex flex-col justify-center items-center p-4 py-12 relative overflow-hidden">
      {/* Fondo decorativo con marca */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img src="/herobackground.webp" alt="" className="w-full h-full object-cover filter grayscale" />
      </div>

      <div className="w-full max-w-xl bg-studio-navy-light/95 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md relative z-10">
        {/* Cabecera */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-3">
            <img src="/logo.webp" alt="247Studio" className="w-14 h-14 mx-auto object-contain brightness-110 drop-shadow-md" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-studio-red/15 border border-studio-red/30 text-studio-red text-[11px] font-bold uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Acceso Privado para Alumnos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Altas en 247 Studio
          </h1>
          <p className="text-xs text-studio-cream/70 mt-1 max-w-md mx-auto">
            El acceso a la app y al tatami está reservado exclusivamente a los atletas dados de alta en la academia.
          </p>
        </div>

        {user && profileMissing && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">Ficha de Alumno no activa</p>
              <p className="text-amber-200/90 leading-relaxed">
                Has iniciado sesión con <strong>{user.email}</strong>, pero tu cuenta todavía no cuenta con una ficha deportiva activa en 247 Studio.
              </p>
              <p className="text-[11px] text-amber-300">
                Para activar tu acceso a la app, acércate a la recepción o habla con Mario o David para formalizar tu alta.
              </p>
            </div>
          </div>
        )}

        {/* Explicación de política de academia */}
        <div className="p-4 sm:p-5 bg-studio-navy/80 rounded-2xl border border-white/10 space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-studio-red shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-studio-cream/90 space-y-1">
              <p className="font-bold text-white text-sm">
                Proceso Oficial de Incorporación
              </p>
              <p>
                Por seguridad deportiva, control de aforo y respeto al tatami, <strong>nadie puede registrarse por libre en internet</strong>. Toda alta requiere pasar previamente por la academia, formalizar la ficha deportiva y contratar la cuota correspondiente con los directores (Mario o David).
              </p>
            </div>
          </div>
        </div>

        {/* 3 Pasos para ser alumno */}
        <div className="space-y-3 mb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-studio-cream/60">
            ¿Cómo empezar a entrenar con nosotros?
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-studio-red/20 text-studio-red flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Reserva tu Clase de Prueba Gratuita</p>
                <p className="text-studio-cream/70 text-[11px] mt-0.5">
                  Ven a conocer las instalaciones, el tatami y a los profesores sin ningún coste ni compromiso.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-studio-red/20 text-studio-red flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Alta y Ficha Deportiva en Recepción</p>
                <p className="text-studio-cream/70 text-[11px] mt-0.5">
                  Tras tu clase, formalizamos tu matrícula, tu cuota y tu seguro deportivo presencialmente en la academia.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-studio-red/20 text-studio-red flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Activación Inmediata de tu App</p>
                <p className="text-studio-cream/70 text-[11px] mt-0.5">
                  Recibes al momento tu enlace de activación por WhatsApp para fijar tu clave y entrar a la app con tu carnet QR.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-3">
          <a
            href="https://wa.me/34677528185?text=Hola%2C%20quiero%20reservar%20una%20clase%20de%20prueba." target="_blank" rel="noreferrer"
            className="w-full py-4 px-6 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <Calendar className="w-4 h-4" />
            <span>Reservar Mi Clase de Prueba Gratuita</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href="https://wa.me/34677528185?text=Hola%2C%20quiero%20informaci%C3%B3n%20para%20darme%20de%20alta%20en%20247Studio."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 text-center"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Hablar con Recepción por WhatsApp</span>
          </a>
        </div>

        {/* Acceso para quienes ya son alumnos */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-studio-cream/70">
          ¿Ya eres alumno oficial dado de alta en la academia?{' '}
          <Link to="/login" className="text-studio-red hover:underline font-bold block sm:inline mt-1 sm:mt-0">
            Inicia Sesión con tu Email y Contraseña →
          </Link>
        </div>
      </div>
    </div>
  );
};
