import type { ComponentType, ReactNode } from 'react';

/** Estado vacío unificado: icono, frase útil y, opcionalmente, una acción. */
export default function EmptyState({
  icon: Icon,
  children,
  action,
  compact = false,
  bare = false,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  /** Sin tarjeta propia (cuando ya está dentro de un contenedor). */
  bare?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex ${compact ? 'flex-row items-center text-left gap-3 p-3' : 'flex-col items-center text-center gap-3 p-8'} ${
        bare ? '' : 'rounded-2xl studio-panel-inset border border-white/10'
      }`}
    >
      <span className="grid place-items-center shrink-0 w-10 h-10 rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
        <Icon className="w-5 h-5 text-slate-300" aria-hidden />
      </span>
      <p className="text-sm text-slate-300 leading-snug max-w-md text-pretty">{children}</p>
      {action}
    </div>
  );
}
