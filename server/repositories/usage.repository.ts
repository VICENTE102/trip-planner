import { getSupabaseClient } from "../config/supabase.js";

// Incrementa el contador del día para un proveedor y devuelve el valor ya
// incrementado. El incremento ocurre dentro de Postgres (función
// increment_api_usage, ver supabase/schema.sql) porque hacerlo desde aquí
// —leer, sumar uno y escribir— haría que dos peticiones simultáneas se
// pisaran, y el tope dejaría de contar bien justo bajo carga.
//
// Devuelve undefined si Supabase no está configurado o si la llamada falla.
// Quien llama debe interpretarlo como "no sé cuántas van", nunca como cero:
// un fallo del contador no puede desbloquear el tope ni bloquear la app.
export async function incrementApiUsage(provider: string): Promise<number | undefined> {
  const db = getSupabaseClient();
  if (!db) {
    return undefined;
  }

  const { data, error } = await db.rpc("increment_api_usage", { p_provider: provider });

  if (error) {
    console.error(`[usage] Error incrementando el contador de "${provider}"`, error);
    return undefined;
  }

  return typeof data === "number" ? data : undefined;
}

export async function readApiUsage(provider: string): Promise<number | undefined> {
  const db = getSupabaseClient();
  if (!db) {
    return undefined;
  }

  const { data, error } = await db
    .from("api_usage")
    .select("call_count")
    .eq("provider", provider)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();

  if (error) {
    console.error(`[usage] Error leyendo el contador de "${provider}"`, error);
    return undefined;
  }

  return data?.call_count ?? 0;
}
