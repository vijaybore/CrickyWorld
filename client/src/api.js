// In production (Vercel), VITE_API_URL is set via Vercel environment variables.
// In development, Vite proxy handles /api calls so we use empty string.
const API = import.meta.env.VITE_API_URL || '';

export default API;