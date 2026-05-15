alter table public.profiles enable row level security;
alter table public.usuario_especialidad enable row level security;

drop policy if exists "profiles_insert_admin_jefe" on public.profiles;
drop policy if exists "profiles_update_admin_jefe" on public.profiles;
drop policy if exists "profiles_delete_admin_jefe" on public.profiles;

create policy "profiles_insert_admin_jefe"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "profiles_update_admin_jefe"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_delete_admin_jefe"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "usuario_especialidad_insert_admin_jefe" on public.usuario_especialidad;
drop policy if exists "usuario_especialidad_update_admin_jefe" on public.usuario_especialidad;
drop policy if exists "usuario_especialidad_delete_admin_jefe" on public.usuario_especialidad;

create policy "usuario_especialidad_insert_admin_jefe"
on public.usuario_especialidad
for insert
to authenticated
with check (public.is_admin());

create policy "usuario_especialidad_update_admin_jefe"
on public.usuario_especialidad
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "usuario_especialidad_delete_admin_jefe"
on public.usuario_especialidad
for delete
to authenticated
using (public.is_admin());
