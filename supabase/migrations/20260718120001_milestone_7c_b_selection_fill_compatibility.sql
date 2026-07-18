-- Preserve the verified 7B atomic selection-confirmation state transition.
-- Ordinary authenticated clients have no grants on these state columns; this
-- exact state-only transition is consumed by confirm_selection_request.

begin;

create or replace function private.authorize_selection_fill_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.opportunity_lifecycle = 'active'
    and new.opportunity_lifecycle = 'filled'
    and new.application_intake = 'closed'
    and new.operational_state = 'active'
    and (new.id,new.client_id,new.title,new.description,new.tech_category,new.required_skills,
      new.preferred_skills,new.budget_min,new.budget_max,new.difficulty_level,new.seniority_needed,
      new.deliverables,new.work_mode,new.deadline,new.current_gig_version_id,new.current_material_gig_version_id)
      is not distinct from
      (old.id,old.client_id,old.title,old.description,old.tech_category,old.required_skills,
      old.preferred_skills,old.budget_min,old.budget_max,old.difficulty_level,old.seniority_needed,
      old.deliverables,old.work_mode,old.deadline,old.current_gig_version_id,old.current_material_gig_version_id)
  then
    perform set_config('app.gig_controlled_write','on',true);
  end if;
  return new;
end;
$$;

drop trigger if exists authorize_selection_fill_projection on public.gigs;
create trigger authorize_selection_fill_projection
before update on public.gigs
for each row execute function private.authorize_selection_fill_projection();

commit;
