import { supabase } from '@/lib/supabase';

/**
 * Disciplinas que usan cinturón (confirmado con el cliente: BJJ y Grappling, y BJJ Femenino).
 * Son los `slug` de la tabla `disciplines`.
 *
 * El cinturón se guarda siempre en el perfil (`profiles.belt`) y no se borra al cambiar de
 * disciplina: si un alumno hace MMA un mes y vuelve a BJJ al siguiente, recupera su cinturón.
 * Esta regla solo decide si se MUESTRA ese mes.
 */
export const BELT_DISCIPLINE_SLUGS = ['bjj-grappling', 'bjj-femenino'];

type PlanShape = { plan_disciplines?: { disciplines?: { slug?: string } | { slug?: string }[] | null }[] | null };
type SubRow = { user_id: string; plans?: PlanShape | PlanShape[] | null };

const asArray = <T,>(v: T | T[] | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/**
 * De una lista de usuarios, devuelve los que este mes tienen una tarifa activa con alguna
 * disciplina de cinturón.
 */
export async function usersWithBeltThisMonth(userIds: string[], month: string): Promise<Set<string>> {
  const result = new Set<string>();
  if (userIds.length === 0) return result;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id, plans(plan_disciplines(disciplines(slug)))')
    .in('user_id', userIds)
    .eq('month_year', month)
    .eq('status', 'active');
  if (error || !data) return result;

  for (const row of data as unknown as SubRow[]) {
    const hasBelt = asArray(row.plans).some((plan) =>
      asArray(plan.plan_disciplines).some((pd) =>
        asArray(pd.disciplines).some((d) => d.slug && BELT_DISCIPLINE_SLUGS.includes(d.slug))
      )
    );
    if (hasBelt) result.add(row.user_id);
  }
  return result;
}
