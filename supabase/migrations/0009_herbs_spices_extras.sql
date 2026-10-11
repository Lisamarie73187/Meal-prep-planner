-- Everyday herbs, spices, oils and baking items for the shared ingredient list, so recipes that use them
-- (especially recipes read by the AI from pasted text) match instead of coming up "not in your ingredient list".
-- Nutrition is per gram (or per ml for the oils and lime juice), from standard reference values (USDA averages).
-- Safe to run more than once: a name that already exists is skipped.
--
-- Also gives a few produce and frozen items a density so the unit picker offers teaspoons, tablespoons and cups
-- (only where it was missing). Amounts already saved in recipes are not changed.

insert into ingredients (owner_id, name, base_unit, store_section, density_g_per_ml, calories, protein, carbs, fat, fiber, sugar, contains)
select null, v.name, v.base_unit, v.store_section, v.density, v.calories, v.protein, v.carbs, v.fat, v.fiber, v.sugar, v.contains
from (values
  ('Cilantro', 'g', 'produce', 0.07, 0.23, 0.021, 0.037, 0.005, 0.028, 0.009, '{}'::text[]),
  ('Parsley', 'g', 'produce', 0.25, 0.36, 0.03, 0.063, 0.008, 0.033, 0.009, '{}'::text[]),
  ('Basil', 'g', 'produce', 0.1, 0.23, 0.032, 0.027, 0.006, 0.016, 0.003, '{}'::text[]),
  ('Green onion', 'g', 'produce', 0.42, 0.32, 0.018, 0.073, 0.002, 0.026, 0.023, '{}'::text[]),
  ('Jalapeño', 'g', 'produce', 0.38, 0.29, 0.009, 0.065, 0.004, 0.028, 0.041, '{}'::text[]),
  ('Cinnamon', 'g', 'pantry', 0.53, 2.47, 0.04, 0.806, 0.012, 0.531, 0.022, '{}'::text[]),
  ('Turmeric', 'g', 'pantry', 0.61, 3.12, 0.097, 0.671, 0.033, 0.227, 0.032, '{}'::text[]),
  ('Cayenne pepper', 'g', 'pantry', 0.37, 3.18, 0.12, 0.566, 0.173, 0.272, 0.103, '{}'::text[]),
  ('Red pepper flakes', 'g', 'pantry', 0.3, 3.18, 0.12, 0.566, 0.173, 0.272, 0.103, '{}'::text[]),
  ('Black pepper', 'g', 'pantry', 0.47, 2.51, 0.104, 0.64, 0.033, 0.253, 0.006, '{}'::text[]),
  ('Garlic powder', 'g', 'pantry', 0.57, 3.31, 0.166, 0.727, 0.007, 0.09, 0.024, '{}'::text[]),
  ('Onion powder', 'g', 'pantry', 0.49, 3.41, 0.104, 0.791, 0.01, 0.152, 0.066, '{}'::text[]),
  ('Oregano (dried)', 'g', 'pantry', 0.3, 2.65, 0.09, 0.689, 0.043, 0.425, 0.041, '{}'::text[]),
  ('Thyme (dried)', 'g', 'pantry', 0.25, 2.76, 0.091, 0.639, 0.074, 0.37, 0.017, '{}'::text[]),
  ('Rosemary (dried)', 'g', 'pantry', 0.25, 3.31, 0.049, 0.641, 0.152, 0.426, 0, '{}'::text[]),
  ('Basil (dried)', 'g', 'pantry', 0.14, 2.33, 0.23, 0.478, 0.041, 0.377, 0.017, '{}'::text[]),
  ('Ground ginger', 'g', 'pantry', 0.37, 3.35, 0.09, 0.716, 0.042, 0.141, 0.034, '{}'::text[]),
  ('Ground coriander', 'g', 'pantry', 0.37, 2.98, 0.124, 0.55, 0.178, 0.419, 0, '{}'::text[]),
  ('Nutmeg', 'g', 'pantry', 0.45, 5.25, 0.058, 0.493, 0.363, 0.208, 0.285, '{}'::text[]),
  ('Raisins', 'g', 'pantry', 0.61, 2.99, 0.031, 0.792, 0.005, 0.037, 0.592, '{}'::text[]),
  ('Dried cranberries', 'g', 'pantry', 0.51, 3.08, 0.001, 0.824, 0.014, 0.053, 0.726, '{}'::text[]),
  ('Pecans', 'g', 'pantry', 0.42, 6.91, 0.092, 0.139, 0.72, 0.096, 0.04, '{}'::text[]),
  ('Sunflower seeds', 'g', 'pantry', 0.59, 5.84, 0.208, 0.2, 0.515, 0.086, 0.026, '{}'::text[]),
  ('Ground flaxseed', 'g', 'pantry', 0.47, 5.34, 0.183, 0.289, 0.422, 0.273, 0.016, '{}'::text[]),
  ('Sesame seeds', 'g', 'pantry', 0.61, 5.73, 0.177, 0.234, 0.497, 0.118, 0.003, '{}'::text[]),
  ('Shredded coconut (unsweetened)', 'g', 'pantry', 0.33, 6.6, 0.069, 0.237, 0.645, 0.163, 0.074, '{}'::text[]),
  ('All-purpose flour', 'g', 'pantry', 0.53, 3.64, 0.103, 0.763, 0.01, 0.027, 0.003, array['gluten']::text[]),
  ('Sugar', 'g', 'pantry', 0.85, 3.87, 0, 1, 0, 0, 1, '{}'::text[]),
  ('Brown sugar', 'g', 'pantry', 0.93, 3.8, 0.001, 0.981, 0, 0, 0.97, '{}'::text[]),
  ('Cornstarch', 'g', 'pantry', 0.54, 3.81, 0.003, 0.913, 0.001, 0.009, 0, '{}'::text[]),
  ('Baking powder', 'g', 'pantry', 0.93, 0.53, 0, 0.277, 0, 0.002, 0, '{}'::text[]),
  ('Vanilla extract', 'g', 'pantry', 0.88, 2.88, 0.001, 0.127, 0.001, 0, 0.127, '{}'::text[]),
  ('Apple cider vinegar', 'g', 'pantry', 1.01, 0.21, 0, 0.009, 0, 0, 0.004, '{}'::text[]),
  ('Balsamic vinegar', 'g', 'pantry', 1.05, 0.88, 0.005, 0.17, 0, 0, 0.15, '{}'::text[]),
  ('Dijon mustard', 'g', 'pantry', 1.05, 0.66, 0.044, 0.058, 0.033, 0.033, 0.022, '{}'::text[]),
  ('Tomato paste', 'g', 'pantry', 1.1, 0.82, 0.043, 0.189, 0.005, 0.041, 0.122, '{}'::text[]),
  ('Vegetable oil', 'ml', 'pantry', null, 8.13, 0, 0, 0.92, 0, 0, '{}'::text[]),
  ('Coconut oil', 'ml', 'pantry', null, 7.93, 0, 0, 0.92, 0, 0, '{}'::text[]),
  ('Sesame oil', 'ml', 'pantry', null, 8.13, 0, 0, 0.92, 0, 0, '{}'::text[]),
  ('Lime juice', 'ml', 'produce', null, 0.25, 0.004, 0.084, 0.001, 0.003, 0.017, '{}'::text[])
) as v(name, base_unit, store_section, density, calories, protein, carbs, fat, fiber, sugar, contains)
where not exists (select 1 from ingredients i where i.owner_id is null and lower(i.name) = lower(v.name));

update ingredients set density_g_per_ml = 0.4 where owner_id is null and name = 'Fresh ginger' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.3 where owner_id is null and name = 'Mushrooms' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.63 where owner_id is null and name = 'Avocado' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.35 where owner_id is null and name = 'Eggplant' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.45 where owner_id is null and name = 'Frozen cauliflower rice' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.62 where owner_id is null and name = 'Frozen corn' and density_g_per_ml is null;
update ingredients set density_g_per_ml = 0.4 where owner_id is null and name = 'Frozen stir-fry vegetables' and density_g_per_ml is null;
