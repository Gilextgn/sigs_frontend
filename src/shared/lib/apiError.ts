import { AxiosError } from 'axios';

/**
 * Laravel renvoie des formes d'erreur différentes selon le cas :
 * - 422 (ValidationException) : { message, errors: { champ: [...] } }
 * - 429 (throttle)            : { message }
 * - 401/403                   : { message }
 * - 500 / réseau              : pas de réponse JSON exploitable
 *
 * Cette fonction retrouve le message le plus parlant possible au lieu
 * d'afficher un texte générique qui masquerait la vraie cause.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Impossible de contacter le serveur. Vérifiez que l'API est démarrée et accessible (CORS, URL, réseau).";
    }

    const { status, data } = error.response;

    const firstFieldError = data?.errors ? (Object.values(data.errors)[0] as string[] | undefined)?.[0] : undefined;
    if (firstFieldError) return firstFieldError;
    if (typeof data?.message === 'string' && data.message.length > 0) return data.message;

    if (status === 401) return 'Session expirée ou identifiants invalides.';
    if (status === 403) return "Vous n'avez pas la permission d'effectuer cette action.";
    if (status === 419) return "Session de sécurité expirée (jeton CSRF). Rechargez la page et réessayez.";
    if (status === 429) return 'Trop de tentatives. Réessayez dans quelques instants.';
    if (status >= 500) return 'Erreur serveur. Réessayez dans un instant.';
  }

  return fallback;
}
