import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel, ScheduleExceptionDomainModel } from '@/shared/domain/types';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';

export interface ScheduleDataResult {
  schedules: ScheduleDomainModel[];
  exceptions: ScheduleExceptionDomainModel[];
}

/**
 * Consulta de horarios y excepciones con TanStack Query
 * Proporciona caché persistente de 5 minutos y sincronización en segundo plano.
 */
export function useScheduleData(uid?: string) {
  return useQuery<ScheduleDataResult>({
    queryKey: ['schedules', uid || 'anonymous'],
    queryFn: async () => {
      const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
      const excQuery = collection(db, 'scheduleExceptions');

      const [schedSnap, excSnap] = await Promise.all([getDocs(schedQuery), getDocs(excQuery)]);

      const sList: ScheduleDomainModel[] = [];
      schedSnap.forEach((d) =>
        sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) })
      );

      const eList: ScheduleExceptionDomainModel[] = [];
      excSnap.forEach((d) =>
        eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) })
      );

      return {
        schedules: sList.length > 0 ? sList : DEFAULT_OFFICIAL_SCHEDULES,
        exceptions: eList,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
  });
}
