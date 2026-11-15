import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X, Repeat, Ban, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear } from '@/lib/dateUtils';
import { formatEURExact, formatMonthLong } from '@/lib/format';
import {
  EXPENSE_METHODS,
  centsToEur,
  parseEurToCents,
  shiftMonth,
  type Expense,
  type ExpenseCategory,
  type ExpenseMethod,
  type RecurringExpense,
} from '@/lib/finance';

/** Qué abre el formulario: un gasto nuevo, la edición de uno, o confirmar un fijo del mes. */
export type ExpenseFormTarget =
  | { kind: 'new'; preferFixed?: boolean }
  | { kind: 'edit'; expense: Expense }
  | { kind: 'confirm-fixed'; template: RecurringExpense };

const VOID_REASONS = ['Duplicado', 'Importe erróneo', 'No se llegó a pagar'];

/** Hoy si el mes es el actual o futuro (no se paga en el futuro); si es pasado, el día habitual. */
function defaultDateFor(month: string, day?: number): string {
  if (month >= getLocalMonthYear()) return getLocalDateISO();
  const d = String(Math.min(28, Math.max(1, day ?? 1))).padStart(2, '0');
  return `${month}-${d}`;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');
}

/** Errores de base de datos traducidos a algo que se entienda. */
function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  if (e?.code === '23505') return 'Este gasto fijo ya está confirmado en este mes. Recarga la página.';
  if (e?.code === '42501') return 'No tienes permiso para esta acción.';
  return e?.message ?? 'Inténtalo de nuevo.';
}

