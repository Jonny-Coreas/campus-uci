create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.especialidad_asistencia (
  id uuid primary key default gen_random_uuid(),

  clase_id uuid not null
    references public.especialidad_clases_virtuales(id)
    on delete cascade,

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  estado text not null default 'ausente'
    check (estado in ('asistio', 'ausente', 'tardia', 'justificada')),

  comentario text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint especialidad_asistencia_clase_profile_unique
    unique (clase_id, profile_id)
);

create index if not exists especialidad_asistencia_clase_idx
on public.especialidad_asistencia(clase_id);

create index if not exists especialidad_asistencia_profile_idx
on public.especialidad_asistencia(profile_id);

create index if not exists especialidad_asistencia_estado_idx
on public.especialidad_asistencia(estado);

drop trigger if exists set_updated_at_especialidad_asistencia
on public.especialidad_asistencia;

create trigger set_updated_at_especialidad_asistencia
before update on public.especialidad_asistencia
for each row
execute function public.set_updated_at();

alter table public.especialidad_asistencia enable row level security;

drop policy if exists "authenticated_select_asistencia"
on public.especialidad_asistencia;

create policy "authenticated_select_asistencia"
on public.especialidad_asistencia
for select
to authenticated
using (true);

drop policy if exists "authenticated_insert_asistencia"
on public.especialidad_asistencia;

create policy "authenticated_insert_asistencia"
on public.especialidad_asistencia
for insert
to authenticated
with check (true);

drop policy if exists "authenticated_update_asistencia"
on public.especialidad_asistencia;

create policy "authenticated_update_asistencia"
on public.especialidad_asistencia
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_delete_asistencia"
on public.especialidad_asistencia;

create policy "authenticated_delete_asistencia"
on public.especialidad_asistencia
for delete
to authenticated
using (true);
