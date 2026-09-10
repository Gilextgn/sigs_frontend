import axios from 'axios';

// Récupération propre de l'URL de l'API (ex: https://sigs-backend-06tv.onrender.com)
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  // On s'assure de ne pas doubler /api si l'URL de l'env l'inclut déjà
  baseURL: API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
  withCredentials: true, // Requis pour Sanctum (cookies de session)
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    ContentType: 'application/json',
  },
});

/**
 * Sanctum exige un appel préalable à /sanctum/csrf-cookie avant tout
 * login ou mutation depuis un frontend SPA séparé.
 */
export async function ensureCsrfCookie(): Promise<void> {
  const baseWithoutApi = API_BASE_URL.replace(/\/api$/, '');
  await axios.get(`${baseWithoutApi}/sanctum/csrf-cookie`, {
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
