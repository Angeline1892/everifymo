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

function buildHeaders(token, options) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function forceLogout() {
  const agency = localStorage.getItem('agency');
  const role = localStorage.getItem('role');

  let redirectPath = '#/universal-login?reason=session_expired';
  if (agency === 'national_admin') {
    redirectPath = '#/universal-login?tab=national-admin&reason=session_expired';
  } else if (role === 'fda_admin' || role === 'lea_admin') {
    redirectPath = '#/universal-login?tab=interagency-admin&reason=session_expired';
  }

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('agency');
  localStorage.removeItem('role');

  window.location.hash = redirectPath;
}

export async function apiFetch(path, options = {}) {
  const accessToken = localStorage.getItem('access_token');
  let response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(accessToken, options),
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      forceLogout();
      throw new Error('Session expired.');
    }

    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(newToken, options),
    });

    if (response.status === 401) {
      forceLogout();
      throw new Error('Session expired.');
    }
  }

  return response;
}