export function ExpenseFormModal({
  target,
  month,
  categories,
  templates,
  onClose,
  onSaved,
}: {
  target: ExpenseFormTarget;
  month: string;
  categories: ExpenseCategory[];
  templates: RecurringExpense[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const titleId = useId();
  const errorId = `${titleId}-error`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const voidReasonRef = useRef<HTMLInputElement>(null);

  const editing = target.kind === 'edit' ? target.expense : null;
  const fixedTemplate =
    target.kind === 'confirm-fixed'
      ? target.template
      : editing?.recurring_expense_id
        ? templates.find((t) => t.id === editing.recurring_expense_id) ?? null
        : null;

  const [amount, setAmount] = useState(() =>
    editing ? centsToInput(editing.amount_cents) : fixedTemplate ? centsToInput(fixedTemplate.amount_cents) : ''
  );
  const [categoryId, setCategoryId] = useState(() => editing?.category_id ?? fixedTemplate?.category_id ?? '');
  const [date, setDate] = useState(() => editing?.expense_date ?? defaultDateFor(month, fixedTemplate?.day_of_month));
  const [concept, setConcept] = useState(() => editing?.concept ?? fixedTemplate?.concept ?? '');
  const [method, setMethod] = useState<ExpenseMethod | null>(
    () => editing?.payment_method ?? fixedTemplate?.payment_method ?? null
  );
  const [repeatMonthly, setRepeatMonthly] = useState(() => target.kind === 'new' && Boolean(target.preferFixed));
  const [applyToFuture, setApplyToFuture] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountInvalid, setAmountInvalid] = useState(false);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Refs para que los manejadores de teclado no reinicien el efecto de montaje
  const stateRef = useRef({ saving, voidOpen, onClose });
  stateRef.current = { saving, voidOpen, onClose };

  // Montaje: foco al importe, retener Tab dentro, Escape escalonado, sin scroll del fondo, devolver el foco
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    amountRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'Escape') {
        if (s.saving) return;
        e.preventDefault();
        if (s.voidOpen) setVoidOpen(false);
        else s.onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (voidOpen) voidReasonRef.current?.focus();
  }, [voidOpen]);

  const category = categories.find((c) => c.id === categoryId);
  const isFutureMonth = month > getLocalMonthYear();
  const title =
    target.kind === 'edit'
      ? 'Editar gasto'
      : target.kind === 'confirm-fixed'
        ? `Confirmar ${fixedTemplate?.concept ?? 'gasto fijo'}`
        : 'Nuevo gasto';

  const fail = (msg: string, focus?: HTMLElement | null) => {
    setError(msg);
    focus?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = parseEurToCents(amount);
    if (cents === null) {
      setAmountInvalid(true);
      return fail('Escribe un importe mayor que 0, por ejemplo 120 o 45,90.', amountRef.current);
    }
    if (!categoryId) {
      return fail('Elige una categoría.', categoriesRef.current?.querySelector('button'));
    }
    if (!date) return fail('Indica la fecha del pago.', dateRef.current);
    if (date > getLocalDateISO()) return fail('La fecha del pago no puede ser futura.', dateRef.current);

    setAmountInvalid(false);
    setError(null);
    setSaving(true);

    const finalConcept = concept.trim() || category?.name || 'Gasto';
    const periodMonth = target.kind === 'confirm-fixed' ? month : date.slice(0, 7);

    try {
      if (target.kind === 'edit' && editing) {
        const { error: upErr } = await supabase
          .from('expenses')
          .update({
            amount_cents: cents,
            category_id: categoryId,
            expense_date: date,
            concept: finalConcept,
            payment_method: method,
            // Un fijo sigue cubriendo su mes aunque cambie la fecha de pago
            ...(editing.recurring_expense_id ? {} : { period_month: periodMonth }),
          })
          .eq('id', editing.id);
        if (upErr) throw upErr;

        if (fixedTemplate && applyToFuture) {
          const { error: tErr } = await supabase
            .from('recurring_expenses')
            .update({ amount_cents: cents, concept: finalConcept, category_id: categoryId, payment_method: method })
            .eq('id', fixedTemplate.id);
          if (tErr) throw tErr;
        }
        onSaved('Gasto actualizado');
        return;
      }

      if (target.kind === 'confirm-fixed' && fixedTemplate) {
        const { error: insErr } = await supabase.from('expenses').insert({
          category_id: categoryId,
          concept: finalConcept,
          amount_cents: cents,
          expense_date: date,
          period_month: month,
          payment_method: method,
          recurring_expense_id: fixedTemplate.id,
        });
        if (insErr) throw insErr;
        onSaved(`${finalConcept} de ${formatMonthLong(month).toLowerCase()} confirmado · ${formatEURExact(centsToEur(cents))}`);
        return;
      }

      if (repeatMonthly) {
        // Plantilla + gasto del primer mes en una sola operación (todo o nada)
        const { error: rpcErr } = await supabase.rpc('create_recurring_expense', {
          p_category_id: categoryId,
          p_concept: finalConcept,
          p_amount_cents: cents,
          p_day_of_month: Number(date.slice(8, 10)) || 1,
          p_start_month: periodMonth,
          p_payment_method: method,
          p_expense_date: date,
        });
        if (rpcErr) throw rpcErr;
        onSaved(`Gasto fijo guardado · ${formatEURExact(centsToEur(cents))} cada mes`);
        return;
      }

      const { error: insErr } = await supabase.from('expenses').insert({
        category_id: categoryId,
        concept: finalConcept,
        amount_cents: cents,
        expense_date: date,
        period_month: periodMonth,
        payment_method: method,
      });
      if (insErr) throw insErr;
      onSaved(`Gasto guardado · ${formatEURExact(centsToEur(cents))}`);
    } catch (err) {
      setError(`No se ha guardado. ${friendlyError(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!editing) return;
    if (!voidReason.trim()) return fail('Indica el motivo de la anulación.', voidReasonRef.current);
    setSaving(true);
    setError(null);
    const { error: vErr } = await supabase
      .from('expenses')
      .update({ voided_at: new Date().toISOString(), void_reason: voidReason.trim() })
      .eq('id', editing.id);
    setSaving(false);
    if (vErr) return fail(`No se ha anulado. ${friendlyError(vErr)}`);
    onSaved(`Gasto anulado · el resultado sube ${formatEURExact(centsToEur(editing.amount_cents))}`);
  };

  /**
   * Dejar de repetir:
   * - desde un fijo pendiente del mes M: ya no se paga desde M (termina en M−1, o se desactiva si empezaba en M);
   * - desde un fijo confirmado: termina en el mes más tardío entre el que cubre y el actual, para no cortar
   *   hacia atrás meses ya confirmados.
   */
  const handleStopRepeating = async () => {
    if (!fixedTemplate) return;
    setSaving(true);
    setError(null);
    const current = getLocalMonthYear();
    let patch: { end_month?: string; is_active?: boolean };
    if (editing) {
      const p = editing.period_month;
      patch = { end_month: p > current ? p : current };
    } else {
      const prev = shiftMonth(month, -1);
      patch = prev < fixedTemplate.start_month ? { is_active: false } : { end_month: prev };
    }
    const { error: sErr } = await supabase.from('recurring_expenses').update(patch).eq('id', fixedTemplate.id);
    setSaving(false);
    if (sErr) return fail(`No se ha podido cambiar. ${friendlyError(sErr)}`);
    onSaved(
      editing
        ? `${fixedTemplate.concept} ya no se repetirá a partir de ${formatMonthLong(shiftMonth(patch.end_month ?? current, 1)).toLowerCase()}`
        : `${fixedTemplate.concept} ya no se paga desde ${formatMonthLong(month).toLowerCase()}`
    );
  };

  const fieldLabel = 'block text-sm font-medium text-slate-300 mb-1.5';
  const chip = (active: boolean) =>
    `min-h-[44px] px-3.5 rounded-xl border text-sm font-medium transition-colors ${
      active
        ? 'border-studio-cream bg-studio-cream text-studio-navy-deep'
        : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
    }`;
  const errorBox = error && (
    <p id={errorId} role="alert" className="text-sm text-red-200 bg-studio-red/20 border border-studio-red/40 rounded-xl px-3 py-2">
      {error}
    </p>
  );
  const footer = 'sticky bottom-0 -mx-5 sm:-mx-6 mt-2 px-5 sm:px-6 pt-3 bg-[#2e343e] border-t border-white/10';
  const footerPad = { paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-lg max-h-[92svh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl studio-panel border border-white/15 shadow-modal px-5 sm:px-6 pt-5 sm:pt-6"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id={titleId} className="font-headline text-xl uppercase text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="grid place-items-center w-11 h-11 -mr-2 -mt-1.5 rounded-xl text-slate-300 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {voidOpen && editing ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-200">
              ¿Anular el gasto de <strong>{formatEURExact(centsToEur(editing.amount_cents))}</strong> (
              {category?.name ?? 'sin categoría'}, {editing.expense_date.split('-').reverse().join('/')})? El resultado
              del mes subirá esa cantidad. Queda registrado, no se borra.
            </p>
            <fieldset>
              <legend className={fieldLabel}>Motivo</legend>
              <div className="flex flex-wrap gap-2 mb-2">
                {VOID_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={voidReason === r}
                    className={chip(voidReason === r)}
                    onClick={() => setVoidReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                ref={voidReasonRef}
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="u otro motivo"
                aria-label="Motivo de la anulación"
                aria-describedby={error ? errorId : undefined}
                className="w-full rounded-xl studio-field px-3.5 py-2.5 text-sm text-white"
              />
            </fieldset>
            {errorBox}
            <div className={`${footer} flex flex-col-reverse sm:flex-row sm:justify-end gap-2`} style={footerPad}>
              <button
                type="button"
                onClick={() => {
                  setVoidOpen(false);
                  setError(null);
                }}
                disabled={saving}
                className="min-h-[44px] rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={saving}
                className="min-h-[44px] rounded-xl studio-btn px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Anulando…' : 'Anular gasto'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {target.kind === 'confirm-fixed' && isFutureMonth && (
              <p className="text-sm text-sky-200">
                Pago por adelantado: cubre {formatMonthLong(month).toLowerCase()} y cuenta como gasto en el mes en que se
                paga.
              </p>
            )}

            {target.kind === 'new' && (
              <fieldset>
                <legend className={fieldLabel}>Tipo de gasto</legend>
                <div role="radiogroup" aria-label="Tipo de gasto" className="grid grid-cols-2 gap-2">
                  {[
                    { fixed: false, label: 'Variable', hint: 'Una sola vez (material, reparación)', icon: Plus },
                    { fixed: true, label: 'Fijo', hint: 'Se repite cada mes (alquiler, seguro)', icon: Repeat },
                  ].map(({ fixed, label, hint, icon: Icon }) => {
                    const active = repeatMonthly === fixed;
                    return (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRepeatMonthly(fixed)}
                        className={`text-left rounded-xl border px-3.5 py-2.5 transition-colors ${
                          active
                            ? 'border-studio-cream bg-studio-cream text-studio-navy-deep'
                            : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="w-4 h-4" aria-hidden /> {label}
                        </span>
                        <span className={`block text-xs mt-0.5 leading-snug ${active ? 'opacity-80' : 'text-slate-400'}`}>
                          {hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {repeatMonthly && (
                  <p className="text-xs text-slate-400 mt-2">
                    Cada mes aparecerá pendiente de confirmar. El día de la fecha será el día habitual de pago.
                  </p>
                )}
              </fieldset>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${titleId}-amount`} className={fieldLabel}>
                Importe (€)
              </label>
              <input
                id={`${titleId}-amount`}
                ref={amountRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountInvalid(false);
                }}
                aria-invalid={amountInvalid}
                aria-describedby={amountInvalid && error ? errorId : undefined}
                placeholder="0,00"
                className="w-full rounded-xl studio-field px-3.5 py-3 text-2xl font-headline text-white tabular-nums"
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-date`} className={fieldLabel}>
                Fecha del pago
              </label>
              <input
                id={`${titleId}-date`}
                ref={dateRef}
                type="date"
                value={date}
                max={getLocalDateISO()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl studio-field px-3.5 py-3.5 text-sm text-white"
              />
            </div>
            </div>

            <fieldset aria-describedby={!categoryId && error ? errorId : undefined}>
              <legend className={fieldLabel}>Categoría</legend>
              <div ref={categoriesRef} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`${chip(categoryId === c.id)} w-full text-left leading-tight py-2`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor={`${titleId}-concept`} className={fieldLabel}>
                Concepto <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id={`${titleId}-concept`}
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder={category?.name ?? 'Ej. Tatamis nuevos'}
                className="w-full rounded-xl studio-field px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <fieldset>
              <legend className={fieldLabel}>
                Cómo se pagó <span className="text-slate-400 font-normal">(opcional)</span>
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPENSE_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={method === m}
                    onClick={() => setMethod(method === m ? null : m)}
                    className={`${chip(method === m)} w-full`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>

            {editing && fixedTemplate && (
              <label className="flex items-start gap-3 rounded-xl studio-panel-inset border border-white/10 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToFuture}
                  onChange={(e) => setApplyToFuture(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-red-600"
                />
                <span className="text-sm text-slate-200">
                  Usar este importe en los meses que falten por confirmar
                  <span className="block text-slate-400 mt-0.5">
                    Si no, el cambio solo afecta a este mes. Los meses ya confirmados no cambian.
                  </span>
                </span>
              </label>
            )}

            {errorBox}

            <div className={`${footer} flex flex-col-reverse sm:flex-row sm:items-center gap-2`} style={footerPad}>
              {fixedTemplate && (
                <div className="flex flex-wrap gap-2 sm:mr-auto">
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoidOpen(true);
                        setError(null);
                      }}
                      disabled={saving}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-studio-red-text hover:bg-studio-red/10"
                    >
                      <Ban className="w-4 h-4" aria-hidden /> Anular
                    </button>
                  )}
                  {fixedTemplate.end_month === null && fixedTemplate.is_active && (
                    <button
                      type="button"
                      onClick={handleStopRepeating}
                      disabled={saving}
                      className="min-h-[44px] rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/5"
                    >
                      {editing ? 'Dejar de repetir' : 'Ya no se paga'}
                    </button>
                  )}
                </div>
              )}
              {editing && !fixedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setVoidOpen(true);
                    setError(null);
                  }}
                  disabled={saving}
                  className="sm:mr-auto min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-studio-red-text hover:bg-studio-red/10"
                >
                  <Ban className="w-4 h-4" aria-hidden /> Anular
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="min-h-[44px] rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-xl studio-btn px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Guardando…' : target.kind === 'confirm-fixed' ? 'Confirmar pago' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
