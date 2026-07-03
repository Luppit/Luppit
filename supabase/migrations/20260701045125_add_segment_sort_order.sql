alter table public.segment
  add column if not exists sort_order integer;

update public.segment
set sort_order = case svg_name
  when 'todas' then 0
  when 'vehiculos' then 10
  when 'herramientas' then 20
  when 'muebles' then 30
  when 'plantas' then 40
  when 'cosmeticos' then 50
  else 100
end
where sort_order is null
   or svg_name in ('todas', 'vehiculos', 'herramientas', 'muebles', 'plantas', 'cosmeticos');

alter table public.segment
  alter column sort_order set default 100,
  alter column sort_order set not null;
