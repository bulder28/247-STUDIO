import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BeltRule } from '@/components/PageHeader';

const loginSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

const STUDIO_SHOWCASE = [
  { label: 'BJJ Gi', img: '/disciplinas/bjj.webp' },
  { label: 'Grappling', img: '/disciplinas/grappling.webp' },
  { label: 'MMA', img: '/disciplinas/mma.webp' },
  { label: 'Lucha', img: '/disciplinas/lucha.webp' },
  { label: 'Kids', img: '/disciplinas/kids.webp' },
];

const EDGE_FADE = 'linear-gradient(90deg, transparent, #000 8%, #000 88%, transparent)';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setServerError('Correo o contraseña incorrectos.');
    }
  };

  const handlePasswordReset = async () => {
    setServerError(null);
    const email = getValues('email');
    if (!email || !email.includes('@')) {
      setServerError('Introduce primero tu correo para enviarte el enlace.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setServerError('No se pudo enviar el correo de recuperación.');
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10 lg:px-12">
      {/* Fondo: foto del tatami bajo tinta */}
      <img
        src="/herobackground.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.14] scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b15] via-[#070b15]/85 to-[#070b15]/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
        {/* Columna editorial */}
        <div className="lg:col-span-7 min-w-0">
          <p className="text-sm text-slate-300">
            Pinto, Madrid. Jiu-Jitsu brasileño, grappling, MMA y lucha.
          </p>

          {/* 24/7: los numerales se rellenan con la foto del tatami */}
          <p
            aria-hidden
            className="font-headline font-bold leading-[0.82] tracking-tighter select-none bg-cover bg-center mt-2 -ml-1"
            style={{
              fontSize: 'clamp(6.5rem, 21vw, 18rem)',
              backgroundImage: 'linear-gradient(175deg, #f4f0e1 10%, #ddd6b8 55%, #a89f7c 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            24/7
          </p>

          <h1 className="font-headline text-2xl sm:text-4xl uppercase text-white leading-tight mt-3 max-w-xl">
            Disciplina diaria en el tatami
          </h1>
          <p className="hidden sm:block text-base text-slate-300 max-w-lg leading-relaxed mt-3">
            Tu progreso real, el horario en vivo, tus cuotas, documentos y avisos oficiales de la
            academia en un único lugar.
          </p>

          {/* Tira de disciplinas en movimiento lento */}
          <div
            className="hidden lg:block mt-9 overflow-hidden"
            style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
          >
            <div className="studio-marquee gap-3">
              {[...STUDIO_SHOWCASE, ...STUDIO_SHOWCASE].map((item, idx) => (
                <figure
                  key={`${item.label}-${idx}`}
                  aria-hidden={idx >= STUDIO_SHOWCASE.length}
                  className="relative w-36 aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/15 shrink-0"
                >
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b15] via-transparent to-transparent" />
                  <figcaption className="absolute bottom-2.5 left-3 font-headline text-sm uppercase tracking-wide text-studio-cream">
                    {item.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjeta de acceso en arena de tatami */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
          <div className="studio-sand rounded-3xl overflow-hidden animate-studio-in">
            <BeltRule belt="Negro" stripes={4} className="!rounded-none !ring-0" />

            <div className="p-7 sm:p-9">
              <div className="flex items-center gap-4 mb-7">
                <img
                  src="/logo.webp"
                  alt=""
                  className="w-14 h-14 object-contain rounded-2xl bg-[#0b111f] p-1.5"
                />
                <div>
                  <h2 className="font-headline text-3xl uppercase leading-none text-[#141a2b]">
                    {mode === 'login' ? 'Entra al tatami' : 'Recupera tu acceso'}
                  </h2>
                  <p className="text-sm text-[#141a2b]/65 mt-1">
                    {mode === 'login'
                      ? 'Alumnos, profesores y dirección'
                      : 'Te enviamos un enlace a tu correo'}
                  </p>
                </div>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-5 flex items-center gap-2 rounded-xl bg-red-700/10 border border-red-700/30 px-3 py-2.5 text-sm text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {resetSent && (
                <div
                  role="status"
                  className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-700/10 border border-emerald-700/30 px-3 py-2.5 text-sm text-emerald-900"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Revisa tu correo para restablecer tu contraseña.</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#141a2b]/80 mb-1.5"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#141a2b]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      aria-invalid={Boolean(errors.email)}
                      {...register('email')}
                      className="w-full rounded-xl studio-field-sand pl-10 pr-4 py-3 text-sm"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
                </div>

                {mode === 'login' && (
                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#141a2b]/80 mb-1.5"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#141a2b]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        aria-invalid={Boolean(errors.password)}
                        {...register('password')}
                        className="w-full rounded-xl studio-field-sand pl-10 pr-4 py-3 text-sm"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>
                    )}
                  </div>
                )}

                {mode === 'login' ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group w-full flex items-center justify-center gap-2 rounded-xl studio-btn disabled:opacity-60 px-4 py-3.5 text-sm font-semibold text-white"
                  >
                    <span>{isSubmitting ? 'Entrando…' : 'Entrar'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="w-full rounded-xl studio-btn px-4 py-3.5 text-sm font-semibold text-white"
                  >
                    Enviar enlace de recuperación
                  </button>
                )}
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setServerError(null);
                    setResetSent(false);
                    setMode(mode === 'login' ? 'forgot' : 'login');
                  }}
                  className="text-xs font-medium text-[#141a2b]/70 hover:text-[#141a2b] underline underline-offset-4 decoration-[#141a2b]/30 hover:decoration-[#141a2b] transition"
                >
                  {mode === 'login' ? 'He olvidado mi contraseña' : 'Volver al inicio de sesión'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
