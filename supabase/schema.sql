-- Fase 11: persistencia de solicitudes y propuestas de viaje.
-- Ejecutar en el SQL Editor del proyecto de Supabase (Settings > SQL Editor).
--
-- Solo el backend (mediante la service_role key, nunca expuesta al
-- frontend) lee y escribe estas tablas, así que se deja Row Level Security
-- activado sin políticas: bloquea cualquier acceso con la clave anon/pública
-- y la service_role la salta siempre por diseño de Supabase.

create table if not exists trip_requests (
  id uuid primary key,
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date not null,
  travelers jsonb not null,
  budget numeric not null,
  currency text not null,
  travel_style text not null,
  preferences jsonb not null,
  constraints jsonb,
  created_at timestamptz not null default now()
);

create table if not exists trip_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_request_id uuid not null references trip_requests (id) on delete cascade,
  type text not null,
  score numeric not null,
  rank integer not null,
  total_cost numeric not null,
  proposal jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists provider_searches (
  id uuid primary key default gen_random_uuid(),
  trip_request_id uuid not null references trip_requests (id) on delete cascade,
  provider text not null,
  offer_count integer not null,
  errors jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trip_proposals_trip_request_id_idx on trip_proposals (trip_request_id);
create index if not exists provider_searches_trip_request_id_idx on provider_searches (trip_request_id);

-- Paso 2: caché de geocodificación. Una ciudad se geocodifica UNA vez en
-- toda la vida de la app; a partir de ahí se lee de aquí. Las coordenadas
-- de una ciudad no cambian, así que esta caché no caduca.
--
-- destination_key es el nombre normalizado (server/utils/text.ts): sin
-- acentos, en minúsculas y sin el país, para que "Roma", "roma" y
-- "Roma, Italia" compartan una única fila.
--
-- found = false guarda los "no encontrado": sin eso, un destino mal escrito
-- preguntaría a Geoapify una vez por búsqueda, para siempre. En esas filas
-- latitude/longitude van a null, de ahí que sean columnas opcionales.
--
-- Solo se guardan aquí resultados de un proveedor real. Los del mock no se
-- persisten nunca: si se guardasen, una búsqueda hecha sin GEOAPIFY_API_KEY
-- dejaría coordenadas inventadas clavadas en la caché y configurar la clave
-- después ya no arreglaría ese destino.
create table if not exists geocoding_cache (
  destination_key text primary key,
  destination_input text not null,
  latitude double precision,
  longitude double precision,
  formatted_name text,
  country_code text,
  found boolean not null,
  provider text not null,
  created_at timestamptz not null default now()
);

-- Paso 3: puntos de interés reales de Overture Maps.
--
-- No se rellena desde la app: Overture se distribuye como GeoParquet en S3,
-- no como API en vivo, así que las filas las carga scripts/load-overture-pois.ts
-- desde tu máquina (ver README). En producción esta tabla solo se lee.
--
-- id es el GERS de Overture, que es estable entre releases: recargar una
-- ciudad actualiza sus filas en vez de duplicarlas.
--
-- Se guarda overture_hierarchy además de la categoría para poder cambiar de
-- opinión sobre el mapeo a preferencias sin volver a descargar nada.
--
-- profile / duration_minutes / price_per_person son ESTIMADOS a partir de la
-- categoría: Overture no publica precios, duraciones ni horarios. Por eso las
-- actividades que salen de aquí viajan como verificationStatus "partial" y no
-- "verified" — el sitio es real, lo que cuesta y lo que dura es una
-- estimación nuestra.
create table if not exists places (
  id text primary key,
  destination_key text not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  basic_category text not null,
  overture_primary text,
  overture_hierarchy text[],
  preference text not null,
  profile jsonb not null,
  duration_minutes integer not null,
  price_per_person numeric not null,
  opening_hours jsonb,
  confidence real,
  website text,
  overture_release text not null,
  loaded_at timestamptz not null default now()
);

create index if not exists places_destination_key_idx on places (destination_key);

-- Paso 5: caché de tiempos de desplazamiento reales (OpenRouteService).
--
-- La clave es el par de coordenadas redondeado a 5 decimales (~1 m) más el
-- perfil de ruta. Se redondea porque Overture da 7 decimales: sin eso, dos
-- referencias al mismo sitio generarían dos filas distintas y la caché no
-- acertaría nunca.
--
-- El sentido importa: from -> to no es lo mismo que to -> from (calles de
-- un solo sentido, cuestas), así que cada dirección tiene su fila.
--
-- Solo se guardan tiempos de un proveedor real. Los del mock (haversine) no
-- se persisten: dejarían estimaciones clavadas para siempre y configurar
-- ORS_API_KEY después ya no arreglaría ese par.
create table if not exists routes_cache (
  route_key text primary key,
  profile text not null,
  from_lat double precision not null,
  from_lng double precision not null,
  to_lat double precision not null,
  to_lng double precision not null,
  duration_seconds double precision not null,
  distance_km double precision not null,
  provider text not null,
  created_at timestamptz not null default now()
);

-- Paso 8: tope diario de llamadas a APIs externas.
--
-- El límite por IP lo pone el WAF de Vercel, que corta en el edge antes de
-- que se ejecute nada. Esto cubre lo que el WAF no puede: su ventana máxima
-- es de 10 minutos, no un día, y aquí lo que se protege es la CUOTA de
-- Geoapify y OpenRouteService, no el volumen de peticiones.
--
-- Al superar el tope se deja de llamar al proveedor real y se usan los
-- simulados. No es un error: es la misma degradación que ya ocurre cuando
-- falta una clave.
create table if not exists api_usage (
  day date not null,
  provider text not null,
  call_count integer not null default 0,
  primary key (day, provider)
);

-- El contador se incrementa con una función y no con un upsert desde el
-- cliente: dos peticiones simultáneas leyendo y escribiendo `call_count + 1`
-- por su cuenta se pisarían, y el tope dejaría de contar bien justo cuando
-- más importa (bajo carga). Aquí el incremento es atómico.
create or replace function increment_api_usage(p_provider text)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into api_usage (day, provider, call_count)
  values (current_date, p_provider, 1)
  on conflict (day, provider)
  do update set call_count = api_usage.call_count + 1
  returning call_count into new_count;

  return new_count;
end;
$$;

-- Aciertos y fallos de caché, agregados por día.
--
-- Existe porque toda la estrategia de coste del proyecto depende de que las
-- cachés funcionen, y sin esto no había forma de saberlo: los contadores en
-- memoria no sirven en Vercel, donde cada función puede arrancar en frío, y
-- una línea de log hay que ir a rebuscarla. Esto se consulta con un select.
--
--   select day, cache, hits, misses,
--          round(100.0 * hits / nullif(hits + misses, 0)) as porcentaje
--   from cache_stats order by day desc, cache;
create table if not exists cache_stats (
  day date not null,
  cache text not null,
  hits integer not null default 0,
  misses integer not null default 0,
  primary key (day, cache)
);

-- Misma razón que increment_api_usage: la suma ocurre dentro de Postgres
-- para que dos búsquedas simultáneas no se pisen. Recibe las tres cachés de
-- una sola búsqueda juntas, en un array de objetos, para gastar una única ida
-- y vuelta dentro de la petición del usuario en vez de tres.
--
--   select increment_cache_stats('[{"cache":"routes","hits":42,"misses":6}]'::jsonb);
create or replace function increment_cache_stats(p_stats jsonb)
returns void
language plpgsql
as $$
begin
  insert into cache_stats (day, cache, hits, misses)
  select
    current_date,
    stat->>'cache',
    coalesce((stat->>'hits')::integer, 0),
    coalesce((stat->>'misses')::integer, 0)
  from jsonb_array_elements(p_stats) as stat
  on conflict (day, cache)
  do update set
    hits = cache_stats.hits + excluded.hits,
    misses = cache_stats.misses + excluded.misses;
end;
$$;

alter table trip_requests enable row level security;
alter table trip_proposals enable row level security;
alter table provider_searches enable row level security;
alter table geocoding_cache enable row level security;
alter table places enable row level security;
alter table routes_cache enable row level security;
alter table api_usage enable row level security;
alter table cache_stats enable row level security;

-- Las claves API nuevas de Supabase (sb_secret_...) no heredan en automático
-- los privilegios por defecto sobre tablas nuevas del rol service_role, así
-- que hay que concedérselos explícitamente (RLS activado arriba sigue
-- bloqueando anon/authenticated; service_role la salta siempre por diseño).
grant select, insert, update, delete on trip_requests, trip_proposals, provider_searches, geocoding_cache, places, routes_cache, api_usage, cache_stats to service_role;
grant execute on function increment_api_usage(text) to service_role;
grant execute on function increment_cache_stats(jsonb) to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
