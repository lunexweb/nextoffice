export const API_CONFIG = {
  USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA === 'true',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,
  EDGE_FUNCTION_URL: import.meta.env.VITE_EDGE_FUNCTION_URL,
} as const;

export const isProduction = () => import.meta.env.PROD;
export const isDevelopment = () => import.meta.env.DEV;
export const useMockData = () => API_CONFIG.USE_MOCK_DATA;
