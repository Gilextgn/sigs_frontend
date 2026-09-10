import axios from 'axios';

// On nettoie l'URL pour enlever tout slash final accidentel
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    ContentType: 'application/json',
  },
});

export async function ensureCsrfCookie(): Promise<void> {
  await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
  });
}
