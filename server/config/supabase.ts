import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env.js";

let client: SupabaseClient | undefined;

// Cliente único para todo el backend. Antes lo creaba trip.repository.ts por
// su cuenta; con dos repositorios (viajes y caché de geocodificación) se
// extrae aquí para no abrir dos conexiones a la misma base de datos ni
// duplicar la comprobación de configuración.
//
// Devuelve undefined si Supabase no está configurado, en vez de lanzar: cada
// repositorio decide qué hacer sin base de datos, y ninguno debe impedir que
// se genere un viaje.
export function getSupabaseClient(): SupabaseClient | undefined {
  const config = getSupabaseConfig();
  if (!config) {
    return undefined;
  }
  if (!client) {
    client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
