import { supabase } from '@/lib/supabase';

export interface PreconfirmationRow {
  user_id: string;
  schedule_class_id: string;
  class_date: string;
}

export function preconfKey(userId: string, classId: string, classDate: string): string {
  return `${userId}|${classId}|${classDate}`;
}

export async function toggleClassPreconfirmation({
  userId,
  scheduleClassId,
  classDate,
  confirmedBy,
  currentlyConfirmed,
}: {
  userId: string;
  scheduleClassId: string;
  classDate: string;
  confirmedBy: string;
  currentlyConfirmed: boolean;
}): Promise<boolean> {
  if (currentlyConfirmed) {
    const { error } = await supabase
      .from('class_preconfirmations')
      .delete()
      .eq('user_id', userId)
      .eq('schedule_class_id', scheduleClassId)
      .eq('class_date', classDate);
    return !error;
  }

  const { error } = await supabase.from('class_preconfirmations').upsert(
    {
      user_id: userId,
      schedule_class_id: scheduleClassId,
      class_date: classDate,
      confirmed_by: confirmedBy,
    },
    { onConflict: 'user_id,schedule_class_id,class_date' }
  );
  return !error;
}
