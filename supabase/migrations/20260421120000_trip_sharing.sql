create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text,
  data jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.trip_share_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('view', 'edit')),
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists trips_updated_at_idx
  on public.trips(updated_at);

create index if not exists trip_share_links_trip_id_idx
  on public.trip_share_links(trip_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;

create trigger trips_set_updated_at
before update on public.trips
for each row
execute function public.set_updated_at();

alter table public.trips enable row level security;
alter table public.trip_share_links enable row level security;

drop policy if exists "deny anon trips select" on public.trips;
create policy "deny anon trips select"
on public.trips
for select
to anon
using (false);

drop policy if exists "deny anon trips insert" on public.trips;
create policy "deny anon trips insert"
on public.trips
for insert
to anon
with check (false);

drop policy if exists "deny anon trips update" on public.trips;
create policy "deny anon trips update"
on public.trips
for update
to anon
using (false);

drop policy if exists "deny anon links select" on public.trip_share_links;
create policy "deny anon links select"
on public.trip_share_links
for select
to anon
using (false);

drop policy if exists "deny anon links insert" on public.trip_share_links;
create policy "deny anon links insert"
on public.trip_share_links
for insert
to anon
with check (false);

drop policy if exists "deny anon links update" on public.trip_share_links;
create policy "deny anon links update"
on public.trip_share_links
for update
to anon
using (false);