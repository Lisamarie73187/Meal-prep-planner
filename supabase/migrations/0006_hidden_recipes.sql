-- "Not for me": recipes a person never wants suggested again. Recipes stay shared; this is just a
-- per-person list of recipe ids, so nothing is copied into anyone's account.

create table hidden_recipes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table hidden_recipes enable row level security;
create policy hidden_recipes_own on hidden_recipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS picks the rows; these grants allow the operations at all (see 0004).
grant select, insert, delete on hidden_recipes to authenticated;
