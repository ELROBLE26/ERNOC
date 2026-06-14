create extension if not exists pgcrypto;

create table if not exists public.reporte_oper_flota (
  id uuid primary key default gen_random_uuid(),
  numero integer,
  cod text not null,
  ppu text not null,
  terminal text not null default 'El Roble',
  zona text,
  servicio text,
  modelo text,
  asignacion text,
  tipo text,
  oper text default 'PENDIENTE',
  vidrio text default 'PENDIENTE',
  mant text default 'PENDIENTE',
  calidad text default 'PENDIENTE',
  adq text default 'PENDIENTE',
  aft text default 'PENDIENTE',
  sinies text default 'NO',
  detalle_panne text,
  observaciones text,
  ubicacion text,
  estado text default 'PENDIENTE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reporte_oper_flota disable row level security;

alter table public.reporte_oper_flota
  add column if not exists modelo text,
  add column if not exists asignacion text,
  add column if not exists tipo text;

create unique index if not exists reporte_oper_flota_cod_unique
  on public.reporte_oper_flota (lower(cod));

create unique index if not exists reporte_oper_flota_ppu_unique
  on public.reporte_oper_flota (lower(ppu));

create or replace function public.set_reporte_oper_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reporte_oper_updated_at on public.reporte_oper_flota;

create trigger trg_reporte_oper_updated_at
before update on public.reporte_oper_flota
for each row
execute function public.set_reporte_oper_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reporte_oper_flota'
  ) then
    alter publication supabase_realtime add table public.reporte_oper_flota;
  end if;
end;
$$;

create table if not exists public.bus_nfc_cards (
  id uuid primary key default gen_random_uuid(),
  nfc_uid text not null unique,
  cod text not null,
  ppu text not null,
  terminal_default text,
  activo boolean default true,
  observacion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bus_nfc_cards disable row level security;

create index if not exists bus_nfc_cards_cod_idx
  on public.bus_nfc_cards (cod);

create index if not exists bus_nfc_cards_ppu_idx
  on public.bus_nfc_cards (ppu);

drop trigger if exists trg_bus_nfc_cards_updated_at on public.bus_nfc_cards;

create trigger trg_bus_nfc_cards_updated_at
before update on public.bus_nfc_cards
for each row
execute function public.set_reporte_oper_updated_at();

create table if not exists public.reporte_oper_nfc_log (
  id uuid primary key default gen_random_uuid(),
  nfc_uid text not null,
  cod text,
  ppu text,
  terminal text,
  estado_guardado text,
  oper text,
  vidrio text,
  mant text,
  calidad text,
  adq text,
  aft text,
  sinies text,
  detalle_panne text,
  observaciones text,
  ubicacion text,
  resultado text,
  mensaje_error text,
  created_at timestamptz default now()
);

alter table public.reporte_oper_nfc_log disable row level security;

create index if not exists reporte_oper_nfc_log_nfc_uid_idx
  on public.reporte_oper_nfc_log (nfc_uid);

create index if not exists reporte_oper_nfc_log_created_at_idx
  on public.reporte_oper_nfc_log (created_at desc);

create table if not exists public.revision_documentos (
  id uuid primary key default gen_random_uuid(),
  ppu text not null unique,
  cod text not null,
  terminal text,
  permiso_circulacion boolean default false,
  soap boolean default false,
  revision_tecnica boolean default false,
  revision_gases boolean default false,
  certificado_recorrido boolean default false,
  certificado_inscripcion boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.revision_documentos disable row level security;

create index if not exists revision_documentos_ppu_idx on public.revision_documentos (ppu);
create index if not exists revision_documentos_cod_idx on public.revision_documentos (cod);

drop trigger if exists trg_revision_documentos_updated_at on public.revision_documentos;

create trigger trg_revision_documentos_updated_at
before update on public.revision_documentos
for each row
execute function public.set_reporte_oper_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'revision_documentos'
  ) then
    alter publication supabase_realtime add table public.revision_documentos;
  end if;
end;
$$;
