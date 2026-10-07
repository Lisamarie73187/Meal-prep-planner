-- Fish and shellfish get their own tag so a pescatarian diet can allow them while still excluding meat and poultry.
-- (Vegetarian and vegan exclude both, so they behave exactly as before.) Until now fish was tagged 'meat'.
--
-- Existing user-created ingredients are left alone: anything a person tagged 'meat' stays excluded for
-- pescatarians until they re-tag it as fish.

alter table ingredients drop constraint ingredients_contains_check;
alter table ingredients add constraint ingredients_contains_check
  check (contains <@ array['meat', 'fish', 'dairy', 'egg', 'gluten', 'animal']);

-- diet tags start (also appended to seed.sql by scripts/gen-seed.mjs, after the tags from 0005)
update ingredients set contains = array['fish'] where owner_id is null and name in
  ('Salmon fillet', 'Shrimp', 'Canned tuna (in water)');
-- diet tags end
