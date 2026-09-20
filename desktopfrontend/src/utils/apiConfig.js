// Vite automatically sets import.meta.env.DEV to true when running `vite dev`
// and false when running `vite build` — no .env files or manual edits needed.
// Just update the production URL below once you have your real backend host.
const isDev = import.meta.env.DEV;

export const API_BASE_URL = isDev
  ? 'http://127.0.0.1:8000'
  : 'http://164.68.112.129:8000'; // ← replace with your actual production URL

