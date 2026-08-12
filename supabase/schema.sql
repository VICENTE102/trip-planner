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

alter table trip_requests enable row level security;
alter table trip_proposals enable row level security;
alter table provider_searches enable row level security;
alter table geocoding_cache enable row level security;
alter table places enable row level security;

-- Las claves API nuevas de Supabase (sb_secret_...) no heredan en automático
-- los privilegios por defecto sobre tablas nuevas del rol service_role, así
-- que hay que concedérselos explícitamente (RLS activado arriba sigue
-- bloqueando anon/authenticated; service_role la salta siempre por diseño).
grant select, insert, update, delete on trip_requests, trip_proposals, provider_searches, geocoding_cache, places to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
