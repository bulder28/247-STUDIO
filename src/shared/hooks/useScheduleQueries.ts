import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import {
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
  BookingDomainModel,
} from '@/shared/domain/types';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';

export interface ScheduleDataResult {
  schedules: ScheduleDomainModel[];
  exceptions: ScheduleExceptionDomainModel[];
  myBookings: BookingDomainModel[];
  classCapacities: Record<string, { bookedCount: number; waitlistCount: number }>;
}

/**
 * Consulta de horarios, excepciones, aforo y reservas con TanStack Query
 * Proporciona caché persistente de 5 minutos y sincronización en segundo plano.
 */
export function useScheduleData(uid?: string) {
  return useQuery<ScheduleDataResult>({
    queryKey: ['schedules', uid || 'anonymous'],
    queryFn: async () => {
      const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
      const excQuery = collection(db, 'scheduleExceptions');
      const bQuery = uid
        ? query(collection(db, 'bookings'), where('uid', '==', uid))
        : null;
      const capQuery = collection(db, 'class_capacity');

      const [schedSnap, excSnap, bSnap, capSnap] = await Promise.all([
        getDocs(schedQuery),
        getDocs(excQuery),
        bQuery ? getDocs(bQuery) : Promise.resolve(null),
        getDocs(capQuery),
      ]);

      const sList: ScheduleDomainModel[] = [];
      schedSnap.forEach((d) =>
        sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) })
      );

      const eList: ScheduleExceptionDomainModel[] = [];
      excSnap.forEach((d) =>
        eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) })
      );

      const bList: BookingDomainModel[] = [];
      if (bSnap) {
        bSnap.forEach((d) =>
          bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) })
        );
      }

      const capMap: Record<string, { bookedCount: number; waitlistCount: number }> = {};
      capSnap.forEach((d) => {
        const data = d.data();
        if (data.scheduleId && data.date) {
          capMap[`${data.scheduleId}_${data.date}`] = {
            bookedCount: Number(data.bookedCount || 0),
            waitlistCount: Number(data.waitlistCount || 0),
          };
        }
      });

      return {
        schedules: sList.length > 0 ? sList : DEFAULT_OFFICIAL_SCHEDULES,
        exceptions: eList,
        myBookings: bList,
        classCapacities: capMap,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
  });
}

export interface BookClassParams {
  schedule: ScheduleDomainModel;
  targetDateStr: string;
  uid: string;
  isFull: boolean;
}

/**
 * Mutación para Reservar Clase con Actualización Optimista (UI responde en 0 ms)
 */
export function useBookClassMutation(uid?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['schedules', uid || 'anonymous'];

  return useMutation({
    mutationFn: async ({ schedule, targetDateStr, uid: userUid, isFull }: BookClassParams) => {
      const bookingId = `${schedule.id}_${targetDateStr}_${userUid}`;
      const status = isFull ? 'WAITLISTED' : 'BOOKED';

      await setDoc(doc(db, 'bookings', bookingId), {
        uid: userUid,
        scheduleId: schedule.id,
        date: targetDateStr,
        status,
        checkInSource: 'APP',
        createdAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${targetDateStr}`;
      await setDoc(
        doc(db, 'class_capacity', capDocId),
        {
          scheduleId: schedule.id,
          date: targetDateStr,
          bookedCount: isFull ? increment(0) : increment(1),
          waitlistCount: isFull ? increment(1) : increment(0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { bookingId, status, targetDateStr, schedule };
    },

    // UI Optimista: antes de que termine el write en Firestore, actualizamos la memoria local
    onMutate: async ({ schedule, targetDateStr, uid: userUid, isFull }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<ScheduleDataResult>(queryKey);

      if (previousData) {
        const slotKey = `${schedule.id}_${targetDateStr}`;
        const bookingId = `${schedule.id}_${targetDateStr}_${userUid}`;
        const newBooking: BookingDomainModel = {
          id: bookingId,
          uid: userUid,
          scheduleId: schedule.id,
          date: targetDateStr,
          status: isFull ? 'WAITLISTED' : 'BOOKED',
          sessionType: 'PARTICIPANT',
          attendanceWeight: 1,
          checkInSource: 'APP',
          createdAt: new Date().toISOString(),
        };

        const currentCap = previousData.classCapacities[slotKey] || {
          bookedCount: 0,
          waitlistCount: 0,
        };

        queryClient.setQueryData<ScheduleDataResult>(queryKey, {
          ...previousData,
          myBookings: [...previousData.myBookings, newBooking],
          classCapacities: {
            ...previousData.classCapacities,
            [slotKey]: {
              bookedCount: isFull ? currentCap.bookedCount : currentCap.bookedCount + 1,
              waitlistCount: isFull ? currentCap.waitlistCount + 1 : currentCap.waitlistCount,
            },
          },
        });
      }

      return { previousData };
    },

    // Rollback si ocurre un error de red
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    // Refrescar al terminar para sincronizar
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export interface CancelBookingParams {
  booking: BookingDomainModel;
  schedule: ScheduleDomainModel;
  targetDateStr: string;
}

/**
 * Mutación para Cancelar Reserva con Actualización Optimista
 */
export function useCancelBookingMutation(uid?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['schedules', uid || 'anonymous'];

  return useMutation({
    mutationFn: async ({ booking, schedule, targetDateStr }: CancelBookingParams) => {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${targetDateStr}`;
      if (booking.status === 'BOOKED') {
        await setDoc(
          doc(db, 'class_capacity', capDocId),
          {
            scheduleId: schedule.id,
            date: targetDateStr,
            bookedCount: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return { bookingId: booking.id };
    },

    onMutate: async ({ booking, schedule, targetDateStr }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ScheduleDataResult>(queryKey);

      if (previousData) {
        const slotKey = `${schedule.id}_${targetDateStr}`;
        const currentCap = previousData.classCapacities[slotKey] || {
          bookedCount: 0,
          waitlistCount: 0,
        };

        queryClient.setQueryData<ScheduleDataResult>(queryKey, {
          ...previousData,
          myBookings: previousData.myBookings.filter((b) => b.id !== booking.id),
          classCapacities: {
            ...previousData.classCapacities,
            [slotKey]: {
              bookedCount:
                booking.status === 'BOOKED'
                  ? Math.max(0, currentCap.bookedCount - 1)
                  : currentCap.bookedCount,
              waitlistCount: currentCap.waitlistCount,
            },
          },
        });
      }

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
