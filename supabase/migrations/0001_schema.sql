-- Enums
create type base_unit as enum ('g', 'ml', 'each');
create type store_section as enum ('produce', 'meat', 'dairy', 'pantry', 'frozen', 'other');
create type meal_category as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- Profiles (one per auth user; is_admin is set manually in SQL only)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  target_calories numeric,
  target_protein numeric,
  target_carbs numeric,
  target_fat numeric,
  target_fiber numeric,
  target_sugar numeric,
  split_breakfast numeric not null default 0.25,
  split_lunch numeric not null default 0.30,
  split_dinner numeric not null default 0.35,
  split_snack numeric not null default 0.10,
  created_at timestamptz not null default now(),
  constraint split_sums_to_one check (
    abs(split_breakfast + split_lunch + split_dinner + split_snack - 1) < 0.001
  )
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Ingredients. owner_id null = recommended/public. Nutrition is per 1 base unit.
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  name text not null,
  base_unit base_unit not null,
  store_section store_section not null default 'other',
  density_g_per_ml numeric check (density_g_per_ml > 0),
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  sugar numeric not null default 0,
  created_at timestamptz not null default now()
);
create unique index ingredients_owner_name on ingredients (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'), lower(name));

-- Recipes. owner_id null = recommended/public.
create table recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  copied_from uuid references recipes on delete set null,
  name text not null,
  category meal_category not null,
  servings int not null check (servings > 0),
  prep_minutes int not null default 0,
  photo_path text,
  instructions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_owner on recipes (owner_id);

-- amount = whole-recipe amount in the ingredient's base unit
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes on delete cascade,
  ingredient_id uuid not null references ingredients,
  amount numeric not null check (amount > 0),
  display_unit text,
  position int not null default 0
);
create index recipe_ingredients_recipe on recipe_ingredients (recipe_id);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  ingredient_id uuid not null references ingredients,
  amount numeric not null check (amount >= 0),
  unique (user_id, ingredient_id)
);

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  name text not null default 'Meal plan',
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  counts jsonb not null default '{"breakfast":0,"lunch":0,"dinner":0,"snack":0}',
  inventory_deducted boolean not null default false,
  inventory_snapshot jsonb,   -- inventory at confirm time, so the grocery list stays stable
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- amount_overrides: {ingredient_id: per-serving amount} when adjusted in-plan.
-- snapshot: recipe frozen at confirm time so old plans reopen unchanged.
create table meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans on delete cascade,
  recipe_id uuid references recipes on delete set null,
  category meal_category not null,
  meals int not null check (meals > 0),
  amount_overrides jsonb,
  snapshot jsonb
);
create index meal_plan_items_plan on meal_plan_items (plan_id);
