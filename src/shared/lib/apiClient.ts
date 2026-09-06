import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // requis pour Sanctum (cookies de session)
  // Depuis axios 1.6+, le header X-XSRF-TOKEN n'est plus attaché
  // automatiquement à partir du cookie XSRF-TOKEN que pour les requêtes
  // "same-origin". Ici le frontend (5173) et l'API (8000) sont sur des
  // ports différents donc deux origines différentes pour le navigateur :
  // sans ce flag, axios ignore silencieusement le cookie et Laravel
  // renvoie "419 CSRF token mismatch" sur toute requête POST/PUT/DELETE.
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Sanctum exige un appel préalable à /sanctum/csrf-cookie avant tout
 * login / mutation depuis un frontend SPA séparé.
 */
export async function ensureCsrfCookie(): Promise<void> {
  await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
  });
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);