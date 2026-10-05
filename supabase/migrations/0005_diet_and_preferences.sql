-- Diet flags on ingredients (drive the vegetarian / vegan / dairy-free / gluten-free filters)
-- and per-plan preferences (what you have, what you dislike, diets).
--
-- contains values: meat (incl. poultry and fish), dairy, egg, gluten, animal (other animal
-- products, e.g. honey). Unflagged means "nothing to warn about", so user-created ingredients
-- must be flagged when they are added.

alter table ingredients add column contains text[] not null default '{}'
  check (contains <@ array['meat', 'dairy', 'egg', 'gluten', 'animal']);

alter table meal_plans add column preferences jsonb not null default '{}';

-- diet tags start (also appended to seed.sql by scripts/gen-seed.mjs)
update ingredients set contains = array['meat'] where owner_id is null and name in
  ('Canned tuna (in water)', 'Chicken breast', 'Ground beef (90% lean)', 'Ground turkey (93% lean)', 'Salmon fillet', 'Shrimp', 'Chicken broth');
update ingredients set contains = array['dairy'] where owner_id is null and name in
  ('Butter', 'Cheddar cheese', 'Cottage cheese (low-fat)', 'Feta cheese', 'Milk (2%)', 'Parmesan cheese', 'Plain nonfat Greek yogurt', 'Protein powder');
update ingredients set contains = array['egg'] where owner_id is null and name = 'Egg';
update ingredients set contains = array['animal'] where owner_id is null and name = 'Honey';
-- Oats are flagged because they are usually cross-contaminated unless labelled gluten-free.
update ingredients set contains = array['gluten'] where owner_id is null and name in
  ('Whole-wheat bread slice', 'Whole-wheat pasta (dry)', 'Whole-wheat tortilla', 'Soy sauce', 'Rolled oats', 'Granola');
-- diet tags end
