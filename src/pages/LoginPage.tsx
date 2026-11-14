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
    <div className="min-h-screen flex items-center justify-center bg-studio-navy-deep px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-studio-navy border border-white/10 p-8 shadow-modal">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/logo.webp"
            alt="247 STUDIO"
            className="w-20 h-20 object-contain mb-4 rounded-xl"
          />
          <h1 className="font-headline text-3xl tracking-wide uppercase text-white">
            247 STUDIO
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'login'
              ? 'Área de Alumnos, Profesores y Administración'
              : 'Recuperar contraseña'}
          </p>
        </div>

        {serverError && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-studio-red/15 border border-studio-red/40 px-3 py-2.5 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-studio-red" />
            <span>{serverError}</span>
          </div>
        )}

        {resetSent && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-2.5 text-sm text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Revisa tu correo para restablecer tu contraseña.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                {...register('email')}
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-studio-red"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {mode === 'login' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-studio-red"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white transition"
            >
              <span>{isSubmitting ? 'Entrando...' : 'Entrar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePasswordReset}
              className="w-full rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-3 text-sm font-semibold text-white transition"
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
            className="text-xs text-slate-400 hover:text-white underline-offset-4 hover:underline"
          >
            {mode === 'login' ? 'He olvidado mi contraseña' : 'Volver al inicio de sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

