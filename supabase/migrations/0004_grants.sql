-- Table privileges for the API roles. RLS (0002) decides which rows; these
-- grants decide which operations are possible at all. Newer Supabase projects
-- do not grant these automatically, so every query fails with 42501 without them.

revoke all on profiles, ingredients, recipes, recipe_ingredients,
  inventory_items, meal_plans, meal_plan_items from anon, authenticated;

-- signed-out visitors: read the public (owner_id is null) catalogue only
grant select on ingredients, recipes, recipe_ingredients to anon;

grant select, update on profiles to authenticated;
grant select, insert, update, delete on
  ingredients, recipes, recipe_ingredients,
  inventory_items, meal_plans, meal_plan_items
  to authenticated;
