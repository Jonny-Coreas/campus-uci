select
  conname,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and conname = 'profiles_rol_check';

alter table public.profiles
drop constraint if exists profiles_rol_check;

alter table public.profiles
add constraint profiles_rol_check
check (
  rol in ('admin', 'jefe', 'docente', 'recurso')
);
