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

alter table trip_requests enable row level security;
alter table trip_proposals enable row level security;
alter table provider_searches enable row level security;

-- Las claves API nuevas de Supabase (sb_secret_...) no heredan en automático
-- los privilegios por defecto sobre tablas nuevas del rol service_role, así
-- que hay que concedérselos explícitamente (RLS activado arriba sigue
-- bloqueando anon/authenticated; service_role la salta siempre por diseño).
grant select, insert, update, delete on trip_requests, trip_proposals, provider_searches to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
