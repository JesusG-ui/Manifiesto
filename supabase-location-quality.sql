-- Ejecutar una sola vez en Supabase > SQL Editor.
alter table packages add column if not exists location_status text;
alter table packages add column if not exists location_confidence integer;
alter table packages add column if not exists location_provider text;
alter table packages add column if not exists location_label text;

update packages
set location_status = case
  when lat is not null and lon is not null then 'confirmed'
  else 'unprocessed'
end
where location_status is null;

alter table packages alter column location_status set default 'unprocessed';

alter table packages drop constraint if exists packages_location_status_check;
alter table packages add constraint packages_location_status_check
check (location_status in ('unprocessed', 'confirmed', 'approximate', 'not_found'));
