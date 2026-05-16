begin;

update public.especialidades
set
  nombre = 'Terapias Lentas',
  descripcion = case
    when descripcion is null or btrim(descripcion) = '' or lower(descripcion) in ('hemodiálisis', 'hemodialisis')
      then 'Terapias Lentas'
    else descripcion
  end
where lower(nombre) in ('hemodiálisis', 'hemodialisis');

update public.especialidades
set descripcion = 'Oxigenación por Membrana Extracorpórea'
where lower(nombre) = 'ecmo';

insert into public.especialidades (nombre, descripcion, activa)
select 'UCI', 'Unidad de Cuidados Intensivos', true
where not exists (
  select 1
  from public.especialidades
  where lower(nombre) = 'uci'
);

insert into public.especialidades (nombre, descripcion, activa)
select 'CEC', 'CEC', true
where not exists (
  select 1
  from public.especialidades
  where lower(nombre) = 'cec'
);

commit;
