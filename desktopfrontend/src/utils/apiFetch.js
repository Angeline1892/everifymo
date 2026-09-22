import { API_BASE_URL } from './apiConfig';

const BASE_URL = API_BASE_URL;

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${BASE_URL}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function resolveUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildHeaders(token, options) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  delete headers.authorization;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(path, options = {}) {
  const accessToken = localStorage.getItem('access_token');
  const url = resolveUrl(path);
  let response = await fetch(url, {
    ...options,
    headers: buildHeaders(accessToken, options),
  });

   if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      const agency = localStorage.getItem('agency');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('agency');
      window.location.href = (agency === 'superadmin' || agency === 'national_admin')
      ? '/universal-login?tab=national-admin'
      : '/universal-login';
      throw new Error('Session expired. Please log in again.');
    }
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(newToken, options),
    });
  }

  return response;
}