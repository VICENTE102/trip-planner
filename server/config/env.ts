export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

// Sección 14: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY nunca llevan el
// prefijo VITE_, así que no se incluyen en el bundle del frontend. Cuando
// faltan (p. ej. en desarrollo local antes de configurarlas) se devuelve
// undefined en lugar de lanzar, para que la generación de viajes con mocks
// siga funcionando sin Supabase — la persistencia (Fase 11) es best-effort.
export function getSupabaseConfig(): SupabaseConfig | undefined {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return undefined;
  }

  return { url, serviceRoleKey };
}

// Paso 2: misma política que las claves de Supabase — GEOAPIFY_API_KEY es una
// variable de entorno del servidor, sin prefijo VITE_, y las llamadas a
// Geoapify salen siempre desde api/ (nunca desde el navegador). Sin ella, la
// geocodificación cae al MockGeocodingProvider y la app sigue funcionando.
export function getGeoapifyApiKey(): string | undefined {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  return apiKey && apiKey.trim() !== "" ? apiKey.trim() : undefined;
}
