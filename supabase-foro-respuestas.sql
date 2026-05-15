create table if not exists public.especialidad_foro_respuestas (
  id uuid primary key default gen_random_uuid(),
  foro_id uuid not null references public.especialidad_foros(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  mensaje text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists especialidad_foro_respuestas_foro_id_idx
  on public.especialidad_foro_respuestas (foro_id);

create index if not exists especialidad_foro_respuestas_profile_id_idx
  on public.especialidad_foro_respuestas (profile_id);

create index if not exists especialidad_foro_respuestas_created_at_idx
  on public.especialidad_foro_respuestas (created_at);
