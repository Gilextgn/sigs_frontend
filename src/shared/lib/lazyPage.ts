import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'sigs:chunk-reload';

/**
 * lazy() qui survit à un nouveau déploiement : un onglet resté ouvert
 * réclame des fichiers de page dont le nom (hash) n'existe plus, l'import
 * échoue et l'écran resterait bloqué sur le chargement. On recharge alors
 * la page une fois pour récupérer la nouvelle version.
 */
export function lazyPage<T extends ComponentType<object>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await factory();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // stockage indisponible : sans conséquence
      }
      return module;
    } catch (error) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
        sessionStorage.setItem(RELOAD_KEY, '1');
      } catch {
        alreadyReloaded = true;
      }
      if (!alreadyReloaded) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
