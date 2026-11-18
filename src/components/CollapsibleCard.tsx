import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Tarjeta plegable: empieza plegada y muestra título + resumen (meta).
 * Se usa para listas y bloques largos, así la pantalla se lee de un vistazo.
 */
export default function CollapsibleCard({
  title,
  meta,
  defaultOpen = false,
  className = 'rounded-2xl studio-panel border border-white/10',
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={`group/card ${className}`}>
      <summary className="list-none cursor-pointer flex flex-wrap items-center justify-between gap-3 px-5 py-4 min-h-[56px] rounded-2xl transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
          <ChevronRight
            className="w-4 h-4 text-slate-400 transition-transform group-open/card:rotate-90"
            aria-hidden
          />
          {title}
        </h2>
        {meta != null && <span className="text-sm text-slate-200 tabular-nums">{meta}</span>}
      </summary>
      <div className="px-5 pb-5 space-y-3">{children}</div>
    </details>
  );
}
