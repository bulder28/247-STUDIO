import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-8 lg:px-10">
      {/* Fondo atmosférico de tatami */}
      <img
        src="/herobackground.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 pointer-events-none" />
      <div className="absolute inset-0 tatami-weave opacity-60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-studio-in">
        {/* Columna editorial (Desktop) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-studio-red animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-slate-200">
                Pinto, Madrid · Brazilian Jiu-Jitsu & Combat Academy
              </span>
            </div>

            <h1 className="font-headline text-5xl xl:text-6xl uppercase tracking-tight text-white leading-[0.95]">
              Disciplina diaria en el tatami.
            </h1>

            <p className="text-base text-slate-300 max-w-xl leading-relaxed">
              Consulta tu progreso real, horarios en vivo, cuotas, documentos y avisos oficiales de{' '}
              <strong className="text-white">247 STUDIO</strong> desde un único lugar.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {STUDIO_SHOWCASE.map((item) => (
              <div
                key={item.label}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/15 bg-slate-900 shadow-lg"
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                <span className="absolute bottom-2 inset-x-2 text-center font-headline text-xs uppercase tracking-wide text-white">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta de acceso */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/15 p-7 sm:p-8 shadow-modal backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-studio-red to-transparent" />

            <div className="flex flex-col items-center text-center mb-7">
              <div className="p-2 rounded-2xl bg-slate-950/70 border border-white/10 shadow-glow-red mb-4">
                <img
                  src="/logo.webp"
                  alt="247 STUDIO"
                  className="w-16 h-16 object-contain rounded-xl"
                />
              </div>
              <h2 className="font-headline text-3xl tracking-wide uppercase text-white">
                247 STUDIO
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Área de Alumnos, Profesores y Dirección'
                  : 'Recuperar contraseña'}
              </p>
            </div>

            {serverError && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-studio-red/15 border border-studio-red/40 px-3 py-2.5 text-sm text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-studio-red" />
                <span>{serverError}</span>
              </div>
            )}

            {resetSent && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-2.5 text-sm text-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Revisa tu correo para restablecer tu contraseña.</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    {...register('email')}
                    className="w-full rounded-xl studio-panel-inset border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-studio-red focus:ring-1 focus:ring-studio-red/40 transition"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {mode === 'login' && (
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...register('password')}
                      className="w-full rounded-xl studio-panel-inset border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-studio-red focus:ring-1 focus:ring-studio-red/40 transition"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>
              )}

              {mode === 'login' ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-studio-red to-rose-700 hover:from-rose-600 hover:to-studio-red-dark disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white shadow-glow-red transition"
                >
                  <span>{isSubmitting ? 'Entrando...' : 'Entrar al Tatami'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="w-full rounded-xl bg-gradient-to-r from-studio-red to-rose-700 hover:from-rose-600 hover:to-studio-red-dark px-4 py-3 text-sm font-semibold text-white shadow-glow-red transition"
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
                className="text-xs text-slate-400 hover:text-white underline-offset-4 hover:underline transition"
              >
                {mode === 'login' ? 'He olvidado mi contraseña' : 'Volver al inicio de sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

