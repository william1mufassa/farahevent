import axios from 'axios';

/**
 * Client des appels admin. Les requêtes passent par le BFF same-origin
 * (/api/proxy/*) qui porte la session en cookies httpOnly et ajoute le
 * Bearer côté serveur — aucun jeton n'est accessible au JS client
 * (audit §07). Le refresh silencieux est géré par le proxy.
 */
export const adminApi = axios.create({ baseURL: '/api/proxy', timeout: 20000 });

// Next normalise les URLs par un 308 sur le slash final : on le retire ici
// pour éviter un aller-retour navigateur (FastAPI re-normalise côté serveur).
adminApi.interceptors.request.use((config) => {
  if (config.url) config.url = config.url.replace(/\/+(?=\?|$)/, '');
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_USE_MOCK !== '1' &&
      !window.location.pathname.startsWith('/admin/login')
    ) {
      // Session expirée / révoquée : retour au login (profil purgé).
      localStorage.removeItem('fe_admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  },
);
