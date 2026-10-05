-- Records the second recipe batch (17 ingredients, 23 recipes) in migration history. It was first
-- applied with supabase/seed-more.sql; this is the same SQL, so on a database that already has it
-- this changes nothing.
--
-- Guarded: the recipes reuse ingredients created by supabase/seed.sql, which runs AFTER migrations on
-- a fresh database. If those aren't there yet this does nothing (otherwise recipes would be created
-- with missing ingredients); run supabase/seed.sql and then supabase/seed-more.sql for a fresh setup.
-- Every statement skips what already exists, so it is safe to re-run.
-- Frozen: do not regenerate or edit. Later recipe changes belong in a new migration.

do $migration$
begin
  if exists (select 1 from ingredients where name = 'Spinach' and owner_id is null) then
    insert into ingredients (owner_id, name, base_unit, store_section, density_g_per_ml, calories, protein, carbs, fat, fiber, sugar)
    select null::uuid, v.name, v.unit::base_unit, v.section::store_section, v.density::numeric, v.calories::numeric, v.protein::numeric, v.carbs::numeric, v.fat::numeric, v.fiber::numeric, v.sugar::numeric
    from (values
      ('Firm tofu', 'g', 'other', null, 1.44, 0.173, 0.028, 0.087, 0.023, 0.006),
      ('Tempeh', 'g', 'other', null, 1.92, 0.203, 0.076, 0.108, 0, 0),
      ('Canned coconut milk', 'ml', 'pantry', null, 1.9, 0.018, 0.027, 0.2, 0, 0.022),
      ('Maple syrup', 'g', 'pantry', 1.33, 2.6, 0, 0.67, 0.001, 0, 0.6),
      ('Rice noodles (dry)', 'g', 'pantry', null, 3.64, 0.034, 0.8, 0.006, 0.016, 0),
      ('Curry powder', 'g', 'pantry', 0.45, 3.25, 0.143, 0.558, 0.14, 0.532, 0.028),
      ('Tamari (gluten-free soy sauce)', 'ml', 'pantry', null, 0.68, 0.12, 0.064, 0, 0.008, 0.005),
      ('Gluten-free rolled oats', 'g', 'pantry', 0.34, 3.79, 0.132, 0.677, 0.065, 0.101, 0.01),
      ('Corn tortilla', 'each', 'pantry', null, 57, 1.5, 11.6, 0.8, 1.6, 0.2),
      ('Vegetable broth', 'ml', 'pantry', null, 0.06, 0.003, 0.012, 0.001, 0, 0.006),
      ('Kidney beans (canned, drained)', 'g', 'pantry', 0.73, 1.05, 0.069, 0.19, 0.005, 0.055, 0.015),
      ('Cashews', 'g', 'pantry', 0.55, 5.53, 0.182, 0.302, 0.439, 0.033, 0.059),
      ('Cocoa powder', 'g', 'pantry', 0.4, 2.28, 0.196, 0.579, 0.137, 0.332, 0.018),
      ('Fresh ginger', 'g', 'produce', null, 0.8, 0.018, 0.178, 0.008, 0.02, 0.017),
      ('Mushrooms', 'g', 'produce', null, 0.22, 0.031, 0.033, 0.003, 0.01, 0.02),
      ('Eggplant', 'g', 'produce', null, 0.25, 0.01, 0.059, 0.002, 0.03, 0.035),
      ('Frozen corn', 'g', 'frozen', null, 0.86, 0.033, 0.19, 0.014, 0.02, 0.06)
    ) as v(name, unit, section, density, calories, protein, carbs, fat, fiber, sugar)
    where not exists (select 1 from ingredients i where i.name = v.name and i.owner_id is null);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Tofu Veggie Scramble', 'breakfast'::meal_category, 4, 30, array['Dice the sweet potato small and roast at 200°C / 400°F for 25 minutes.', 'Sauté onion, pepper and mushrooms in olive oil 6 minutes.', 'Crumble in the tofu with cumin, paprika and salt; cook 8 minutes until golden.', 'Fold in spinach until wilted. Divide with the roasted sweet potato.']
    where not exists (select 1 from recipes where name = 'Tofu Veggie Scramble' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Firm tofu', 600, 0),
      ('Spinach', 120, 1),
      ('Bell pepper', 200, 2),
      ('Onion', 100, 3),
      ('Mushrooms', 200, 4),
      ('Sweet potato', 400, 5),
      ('Olive oil', 30, 6),
      ('Cumin', 4, 7),
      ('Paprika', 4, 8),
      ('Salt', 3, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Tofu Veggie Scramble' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Chocolate Chia Pudding', 'breakfast'::meal_category, 4, 10, array['Whisk almond milk, cocoa and maple syrup until smooth, then whisk in the chia seeds.', 'Divide between 4 jars and refrigerate at least 4 hours or overnight; stir once after 30 minutes.', 'Top with sliced banana, strawberries and a spoonful of almond butter when serving.']
    where not exists (select 1 from recipes where name = 'Chocolate Chia Pudding' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Chia seeds', 120, 0),
      ('Unsweetened almond milk', 800, 1),
      ('Cocoa powder', 20, 2),
      ('Maple syrup', 60, 3),
      ('Almond butter', 60, 4),
      ('Banana', 2, 5),
      ('Strawberries', 200, 6)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Chocolate Chia Pudding' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Peanut Butter Banana Oat Bake', 'breakfast'::meal_category, 6, 40, array['Heat oven to 180°C / 350°F and grease a baking dish.', 'Mash the bananas and stir in almond milk, peanut butter, maple syrup and chia seeds.', 'Mix in the oats, pour into the dish and bake 30 minutes until set.', 'Cut into 6 portions. Keeps 5 days; reheat 60 seconds in the microwave.']
    where not exists (select 1 from recipes where name = 'Peanut Butter Banana Oat Bake' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Gluten-free rolled oats', 300, 0),
      ('Banana', 3, 1),
      ('Unsweetened almond milk', 600, 2),
      ('Peanut butter', 120, 3),
      ('Maple syrup', 60, 4),
      ('Chia seeds', 30, 5)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Peanut Butter Banana Oat Bake' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Sweet Potato & Black Bean Breakfast Hash', 'breakfast'::meal_category, 4, 35, array['Dice sweet potato small and sauté in olive oil 12 minutes until tender.', 'Add onion, pepper, cumin and chili powder; cook 5 minutes.', 'Stir in black beans until hot.', 'Divide into containers; add salsa and sliced avocado just before eating.']
    where not exists (select 1 from recipes where name = 'Sweet Potato & Black Bean Breakfast Hash' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Sweet potato', 800, 0),
      ('Black beans (canned, drained)', 480, 1),
      ('Bell pepper', 200, 2),
      ('Onion', 100, 3),
      ('Avocado', 200, 4),
      ('Olive oil', 30, 5),
      ('Cumin', 6, 6),
      ('Chili powder', 4, 7),
      ('Salsa', 120, 8)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Sweet Potato & Black Bean Breakfast Hash' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Sweet Potato Spinach Egg Bake', 'breakfast'::meal_category, 6, 45, array['Heat oven to 190°C / 375°F. Thinly slice the sweet potato and roast 15 minutes.', 'Sauté onion, pepper and mushrooms in olive oil; add spinach until wilted.', 'Layer sweet potato and vegetables in a baking dish. Pour over the whisked eggs and salt.', 'Bake 25 minutes until set. Cut into 6 portions.']
    where not exists (select 1 from recipes where name = 'Sweet Potato Spinach Egg Bake' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Egg', 12, 0),
      ('Sweet potato', 500, 1),
      ('Spinach', 200, 2),
      ('Mushrooms', 300, 3),
      ('Onion', 100, 4),
      ('Bell pepper', 150, 5),
      ('Olive oil', 30, 6),
      ('Salt', 3, 7)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Sweet Potato Spinach Egg Bake' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Chickpea Curry Rice Bowls', 'lunch'::meal_category, 4, 35, array['Cook rice (amount is dry weight).', 'Sauté onion, ginger and garlic in olive oil 5 minutes; stir in curry powder 1 minute.', 'Add tomatoes, coconut milk and chickpeas; simmer 15 minutes.', 'Stir in spinach until wilted and serve over rice.']
    where not exists (select 1 from recipes where name = 'Chickpea Curry Rice Bowls' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Chickpeas (canned, drained)', 480, 0),
      ('Brown rice (dry)', 200, 1),
      ('Canned coconut milk', 400, 2),
      ('Canned diced tomatoes', 400, 3),
      ('Onion', 150, 4),
      ('Curry powder', 12, 5),
      ('Fresh ginger', 15, 6),
      ('Garlic clove', 4, 7),
      ('Spinach', 120, 8),
      ('Olive oil', 15, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Chickpea Curry Rice Bowls' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Peanut Noodle Bowls with Tofu', 'lunch'::meal_category, 4, 30, array['Cube the tofu and bake at 200°C / 400°F for 25 minutes until firm.', 'Cook the rice noodles per the package and rinse in cold water.', 'Whisk peanut butter, tamari, lemon juice, maple syrup, garlic and ginger with a few spoons of warm water.', 'Toss noodles with sauce; top with tofu, shredded carrot and sliced cucumber.']
    where not exists (select 1 from recipes where name = 'Peanut Noodle Bowls with Tofu' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Rice noodles (dry)', 200, 0),
      ('Firm tofu', 500, 1),
      ('Peanut butter', 100, 2),
      ('Tamari (gluten-free soy sauce)', 60, 3),
      ('Carrot', 200, 4),
      ('Cucumber', 200, 5),
      ('Lemon juice', 30, 6),
      ('Maple syrup', 20, 7),
      ('Garlic clove', 2, 8),
      ('Fresh ginger', 10, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Peanut Noodle Bowls with Tofu' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Black Bean Quinoa Salad', 'lunch'::meal_category, 4, 25, array['Cook quinoa (amount is dry weight) and cool. Thaw the corn.', 'Whisk olive oil, lemon juice and cumin for the dressing.', 'Dice pepper, tomato and onion; toss everything except the avocado with the dressing.', 'Divide into containers and add diced avocado just before eating.']
    where not exists (select 1 from recipes where name = 'Black Bean Quinoa Salad' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Quinoa (dry)', 160, 0),
      ('Black beans (canned, drained)', 480, 1),
      ('Frozen corn', 200, 2),
      ('Bell pepper', 200, 3),
      ('Tomato', 200, 4),
      ('Avocado', 200, 5),
      ('Lemon juice', 60, 6),
      ('Olive oil', 45, 7),
      ('Cumin', 4, 8),
      ('Onion', 60, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Black Bean Quinoa Salad' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Sweet Potato Black Bean Tacos', 'lunch'::meal_category, 4, 40, array['Dice sweet potato, toss with olive oil, cumin and chili powder, and roast at 200°C / 400°F for 25 minutes.', 'Warm the black beans with a splash of water.', 'Keep tortillas, filling, salsa and avocado (tossed in lemon juice) separate; assemble 2 tacos per serving.']
    where not exists (select 1 from recipes where name = 'Sweet Potato Black Bean Tacos' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Corn tortilla', 8, 0),
      ('Sweet potato', 600, 1),
      ('Black beans (canned, drained)', 360, 2),
      ('Avocado', 160, 3),
      ('Salsa', 160, 4),
      ('Onion', 60, 5),
      ('Cumin', 4, 6),
      ('Chili powder', 4, 7),
      ('Olive oil', 15, 8),
      ('Lemon juice', 30, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Sweet Potato Black Bean Tacos' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Tofu Fried Rice Bowls', 'lunch'::meal_category, 4, 30, array['Cook rice (amount is dry weight) and cool; day-old rice works best.', 'Crumble tofu and fry in olive oil 8 minutes until golden.', 'Add vegetables, ginger and garlic; cook 5 minutes.', 'Stir in rice and tamari and fry 3 more minutes.']
    where not exists (select 1 from recipes where name = 'Tofu Fried Rice Bowls' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Brown rice (dry)', 200, 0),
      ('Firm tofu', 500, 1),
      ('Frozen stir-fry vegetables', 400, 2),
      ('Tamari (gluten-free soy sauce)', 60, 3),
      ('Fresh ginger', 10, 4),
      ('Garlic clove', 3, 5),
      ('Olive oil', 30, 6)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Tofu Fried Rice Bowls' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Greek Lentil Salad Jars', 'lunch'::meal_category, 4, 30, array['Cook lentils (amount is dry weight) until just tender; drain and cool.', 'Whisk olive oil and lemon juice for the dressing.', 'Layer dressing, lentils, diced cucumber, tomato and onion, spinach and crumbled feta in jars.']
    where not exists (select 1 from recipes where name = 'Greek Lentil Salad Jars' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Lentils (dry)', 200, 0),
      ('Cucumber', 300, 1),
      ('Tomato', 300, 2),
      ('Feta cheese', 100, 3),
      ('Onion', 60, 4),
      ('Spinach', 100, 5),
      ('Olive oil', 45, 6),
      ('Lemon juice', 45, 7)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Greek Lentil Salad Jars' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Three-Bean Veggie Chili', 'dinner'::meal_category, 6, 50, array['Sauté onion, pepper and carrot in olive oil 8 minutes.', 'Add spices and cook 1 minute, then add tomatoes and beans with 300 ml water.', 'Simmer 30 minutes, adding salt to taste.', 'Cook rice (amount is dry weight) and portion the chili over it.']
    where not exists (select 1 from recipes where name = 'Three-Bean Veggie Chili' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Kidney beans (canned, drained)', 480, 0),
      ('Black beans (canned, drained)', 480, 1),
      ('Canned diced tomatoes', 800, 2),
      ('Onion', 200, 3),
      ('Bell pepper', 300, 4),
      ('Carrot', 200, 5),
      ('Chili powder', 15, 6),
      ('Cumin', 8, 7),
      ('Paprika', 6, 8),
      ('Brown rice (dry)', 240, 9),
      ('Olive oil', 30, 10),
      ('Salt', 4, 11)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Three-Bean Veggie Chili' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Coconut Lentil Curry with Rice', 'dinner'::meal_category, 6, 45, array['Sauté onion, carrot, ginger and garlic in olive oil 6 minutes; stir in curry powder.', 'Add lentils (dry weight), tomatoes, coconut milk and broth; simmer 25 minutes until the lentils are soft.', 'Stir in spinach. Cook rice separately (dry weight) and portion the curry over it.']
    where not exists (select 1 from recipes where name = 'Coconut Lentil Curry with Rice' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Lentils (dry)', 300, 0),
      ('Canned coconut milk', 400, 1),
      ('Canned diced tomatoes', 400, 2),
      ('Onion', 200, 3),
      ('Carrot', 200, 4),
      ('Spinach', 200, 5),
      ('Curry powder', 18, 6),
      ('Fresh ginger', 20, 7),
      ('Garlic clove', 4, 8),
      ('Brown rice (dry)', 240, 9),
      ('Vegetable broth', 600, 10),
      ('Olive oil', 15, 11)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Coconut Lentil Curry with Rice' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Teriyaki Tofu Broccoli Bowls', 'dinner'::meal_category, 4, 40, array['Cook rice (amount is dry weight).', 'Cube tofu and pan-fry in olive oil 10 minutes until golden.', 'Add broccoli and sliced carrot with a splash of water; cover 4 minutes.', 'Whisk tamari, maple syrup, ginger and garlic; toss through for 2 minutes. Serve over rice.']
    where not exists (select 1 from recipes where name = 'Teriyaki Tofu Broccoli Bowls' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Firm tofu', 600, 0),
      ('Broccoli', 500, 1),
      ('Brown rice (dry)', 240, 2),
      ('Tamari (gluten-free soy sauce)', 80, 3),
      ('Maple syrup', 40, 4),
      ('Fresh ginger', 15, 5),
      ('Garlic clove', 4, 6),
      ('Olive oil', 30, 7),
      ('Carrot', 150, 8)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Teriyaki Tofu Broccoli Bowls' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Loaded Sweet Potatoes with Tempeh & Black Beans', 'dinner'::meal_category, 4, 50, array['Bake whole sweet potatoes at 200°C / 400°F for 45 minutes until soft.', 'Crumble tempeh and brown with onion, cumin and chili powder 8 minutes; add black beans and spinach until hot.', 'Split the potatoes and fill. Add salsa and avocado (tossed in lemon juice) when serving.']
    where not exists (select 1 from recipes where name = 'Loaded Sweet Potatoes with Tempeh & Black Beans' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Sweet potato', 1000, 0),
      ('Tempeh', 300, 1),
      ('Black beans (canned, drained)', 480, 2),
      ('Avocado', 200, 3),
      ('Salsa', 200, 4),
      ('Onion', 80, 5),
      ('Spinach', 120, 6),
      ('Cumin', 4, 7),
      ('Chili powder', 4, 8),
      ('Lemon juice', 30, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Loaded Sweet Potatoes with Tempeh & Black Beans' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Chickpea Eggplant Stew over Quinoa', 'dinner'::meal_category, 4, 45, array['Cube the eggplant and brown in olive oil 8 minutes.', 'Add onion, garlic and spices for 3 minutes, then tomatoes and chickpeas.', 'Simmer 20 minutes; stir in spinach.', 'Cook quinoa (dry weight) and portion the stew over it.']
    where not exists (select 1 from recipes where name = 'Chickpea Eggplant Stew over Quinoa' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Eggplant', 600, 0),
      ('Chickpeas (canned, drained)', 480, 1),
      ('Canned diced tomatoes', 600, 2),
      ('Onion', 150, 3),
      ('Garlic clove', 4, 4),
      ('Quinoa (dry)', 200, 5),
      ('Olive oil', 45, 6),
      ('Paprika', 6, 7),
      ('Cumin', 4, 8),
      ('Spinach', 100, 9)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Chickpea Eggplant Stew over Quinoa' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Gluten-Free Chicken Veggie Stir-Fry', 'dinner'::meal_category, 4, 30, array['Cook rice (amount is dry weight).', 'Slice chicken thinly and sauté in olive oil 6 minutes.', 'Add vegetables, ginger and garlic; cook 5 minutes.', 'Stir in tamari and maple syrup for 1 minute. Serve over rice.']
    where not exists (select 1 from recipes where name = 'Gluten-Free Chicken Veggie Stir-Fry' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Chicken breast', 500, 0),
      ('Frozen stir-fry vegetables', 600, 1),
      ('Brown rice (dry)', 200, 2),
      ('Tamari (gluten-free soy sauce)', 70, 3),
      ('Fresh ginger', 15, 4),
      ('Garlic clove', 3, 5),
      ('Olive oil', 30, 6),
      ('Maple syrup', 20, 7)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Gluten-Free Chicken Veggie Stir-Fry' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Shrimp Veggie Rice Noodle Stir-Fry', 'dinner'::meal_category, 4, 25, array['Cook the rice noodles per the package and rinse.', 'Sauté ginger and garlic in olive oil 30 seconds, add shrimp and cook 3 minutes.', 'Add vegetables 4 minutes, then noodles and tamari; toss until hot.']
    where not exists (select 1 from recipes where name = 'Shrimp Veggie Rice Noodle Stir-Fry' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Shrimp', 500, 0),
      ('Rice noodles (dry)', 200, 1),
      ('Frozen stir-fry vegetables', 500, 2),
      ('Tamari (gluten-free soy sauce)', 60, 3),
      ('Fresh ginger', 10, 4),
      ('Garlic clove', 3, 5),
      ('Olive oil', 30, 6)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Shrimp Veggie Rice Noodle Stir-Fry' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Veggie Marinara Pasta Bake', 'dinner'::meal_category, 6, 50, array['Heat oven to 190°C / 375°F. Cook pasta (dry weight) 2 minutes short of the package time.', 'Mix pasta with marinara, diced zucchini, mushrooms, spinach and cottage cheese.', 'Spread in a dish, top with parmesan and bake 30 minutes.']
    where not exists (select 1 from recipes where name = 'Veggie Marinara Pasta Bake' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Whole-wheat pasta (dry)', 360, 0),
      ('Marinara sauce', 600, 1),
      ('Zucchini', 300, 2),
      ('Mushrooms', 250, 3),
      ('Spinach', 150, 4),
      ('Cottage cheese (low-fat)', 300, 5),
      ('Parmesan cheese', 60, 6)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Veggie Marinara Pasta Bake' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Guacamole & Veggie Sticks', 'snack'::meal_category, 4, 15, array['Mash avocado with lemon juice and salt; fold in finely diced tomato and onion.', 'Cut carrot, cucumber and pepper into sticks.', 'Pack guacamole in small containers beside the vegetables.']
    where not exists (select 1 from recipes where name = 'Guacamole & Veggie Sticks' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Avocado', 400, 0),
      ('Tomato', 100, 1),
      ('Onion', 40, 2),
      ('Lemon juice', 45, 3),
      ('Salt', 2, 4),
      ('Carrot', 300, 5),
      ('Cucumber', 300, 6),
      ('Bell pepper', 200, 7)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Guacamole & Veggie Sticks' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Cocoa Almond Energy Bites', 'snack'::meal_category, 8, 20, array['Mix everything in a bowl until it holds together.', 'Chill 15 minutes, then roll into 16 balls.', 'Refrigerate up to 1 week. Per container: 2 bites.']
    where not exists (select 1 from recipes where name = 'Cocoa Almond Energy Bites' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Gluten-free rolled oats', 160, 0),
      ('Almond butter', 160, 1),
      ('Maple syrup', 80, 2),
      ('Cocoa powder', 20, 3),
      ('Chia seeds', 30, 4)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Cocoa Almond Energy Bites' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Trail Mix Packs', 'snack'::meal_category, 8, 10, array['Combine everything in a large bowl.', 'Divide into 8 small bags or containers (about 50 g each).']
    where not exists (select 1 from recipes where name = 'Trail Mix Packs' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Almonds', 120, 0),
      ('Cashews', 120, 1),
      ('Walnuts', 80, 2),
      ('Dark chocolate chips', 80, 3)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Trail Mix Packs' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);

    insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)
    select null::uuid, 'Baked Sweet Potato Rounds with Hummus', 'snack'::meal_category, 4, 30, array['Slice sweet potato into 1 cm rounds, toss with olive oil, paprika and salt.', 'Roast at 220°C / 425°F for 25 minutes, turning once.', 'Pack with hummus on the side.']
    where not exists (select 1 from recipes where name = 'Baked Sweet Potato Rounds with Hummus' and owner_id is null);
    insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)
    select r.id, i.id, v.amount, i.base_unit::text, v.pos from (values
      ('Sweet potato', 600, 0),
      ('Hummus', 200, 1),
      ('Olive oil', 15, 2),
      ('Paprika', 3, 3),
      ('Salt', 2, 4)
    ) as v(iname, amount, pos)
    join ingredients i on i.name = v.iname and i.owner_id is null
    join recipes r on r.name = 'Baked Sweet Potato Rounds with Hummus' and r.owner_id is null
    where not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);
  end if;
end
$migration$;
