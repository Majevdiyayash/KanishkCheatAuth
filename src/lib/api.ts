// Centralised API base URL
// In production: set VITE_API_URL in Netlify environment variables to your Railway/Render backend URL
// In dev: Vite proxy forwards /api → localhost:5000 automatically
export const API_BASE = import.meta.env.VITE_API_URL ?? '';
