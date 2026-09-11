import axios from 'axios';

// On s'assure de récupérer la base URL propre (sans /api à la fin si l'utilisateur l'a mis par erreur)
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/**
 * Sanctum exige un appel préalable à /sanctum/csrf-cookie avant tout
 * login ou mutation depuis un frontend SPA séparé.
 * Note: La route csrf-cookie est à la racine, PAS sous /api/
 */
export async function ensureCsrfCookie(): Promise<void> {
  await apiClient.get('/../sanctum/csrf-cookie', {
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
