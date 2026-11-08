import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Carga diferida ultra-resiliente contra desconexiones y despliegues en caliente de Netlify.
 * Si el navegador falla al descargar un chunk de JavaScript (p.ej. por cambio de versión en producción),
 * intenta recargar la caché automáticamente una única vez para entregar la versión actualizada.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  storageKey = '247_chunk_recovery'
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const component = await factory();
      // Si la carga fue exitosa, limpiamos el banderín de recuperación
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // En entornos sandbox o navegación privada restrictiva
      }
      return component;
    } catch (error) {
      const isModuleError =
        error instanceof Error &&
        (error.message.toLowerCase().includes('dynamically imported module') ||
          error.message.toLowerCase().includes('importing a module script failed') ||
          error.message.toLowerCase().includes('error loading dynamically imported module') ||
          error.message.toLowerCase().includes('failed to fetch'));

      let alreadyRetried = false;
      try {
        alreadyRetried = window.sessionStorage.getItem(storageKey) === 'true';
      } catch {
        // Ignorar fallo de almacenamiento
      }

      if (isModuleError && !alreadyRetried) {
        try {
          window.sessionStorage.setItem(storageKey, 'true');
        } catch {
          // Ignorar fallo de almacenamiento
        }
        window.location.reload();
      }

      throw error;
    }
  });
}
