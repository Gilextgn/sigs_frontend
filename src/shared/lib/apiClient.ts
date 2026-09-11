import axios from 'axios';

// En dev (local), on pointe vers localhost:8000 par défaut.
// En prod, si VITE_API_URL n'est pas définie, on utilise une base relative
// (les appels passent alors par le rewrite Vercel vers le backend Render).
const rawApiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000' : '');

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
