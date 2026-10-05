create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

alter table profiles enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table inventory_items enable row level security;
alter table meal_plans enable row level security;
alter table meal_plan_items enable row level security;

-- profiles: own row only; is_admin cannot be changed from the client
create policy profiles_select on profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create function protect_is_admin() returns trigger
language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user in ('authenticated', 'anon') then
    raise exception 'is_admin can only be changed in the database';
  end if;
  return new;
end $$;
create trigger profiles_protect_admin before update on profiles
  for each row execute function protect_is_admin();

-- ingredients
create policy ingredients_select_public on ingredients for select to anon using (owner_id is null);
create policy ingredients_select on ingredients for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy ingredients_write on ingredients for all to authenticated
  using (owner_id = auth.uid() or (owner_id is null and is_admin()))
  with check (owner_id = auth.uid() or (owner_id is null and is_admin()));

-- recipes
create policy recipes_select_public on recipes for select to anon using (owner_id is null);
create policy recipes_select on recipes for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy recipes_write on recipes for all to authenticated
  using (owner_id = auth.uid() or (owner_id is null and is_admin()))
  with check (owner_id = auth.uid() or (owner_id is null and is_admin()));

-- recipe_ingredients: follow the parent recipe
create policy ri_select_public on recipe_ingredients for select to anon
  using (exists (select 1 from recipes r where r.id = recipe_id and r.owner_id is null));
create policy ri_select on recipe_ingredients for select to authenticated
  using (exists (select 1 from recipes r where r.id = recipe_id
                 and (r.owner_id is null or r.owner_id = auth.uid())));
create policy ri_write on recipe_ingredients for all to authenticated
  using (exists (select 1 from recipes r where r.id = recipe_id
                 and (r.owner_id = auth.uid() or (r.owner_id is null and is_admin()))))
  with check (
    exists (select 1 from recipes r where r.id = recipe_id
            and (r.owner_id = auth.uid() or (r.owner_id is null and is_admin())))
    and exists (select 1 from ingredients i where i.id = ingredient_id
                and (i.owner_id is null or i.owner_id = auth.uid()))
  );

-- inventory
create policy inventory_all on inventory_items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from ingredients i where i.id = ingredient_id
    and (i.owner_id is null or i.owner_id = auth.uid())));

-- plans
create policy plans_all on meal_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plan_items_all on meal_plan_items for all to authenticated
  using (exists (select 1 from meal_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from meal_plans p where p.id = plan_id and p.user_id = auth.uid()));
