import { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function SetPasswordPage() {
  const { user, refreshProfile, clearRecoveryMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ password });
    if (authErr) {
      setError(authErr.message);
      setSaving(false);
      return;
    }

    if (user) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);
    }

    clearRecoveryMode();
    await refreshProfile();
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-studio-navy-deep px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-studio-navy border border-white/10 p-8 shadow-modal">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo.webp" alt="247 STUDIO" className="w-16 h-16 object-contain mb-3 rounded-xl" />
          <h1 className="font-headline text-2xl uppercase tracking-wide text-white">
            Establece tu Contraseña
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Por seguridad, elige tu contraseña personal definitiva para acceder a 247 STUDIO.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-studio-red/15 border border-studio-red/40 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-studio-red" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-slate-300 mb-1">Nueva contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-300 mb-1">Repetir contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar y Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

