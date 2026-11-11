/**
 * Precarga en segundo plano el código de las pestañas más usadas, para que al pulsarlas
 * ya estén descargadas y el cambio sea inmediato. No se hace con "ahorro de datos" activado.
 */
const STUDENT = [
  () => import('@/pages/app-home/HomePage'),
  () => import('@/pages/app-horario/SchedulePage'),
  () => import('@/pages/app-programas/ProgramsPage'),
  () => import('@/pages/app-perfil/ProfilePage'),
];

const ADMIN = [
  () => import('@/pages/admin-personal/PersonalPage'),
  () => import('@/pages/admin-asistencia/AttendanceAdminPage'),
  () => import('@/pages/admin-horarios/SchedulesAdminPage'),
  () => import('@/pages/admin-caja/CajaPage'),
  () => import('@/pages/admin-tarifas/TariffsAdminPage'),
];

export function prefetchRoutes(group: 'student' | 'admin'): void {
  if (typeof window === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;

  // El admin también entra a la vista de alumno: se precarga todo
  const loaders = group === 'student' ? STUDENT : [...ADMIN, ...STUDENT];
  const run = () => {
    loaders.forEach((load, i) => setTimeout(() => load().catch(() => undefined), i * 250));
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
