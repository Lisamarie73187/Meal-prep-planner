// Generates supabase/seed.sql. Run: node scripts/gen-seed.mjs
// Ingredient nutrition below is per 100 g / 100 ml (or per 1 "each"); converted to per-1-base-unit on output.
import { readFileSync, writeFileSync } from 'node:fs'

// [name, unit, section, density g/ml | null, cal, protein, carbs, fat, fiber, sugar]
const I = [
  ['Banana', 'each', 'produce', null, 105, 1.3, 27, 0.4, 3.1, 14.4],
  ['Apple', 'each', 'produce', null, 95, 0.5, 25, 0.3, 4.4, 19],
  ['Blueberries', 'g', 'produce', 0.62, 57, 0.7, 14.5, 0.3, 2.4, 10],
  ['Strawberries', 'g', 'produce', 0.63, 32, 0.7, 7.7, 0.3, 2, 4.9],
  ['Spinach', 'g', 'produce', 0.13, 23, 2.9, 3.6, 0.4, 2.2, 0.4],
  ['Broccoli', 'g', 'produce', 0.38, 34, 2.8, 6.6, 0.4, 2.6, 1.7],
  ['Bell pepper', 'g', 'produce', 0.63, 31, 1, 6, 0.3, 2.1, 4.2],
  ['Onion', 'g', 'produce', 0.67, 40, 1.1, 9.3, 0.1, 1.7, 4.2],
  ['Tomato', 'g', 'produce', 0.76, 18, 0.9, 3.9, 0.2, 1.2, 2.6],
  ['Carrot', 'g', 'produce', 0.54, 41, 0.9, 9.6, 0.2, 2.8, 4.7],
  ['Cucumber', 'g', 'produce', 0.44, 15, 0.7, 3.6, 0.1, 0.5, 1.7],
  ['Sweet potato', 'g', 'produce', 0.56, 86, 1.6, 20.1, 0.1, 3, 4.2],
  ['Zucchini', 'g', 'produce', 0.5, 17, 1.2, 3.1, 0.3, 1, 2.5],
  ['Avocado', 'g', 'produce', null, 160, 2, 8.5, 14.7, 6.7, 0.7],
  ['Garlic clove', 'each', 'produce', null, 4, 0.2, 1, 0, 0.1, 0],
  ['Lemon juice', 'ml', 'produce', null, 22, 0.4, 6.9, 0.2, 0.3, 2.5],
  ['Chicken breast', 'g', 'meat', null, 165, 31, 0, 3.6, 0, 0],
  ['Ground turkey (93% lean)', 'g', 'meat', null, 150, 19.7, 0, 7.7, 0, 0],
  ['Ground beef (90% lean)', 'g', 'meat', null, 176, 20, 0, 10, 0, 0],
  ['Salmon fillet', 'g', 'meat', null, 208, 20, 0, 13, 0, 0],
  ['Shrimp', 'g', 'meat', null, 99, 24, 0.2, 0.3, 0, 0],
  ['Canned tuna (in water)', 'g', 'meat', null, 116, 26, 0, 1, 0, 0],
  ['Egg', 'each', 'dairy', null, 72, 6.3, 0.4, 4.8, 0, 0.2],
  ['Plain nonfat Greek yogurt', 'g', 'dairy', 1.04, 59, 10.2, 3.6, 0.4, 0, 3.2],
  ['Cottage cheese (low-fat)', 'g', 'dairy', 1, 98, 11, 3.4, 4.3, 0, 2.7],
  ['Cheddar cheese', 'g', 'dairy', 0.47, 403, 25, 1.3, 33, 0, 0.5],
  ['Feta cheese', 'g', 'dairy', 0.6, 264, 14, 4, 21, 0, 4],
  ['Parmesan cheese', 'g', 'dairy', 0.4, 431, 38, 4, 29, 0, 0.9],
  ['Butter', 'g', 'dairy', 0.96, 717, 0.9, 0.1, 81, 0, 0.1],
  ['Unsweetened almond milk', 'ml', 'dairy', null, 15, 0.6, 0.3, 1.2, 0.2, 0],
  ['Milk (2%)', 'ml', 'dairy', null, 50, 3.3, 4.8, 2, 0, 4.8],
  ['Hummus', 'g', 'dairy', 1, 166, 8, 14, 10, 6, 0.3],
  ['Rolled oats', 'g', 'pantry', 0.34, 379, 13.2, 67.7, 6.5, 10.1, 1],
  ['Brown rice (dry)', 'g', 'pantry', 0.78, 370, 7.9, 77, 2.9, 3.5, 0.7],
  ['Quinoa (dry)', 'g', 'pantry', 0.72, 368, 14.1, 64.2, 6.1, 7, 0],
  ['Whole-wheat pasta (dry)', 'g', 'pantry', 0.4, 348, 14, 72, 2.5, 10, 3],
  ['Lentils (dry)', 'g', 'pantry', 0.81, 352, 25, 63, 1.1, 11, 2],
  ['Black beans (canned, drained)', 'g', 'pantry', 0.73, 91, 6, 16.6, 0.3, 6.2, 0.3],
  ['Chickpeas (canned, drained)', 'g', 'pantry', 0.7, 139, 7, 23, 2.6, 6, 4],
  ['Whole-wheat tortilla', 'each', 'pantry', null, 140, 4.5, 24, 3.5, 3, 1],
  ['Whole-wheat bread slice', 'each', 'pantry', null, 80, 4, 14, 1, 2, 1.5],
  ['Olive oil', 'ml', 'pantry', null, 810, 0, 0, 92, 0, 0],
  ['Peanut butter', 'g', 'pantry', 1.09, 588, 25, 20, 50, 6, 9],
  ['Almond butter', 'g', 'pantry', 1, 614, 21, 19, 56, 10, 4],
  ['Honey', 'g', 'pantry', 1.42, 304, 0.3, 82, 0, 0.2, 82],
  ['Soy sauce', 'ml', 'pantry', null, 60, 6, 6, 0, 0.7, 0.6],
  ['Chia seeds', 'g', 'pantry', 0.8, 486, 17, 42, 31, 34, 0],
  ['Almonds', 'g', 'pantry', 0.6, 579, 21, 22, 50, 12.5, 4.4],
  ['Walnuts', 'g', 'pantry', 0.42, 654, 15, 14, 65, 6.7, 2.6],
  ['Granola', 'g', 'pantry', 0.43, 471, 10, 64, 20, 7, 24],
  ['Protein powder', 'g', 'pantry', 0.4, 400, 80, 8, 6, 2, 3],
  ['Dark chocolate chips', 'g', 'pantry', 0.72, 479, 5, 61, 31, 7, 48],
  ['Canned diced tomatoes', 'g', 'pantry', 1, 21, 1.2, 4.7, 0.1, 1.9, 3],
  ['Marinara sauce', 'g', 'pantry', 1.05, 50, 1.5, 9, 1, 2, 6],
  ['Salsa', 'g', 'pantry', 1.05, 36, 1.5, 7, 0.2, 1.9, 4],
  ['Chicken broth', 'ml', 'pantry', null, 5, 0.5, 0.4, 0.2, 0, 0.3],
  ['Chili powder', 'g', 'pantry', 0.5, 282, 13, 50, 14, 35, 7],
  ['Cumin', 'g', 'pantry', 0.4, 375, 18, 44, 22, 10, 2],
  ['Paprika', 'g', 'pantry', 0.5, 282, 14, 54, 13, 35, 10],
  ['Salt', 'g', 'pantry', 1.2, 0, 0, 0, 0, 0, 0],
  ['Frozen stir-fry vegetables', 'g', 'frozen', null, 35, 2, 7, 0.3, 2.5, 3],
  ['Frozen cauliflower rice', 'g', 'frozen', null, 25, 2, 5, 0.3, 2, 2],
]

// Recipes: whole-batch amounts in base units (g / ml / each).
const R = [
  // ---- breakfast
  ['Berry Overnight Oats', 'breakfast', 4, 10, [
    ['Rolled oats', 160], ['Unsweetened almond milk', 480], ['Plain nonfat Greek yogurt', 240],
    ['Chia seeds', 40], ['Blueberries', 200], ['Honey', 40]],
    ['Stir oats, almond milk, yogurt, chia and honey together in a large bowl.', 'Divide between 4 jars or containers.', 'Top each with blueberries, seal, and refrigerate at least 6 hours or overnight.', 'Eat cold, or microwave 60 seconds.']],
  ['Veggie Egg Muffins', 'breakfast', 6, 30, [
    ['Egg', 12], ['Spinach', 120], ['Bell pepper', 150], ['Onion', 80], ['Feta cheese', 90], ['Milk (2%)', 60], ['Olive oil', 15]],
    ['Heat oven to 190°C / 375°F and grease a 12-cup muffin tin.', 'Sauté onion and pepper in olive oil 4 minutes, add spinach until wilted.', 'Whisk eggs and milk, stir in vegetables and feta.', 'Pour into the tin and bake 20 minutes until set.', 'Cool, then store. Per container: 2 muffins.']],
  ['Greek Yogurt Parfait Jars', 'breakfast', 4, 10, [
    ['Plain nonfat Greek yogurt', 600], ['Granola', 120], ['Strawberries', 300], ['Honey', 30], ['Almonds', 40]],
    ['Slice the strawberries and roughly chop the almonds.', 'Layer yogurt and strawberries in 4 jars; drizzle with honey.', 'Keep granola and almonds in a separate bag and add just before eating to keep them crunchy.']],
  ['Freezer Breakfast Burritos', 'breakfast', 6, 35, [
    ['Whole-wheat tortilla', 6], ['Egg', 8], ['Black beans (canned, drained)', 300], ['Cheddar cheese', 120],
    ['Bell pepper', 150], ['Salsa', 120], ['Onion', 80]],
    ['Dice onion and pepper and cook in a skillet 5 minutes.', 'Add beaten eggs and scramble until just set.', 'Stir in black beans and salsa; remove from heat.', 'Fill tortillas with the mixture and cheese; roll up tightly.', 'Wrap each in foil. Refrigerate 4 days or freeze up to 2 months. Reheat 90 seconds in the microwave.']],
  ['Banana Protein Pancakes', 'breakfast', 4, 25, [
    ['Rolled oats', 160], ['Banana', 4], ['Egg', 4], ['Protein powder', 60], ['Milk (2%)', 120], ['Butter', 15]],
    ['Blend oats, bananas, eggs, protein powder and milk until smooth.', 'Melt a little butter in a nonstick pan over medium heat.', 'Cook 1/4-cup scoops of batter 2 minutes per side.', 'Cool completely and stack with parchment between layers. Reheat in a toaster.']],
  ['Sweet Potato Turkey Hash', 'breakfast', 4, 35, [
    ['Sweet potato', 600], ['Ground turkey (93% lean)', 400], ['Bell pepper', 200], ['Onion', 100],
    ['Spinach', 120], ['Olive oil', 30], ['Egg', 4], ['Paprika', 4]],
    ['Dice sweet potato small and sauté in olive oil 12 minutes until tender.', 'Add onion, pepper, turkey and paprika; cook until the turkey is browned.', 'Fold in spinach until wilted.', 'Fry or poach the eggs separately and add one to each container when serving.']],
  // ---- lunch
  ['Chicken Burrito Bowls', 'lunch', 4, 40, [
    ['Chicken breast', 500], ['Brown rice (dry)', 200], ['Black beans (canned, drained)', 240], ['Salsa', 200],
    ['Avocado', 160], ['Bell pepper', 200], ['Cumin', 6], ['Chili powder', 6], ['Olive oil', 15]],
    ['Cook rice according to the package (amount listed is dry weight).', 'Season chicken with cumin and chili powder; cook in olive oil 6 minutes per side. Rest, then slice.', 'Sauté diced pepper 4 minutes.', 'Build each container: rice, beans, chicken, pepper. Add salsa and avocado just before eating.']],
  ['Mediterranean Quinoa Jars', 'lunch', 4, 25, [
    ['Quinoa (dry)', 160], ['Chickpeas (canned, drained)', 480], ['Cucumber', 300], ['Tomato', 300],
    ['Feta cheese', 120], ['Olive oil', 60], ['Onion', 80], ['Lemon juice', 60]],
    ['Cook quinoa (amount is dry weight) and cool.', 'Whisk olive oil and lemon juice for the dressing.', 'Dice cucumber, tomato and onion.', 'Layer dressing, chickpeas, vegetables, quinoa and feta in jars. Shake or stir to serve.']],
  ['Tuna Chickpea Wraps', 'lunch', 4, 15, [
    ['Canned tuna (in water)', 480], ['Chickpeas (canned, drained)', 240], ['Plain nonfat Greek yogurt', 120],
    ['Whole-wheat tortilla', 4], ['Cucumber', 200], ['Spinach', 60], ['Lemon juice', 30], ['Onion', 60]],
    ['Drain tuna; mash with chickpeas, yogurt, lemon juice and finely diced onion.', 'Fill tortillas with spinach, cucumber slices and the tuna mix.', 'Roll tightly and wrap in foil. Keeps 3 days.']],
  ['Chicken Teriyaki Stir-Fry Bowls', 'lunch', 4, 30, [
    ['Chicken breast', 500], ['Brown rice (dry)', 200], ['Frozen stir-fry vegetables', 600], ['Soy sauce', 60],
    ['Honey', 40], ['Garlic clove', 4], ['Olive oil', 15]],
    ['Cook rice (amount is dry weight).', 'Slice chicken and sear in olive oil until cooked through.', 'Add garlic and vegetables; cook 5 minutes.', 'Stir in soy sauce and honey until glossy. Serve over rice.']],
  ['Lentil Soup with Toast', 'lunch', 6, 45, [
    ['Lentils (dry)', 300], ['Carrot', 300], ['Onion', 200], ['Canned diced tomatoes', 800], ['Chicken broth', 1500],
    ['Spinach', 150], ['Olive oil', 30], ['Cumin', 6], ['Garlic clove', 4], ['Parmesan cheese', 30], ['Whole-wheat bread slice', 6]],
    ['Sauté onion, carrot and garlic in olive oil 6 minutes.', 'Add lentils, tomatoes, broth and cumin; simmer 30 minutes.', 'Stir in spinach for the last 2 minutes.', 'Portion into containers; sprinkle with parmesan. Pack a slice of toast with each.']],
  ['Greek Chicken Pasta Salad', 'lunch', 4, 30, [
    ['Chicken breast', 400], ['Whole-wheat pasta (dry)', 240], ['Cucumber', 200], ['Tomato', 300],
    ['Feta cheese', 90], ['Plain nonfat Greek yogurt', 120], ['Olive oil', 30], ['Lemon juice', 30]],
    ['Cook pasta (amount is dry weight), rinse under cold water.', 'Cook chicken in a pan, then dice.', 'Mix yogurt, olive oil and lemon juice into a dressing.', 'Toss everything together with diced cucumber and tomato; top with feta.']],
  // ---- dinner
  ['Sheet-Pan Salmon, Broccoli & Sweet Potato', 'dinner', 4, 40, [
    ['Salmon fillet', 600], ['Sweet potato', 600], ['Broccoli', 600], ['Olive oil', 45], ['Garlic clove', 4], ['Lemon juice', 30]],
    ['Heat oven to 220°C / 425°F.', 'Cube sweet potato, toss with half the oil, and roast 15 minutes.', 'Add broccoli and garlic tossed in oil; nestle the salmon on the tray.', 'Roast 12 more minutes; squeeze lemon over everything.']],
  ['Turkey Chili over Rice', 'dinner', 6, 50, [
    ['Ground turkey (93% lean)', 700], ['Black beans (canned, drained)', 480], ['Canned diced tomatoes', 800],
    ['Onion', 200], ['Bell pepper', 300], ['Chili powder', 12], ['Cumin', 8], ['Chicken broth', 500],
    ['Olive oil', 15], ['Brown rice (dry)', 180]],
    ['Brown turkey in olive oil with onion and pepper.', 'Add spices, tomatoes, beans and broth; simmer 30 minutes.', 'Cook rice (amount is dry weight).', 'Portion chili over rice in each container.']],
  ['Beef & Broccoli Rice Bowls', 'dinner', 4, 30, [
    ['Ground beef (90% lean)', 500], ['Broccoli', 600], ['Brown rice (dry)', 200], ['Soy sauce', 60],
    ['Honey', 30], ['Garlic clove', 4], ['Olive oil', 15]],
    ['Cook rice (amount is dry weight).', 'Brown the beef with garlic in olive oil; drain excess fat.', 'Add broccoli florets and a splash of water; cover 4 minutes.', 'Stir in soy sauce and honey. Serve over rice.']],
  ['Chicken Fajita Sheet Pan', 'dinner', 4, 35, [
    ['Chicken breast', 600], ['Bell pepper', 500], ['Onion', 200], ['Whole-wheat tortilla', 6], ['Olive oil', 30],
    ['Chili powder', 8], ['Cumin', 6], ['Plain nonfat Greek yogurt', 120]],
    ['Heat oven to 220°C / 425°F.', 'Slice chicken, peppers and onion; toss with oil, chili powder and cumin.', 'Roast on a sheet pan 20 minutes.', 'Serve with warmed tortillas and a spoon of yogurt.']],
  ['Turkey Meatballs with Marinara & Pasta', 'dinner', 4, 45, [
    ['Ground turkey (93% lean)', 600], ['Egg', 2], ['Parmesan cheese', 40], ['Marinara sauce', 600],
    ['Whole-wheat pasta (dry)', 200], ['Zucchini', 300], ['Garlic clove', 3], ['Olive oil', 15]],
    ['Heat oven to 200°C / 400°F. Mix turkey, egg, parmesan and minced garlic; roll into 20 meatballs.', 'Bake 18 minutes.', 'Cook pasta (amount is dry weight); sauté diced zucchini in olive oil.', 'Warm marinara, add meatballs, and serve over pasta and zucchini.']],
  ['Shrimp Fried Rice', 'dinner', 4, 30, [
    ['Shrimp', 600], ['Brown rice (dry)', 160], ['Frozen cauliflower rice', 600], ['Frozen stir-fry vegetables', 400],
    ['Soy sauce', 45], ['Olive oil', 30], ['Garlic clove', 4], ['Egg', 4]],
    ['Cook rice (amount is dry weight) and cool.', 'Scramble eggs in a hot wok with oil and set aside.', 'Stir-fry shrimp and garlic 3 minutes, add vegetables and cauliflower rice.', 'Add cooked rice, eggs and soy sauce; toss until hot.']],
  // ---- snack
  ['Hummus & Veggie Snack Boxes', 'snack', 4, 15, [
    ['Hummus', 240], ['Carrot', 300], ['Cucumber', 300], ['Bell pepper', 200], ['Almonds', 40]],
    ['Cut carrots, cucumber and pepper into sticks.', 'Fill each box with hummus, vegetables and a small handful of almonds.']],
  ['Peanut Butter Oat Bites', 'snack', 8, 20, [
    ['Rolled oats', 160], ['Peanut butter', 120], ['Honey', 80], ['Chia seeds', 30], ['Dark chocolate chips', 60]],
    ['Mix everything in a bowl until it holds together.', 'Chill 15 minutes, then roll into 16 balls.', 'Refrigerate up to 1 week. Per container: 2 bites.']],
  ['Cottage Cheese Berry Bowls', 'snack', 4, 5, [
    ['Cottage cheese (low-fat)', 600], ['Strawberries', 200], ['Walnuts', 40], ['Honey', 20]],
    ['Divide cottage cheese between 4 containers.', 'Top with sliced strawberries, chopped walnuts and a drizzle of honey.']],
  ['Apple & Almond Butter Packs', 'snack', 4, 5, [
    ['Apple', 4], ['Almond butter', 100]],
    ['Slice apples and toss with a little lemon water to prevent browning.', 'Pack with a small container of almond butter (25 g each).']],
  ['Egg & Veggie Snack Packs', 'snack', 6, 20, [
    ['Egg', 12], ['Carrot', 300], ['Bell pepper', 200], ['Tomato', 200], ['Salt', 2]],
    ['Boil eggs 10 minutes, cool in ice water, and peel.', 'Cut carrot and pepper into sticks and halve the tomatoes.', 'Pack 2 eggs with vegetables per container; a pinch of salt on the side.']],
  ['Crispy Roasted Chickpeas', 'snack', 4, 35, [
    ['Chickpeas (canned, drained)', 480], ['Olive oil', 15], ['Chili powder', 4], ['Paprika', 4], ['Salt', 2]],
    ['Heat oven to 200°C / 400°F. Dry the chickpeas very well.', 'Toss with oil and spices; spread on a tray.', 'Roast 25–30 minutes, shaking halfway, until crunchy. Store loosely covered.']],
]

// ---- Second batch: plant-based, gluten-free and dairy-free options for every meal type.
// Written to supabase/seed-more.sql (safe to re-run; skips anything already present) so a database
// that already ran seed.sql can add them. None of these ingredients carry a diet flag on purpose:
// they are plant-based and gluten-free. (Oats are flagged as gluten, so this batch has its own gluten-free oats.)
const I2 = [
  ['Firm tofu', 'g', 'other', null, 144, 17.3, 2.8, 8.7, 2.3, 0.6],
  ['Tempeh', 'g', 'other', null, 192, 20.3, 7.6, 10.8, 0, 0],
  ['Canned coconut milk', 'ml', 'pantry', null, 190, 1.8, 2.7, 20, 0, 2.2],
  ['Maple syrup', 'g', 'pantry', 1.33, 260, 0, 67, 0.1, 0, 60],
  ['Rice noodles (dry)', 'g', 'pantry', null, 364, 3.4, 80, 0.6, 1.6, 0],
  ['Curry powder', 'g', 'pantry', 0.45, 325, 14.3, 55.8, 14, 53.2, 2.8],
  ['Tamari (gluten-free soy sauce)', 'ml', 'pantry', null, 68, 12, 6.4, 0, 0.8, 0.5],
  ['Gluten-free rolled oats', 'g', 'pantry', 0.34, 379, 13.2, 67.7, 6.5, 10.1, 1],
  ['Corn tortilla', 'each', 'pantry', null, 57, 1.5, 11.6, 0.8, 1.6, 0.2],
  ['Vegetable broth', 'ml', 'pantry', null, 6, 0.3, 1.2, 0.1, 0, 0.6],
  ['Kidney beans (canned, drained)', 'g', 'pantry', 0.73, 105, 6.9, 19, 0.5, 5.5, 1.5],
  ['Cashews', 'g', 'pantry', 0.55, 553, 18.2, 30.2, 43.9, 3.3, 5.9],
  ['Cocoa powder', 'g', 'pantry', 0.4, 228, 19.6, 57.9, 13.7, 33.2, 1.8],
  ['Fresh ginger', 'g', 'produce', null, 80, 1.8, 17.8, 0.8, 2, 1.7],
  ['Mushrooms', 'g', 'produce', null, 22, 3.1, 3.3, 0.3, 1, 2],
  ['Eggplant', 'g', 'produce', null, 25, 1, 5.9, 0.2, 3, 3.5],
  ['Frozen corn', 'g', 'frozen', null, 86, 3.3, 19, 1.4, 2, 6],
]

const R2 = [
  // ---- breakfast
  ['Tofu Veggie Scramble', 'breakfast', 4, 30, [
    ['Firm tofu', 600], ['Spinach', 120], ['Bell pepper', 200], ['Onion', 100], ['Mushrooms', 200],
    ['Sweet potato', 400], ['Olive oil', 30], ['Cumin', 4], ['Paprika', 4], ['Salt', 3]],
    ['Dice the sweet potato small and roast at 200°C / 400°F for 25 minutes.', 'Sauté onion, pepper and mushrooms in olive oil 6 minutes.', 'Crumble in the tofu with cumin, paprika and salt; cook 8 minutes until golden.', 'Fold in spinach until wilted. Divide with the roasted sweet potato.']],
  ['Chocolate Chia Pudding', 'breakfast', 4, 10, [
    ['Chia seeds', 120], ['Unsweetened almond milk', 800], ['Cocoa powder', 20], ['Maple syrup', 60],
    ['Almond butter', 60], ['Banana', 2], ['Strawberries', 200]],
    ['Whisk almond milk, cocoa and maple syrup until smooth, then whisk in the chia seeds.', 'Divide between 4 jars and refrigerate at least 4 hours or overnight; stir once after 30 minutes.', 'Top with sliced banana, strawberries and a spoonful of almond butter when serving.']],
  ['Peanut Butter Banana Oat Bake', 'breakfast', 6, 40, [
    ['Gluten-free rolled oats', 300], ['Banana', 3], ['Unsweetened almond milk', 600], ['Peanut butter', 120],
    ['Maple syrup', 60], ['Chia seeds', 30]],
    ['Heat oven to 180°C / 350°F and grease a baking dish.', 'Mash the bananas and stir in almond milk, peanut butter, maple syrup and chia seeds.', 'Mix in the oats, pour into the dish and bake 30 minutes until set.', 'Cut into 6 portions. Keeps 5 days; reheat 60 seconds in the microwave.']],
  ['Sweet Potato & Black Bean Breakfast Hash', 'breakfast', 4, 35, [
    ['Sweet potato', 800], ['Black beans (canned, drained)', 480], ['Bell pepper', 200], ['Onion', 100],
    ['Avocado', 200], ['Olive oil', 30], ['Cumin', 6], ['Chili powder', 4], ['Salsa', 120]],
    ['Dice sweet potato small and sauté in olive oil 12 minutes until tender.', 'Add onion, pepper, cumin and chili powder; cook 5 minutes.', 'Stir in black beans until hot.', 'Divide into containers; add salsa and sliced avocado just before eating.']],
  ['Sweet Potato Spinach Egg Bake', 'breakfast', 6, 45, [
    ['Egg', 12], ['Sweet potato', 500], ['Spinach', 200], ['Mushrooms', 300], ['Onion', 100],
    ['Bell pepper', 150], ['Olive oil', 30], ['Salt', 3]],
    ['Heat oven to 190°C / 375°F. Thinly slice the sweet potato and roast 15 minutes.', 'Sauté onion, pepper and mushrooms in olive oil; add spinach until wilted.', 'Layer sweet potato and vegetables in a baking dish. Pour over the whisked eggs and salt.', 'Bake 25 minutes until set. Cut into 6 portions.']],
  // ---- lunch
  ['Chickpea Curry Rice Bowls', 'lunch', 4, 35, [
    ['Chickpeas (canned, drained)', 480], ['Brown rice (dry)', 200], ['Canned coconut milk', 400],
    ['Canned diced tomatoes', 400], ['Onion', 150], ['Curry powder', 12], ['Fresh ginger', 15],
    ['Garlic clove', 4], ['Spinach', 120], ['Olive oil', 15]],
    ['Cook rice (amount is dry weight).', 'Sauté onion, ginger and garlic in olive oil 5 minutes; stir in curry powder 1 minute.', 'Add tomatoes, coconut milk and chickpeas; simmer 15 minutes.', 'Stir in spinach until wilted and serve over rice.']],
  ['Peanut Noodle Bowls with Tofu', 'lunch', 4, 30, [
    ['Rice noodles (dry)', 200], ['Firm tofu', 500], ['Peanut butter', 100], ['Tamari (gluten-free soy sauce)', 60],
    ['Carrot', 200], ['Cucumber', 200], ['Lemon juice', 30], ['Maple syrup', 20], ['Garlic clove', 2], ['Fresh ginger', 10]],
    ['Cube the tofu and bake at 200°C / 400°F for 25 minutes until firm.', 'Cook the rice noodles per the package and rinse in cold water.', 'Whisk peanut butter, tamari, lemon juice, maple syrup, garlic and ginger with a few spoons of warm water.', 'Toss noodles with sauce; top with tofu, shredded carrot and sliced cucumber.']],
  ['Black Bean Quinoa Salad', 'lunch', 4, 25, [
    ['Quinoa (dry)', 160], ['Black beans (canned, drained)', 480], ['Frozen corn', 200], ['Bell pepper', 200],
    ['Tomato', 200], ['Avocado', 200], ['Lemon juice', 60], ['Olive oil', 45], ['Cumin', 4], ['Onion', 60]],
    ['Cook quinoa (amount is dry weight) and cool. Thaw the corn.', 'Whisk olive oil, lemon juice and cumin for the dressing.', 'Dice pepper, tomato and onion; toss everything except the avocado with the dressing.', 'Divide into containers and add diced avocado just before eating.']],
  ['Sweet Potato Black Bean Tacos', 'lunch', 4, 40, [
    ['Corn tortilla', 8], ['Sweet potato', 600], ['Black beans (canned, drained)', 360], ['Avocado', 160],
    ['Salsa', 160], ['Onion', 60], ['Cumin', 4], ['Chili powder', 4], ['Olive oil', 15], ['Lemon juice', 30]],
    ['Dice sweet potato, toss with olive oil, cumin and chili powder, and roast at 200°C / 400°F for 25 minutes.', 'Warm the black beans with a splash of water.', 'Keep tortillas, filling, salsa and avocado (tossed in lemon juice) separate; assemble 2 tacos per serving.']],
  ['Tofu Fried Rice Bowls', 'lunch', 4, 30, [
    ['Brown rice (dry)', 200], ['Firm tofu', 500], ['Frozen stir-fry vegetables', 400],
    ['Tamari (gluten-free soy sauce)', 60], ['Fresh ginger', 10], ['Garlic clove', 3], ['Olive oil', 30]],
    ['Cook rice (amount is dry weight) and cool; day-old rice works best.', 'Crumble tofu and fry in olive oil 8 minutes until golden.', 'Add vegetables, ginger and garlic; cook 5 minutes.', 'Stir in rice and tamari and fry 3 more minutes.']],
  ['Greek Lentil Salad Jars', 'lunch', 4, 30, [
    ['Lentils (dry)', 200], ['Cucumber', 300], ['Tomato', 300], ['Feta cheese', 100], ['Onion', 60],
    ['Spinach', 100], ['Olive oil', 45], ['Lemon juice', 45]],
    ['Cook lentils (amount is dry weight) until just tender; drain and cool.', 'Whisk olive oil and lemon juice for the dressing.', 'Layer dressing, lentils, diced cucumber, tomato and onion, spinach and crumbled feta in jars.']],
  // ---- dinner
  ['Three-Bean Veggie Chili', 'dinner', 6, 50, [
    ['Kidney beans (canned, drained)', 480], ['Black beans (canned, drained)', 480], ['Canned diced tomatoes', 800],
    ['Onion', 200], ['Bell pepper', 300], ['Carrot', 200], ['Chili powder', 15], ['Cumin', 8], ['Paprika', 6],
    ['Brown rice (dry)', 240], ['Olive oil', 30], ['Salt', 4]],
    ['Sauté onion, pepper and carrot in olive oil 8 minutes.', 'Add spices and cook 1 minute, then add tomatoes and beans with 300 ml water.', 'Simmer 30 minutes, adding salt to taste.', 'Cook rice (amount is dry weight) and portion the chili over it.']],
  ['Coconut Lentil Curry with Rice', 'dinner', 6, 45, [
    ['Lentils (dry)', 300], ['Canned coconut milk', 400], ['Canned diced tomatoes', 400], ['Onion', 200],
    ['Carrot', 200], ['Spinach', 200], ['Curry powder', 18], ['Fresh ginger', 20], ['Garlic clove', 4],
    ['Brown rice (dry)', 240], ['Vegetable broth', 600], ['Olive oil', 15]],
    ['Sauté onion, carrot, ginger and garlic in olive oil 6 minutes; stir in curry powder.', 'Add lentils (dry weight), tomatoes, coconut milk and broth; simmer 25 minutes until the lentils are soft.', 'Stir in spinach. Cook rice separately (dry weight) and portion the curry over it.']],
  ['Teriyaki Tofu Broccoli Bowls', 'dinner', 4, 40, [
    ['Firm tofu', 600], ['Broccoli', 500], ['Brown rice (dry)', 240], ['Tamari (gluten-free soy sauce)', 80],
    ['Maple syrup', 40], ['Fresh ginger', 15], ['Garlic clove', 4], ['Olive oil', 30], ['Carrot', 150]],
    ['Cook rice (amount is dry weight).', 'Cube tofu and pan-fry in olive oil 10 minutes until golden.', 'Add broccoli and sliced carrot with a splash of water; cover 4 minutes.', 'Whisk tamari, maple syrup, ginger and garlic; toss through for 2 minutes. Serve over rice.']],
  ['Loaded Sweet Potatoes with Tempeh & Black Beans', 'dinner', 4, 50, [
    ['Sweet potato', 1000], ['Tempeh', 300], ['Black beans (canned, drained)', 480], ['Avocado', 200],
    ['Salsa', 200], ['Onion', 80], ['Spinach', 120], ['Cumin', 4], ['Chili powder', 4], ['Lemon juice', 30]],
    ['Bake whole sweet potatoes at 200°C / 400°F for 45 minutes until soft.', 'Crumble tempeh and brown with onion, cumin and chili powder 8 minutes; add black beans and spinach until hot.', 'Split the potatoes and fill. Add salsa and avocado (tossed in lemon juice) when serving.']],
  ['Chickpea Eggplant Stew over Quinoa', 'dinner', 4, 45, [
    ['Eggplant', 600], ['Chickpeas (canned, drained)', 480], ['Canned diced tomatoes', 600], ['Onion', 150],
    ['Garlic clove', 4], ['Quinoa (dry)', 200], ['Olive oil', 45], ['Paprika', 6], ['Cumin', 4], ['Spinach', 100]],
    ['Cube the eggplant and brown in olive oil 8 minutes.', 'Add onion, garlic and spices for 3 minutes, then tomatoes and chickpeas.', 'Simmer 20 minutes; stir in spinach.', 'Cook quinoa (dry weight) and portion the stew over it.']],
  ['Gluten-Free Chicken Veggie Stir-Fry', 'dinner', 4, 30, [
    ['Chicken breast', 500], ['Frozen stir-fry vegetables', 600], ['Brown rice (dry)', 200],
    ['Tamari (gluten-free soy sauce)', 70], ['Fresh ginger', 15], ['Garlic clove', 3], ['Olive oil', 30], ['Maple syrup', 20]],
    ['Cook rice (amount is dry weight).', 'Slice chicken thinly and sauté in olive oil 6 minutes.', 'Add vegetables, ginger and garlic; cook 5 minutes.', 'Stir in tamari and maple syrup for 1 minute. Serve over rice.']],
  ['Shrimp Veggie Rice Noodle Stir-Fry', 'dinner', 4, 25, [
    ['Shrimp', 500], ['Rice noodles (dry)', 200], ['Frozen stir-fry vegetables', 500],
    ['Tamari (gluten-free soy sauce)', 60], ['Fresh ginger', 10], ['Garlic clove', 3], ['Olive oil', 30]],
    ['Cook the rice noodles per the package and rinse.', 'Sauté ginger and garlic in olive oil 30 seconds, add shrimp and cook 3 minutes.', 'Add vegetables 4 minutes, then noodles and tamari; toss until hot.']],
  ['Veggie Marinara Pasta Bake', 'dinner', 6, 50, [
    ['Whole-wheat pasta (dry)', 360], ['Marinara sauce', 600], ['Zucchini', 300], ['Mushrooms', 250],
    ['Spinach', 150], ['Cottage cheese (low-fat)', 300], ['Parmesan cheese', 60]],
    ['Heat oven to 190°C / 375°F. Cook pasta (dry weight) 2 minutes short of the package time.', 'Mix pasta with marinara, diced zucchini, mushrooms, spinach and cottage cheese.', 'Spread in a dish, top with parmesan and bake 30 minutes.']],
  // ---- snack
  ['Guacamole & Veggie Sticks', 'snack', 4, 15, [
    ['Avocado', 400], ['Tomato', 100], ['Onion', 40], ['Lemon juice', 45], ['Salt', 2],
    ['Carrot', 300], ['Cucumber', 300], ['Bell pepper', 200]],
    ['Mash avocado with lemon juice and salt; fold in finely diced tomato and onion.', 'Cut carrot, cucumber and pepper into sticks.', 'Pack guacamole in small containers beside the vegetables.']],
  ['Cocoa Almond Energy Bites', 'snack', 8, 20, [
    ['Gluten-free rolled oats', 160], ['Almond butter', 160], ['Maple syrup', 80], ['Cocoa powder', 20], ['Chia seeds', 30]],
    ['Mix everything in a bowl until it holds together.', 'Chill 15 minutes, then roll into 16 balls.', 'Refrigerate up to 1 week. Per container: 2 bites.']],
  ['Trail Mix Packs', 'snack', 8, 10, [
    ['Almonds', 120], ['Cashews', 120], ['Walnuts', 80], ['Dark chocolate chips', 80]],
    ['Combine everything in a large bowl.', 'Divide into 8 small bags or containers (about 50 g each).']],
  ['Baked Sweet Potato Rounds with Hummus', 'snack', 4, 30, [
    ['Sweet potato', 600], ['Hummus', 200], ['Olive oil', 15], ['Paprika', 3], ['Salt', 2]],
    ['Slice sweet potato into 1 cm rounds, toss with olive oil, paprika and salt.', 'Roast at 220°C / 425°F for 25 minutes, turning once.', 'Pack with hummus on the side.']],
]

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const n = (x) => Number(x.toFixed(6))
let out = '-- Generated by scripts/gen-seed.mjs. Run once after migrations.\n-- Recommended (public) ingredients and recipes have owner_id null.\n\n'

out += 'insert into ingredients (owner_id, name, base_unit, store_section, density_g_per_ml, calories, protein, carbs, fat, fiber, sugar) values\n'
out += I.map(([name, unit, sec, dens, ...m]) => {
  const k = unit === 'each' ? 1 : 100
  return `  (null, ${q(name)}, '${unit}', '${sec}', ${dens ?? 'null'}, ${m.map((v) => n(v / k)).join(', ')})`
}).join(',\n') + ';\n\n'

for (const [name, cat, servings, prep, ings, steps] of R) {
  out += `insert into recipes (owner_id, name, category, servings, prep_minutes, instructions) values (null, ${q(name)}, '${cat}', ${servings}, ${prep}, array[${steps.map(q).join(', ')}]);\n`
  out += 'insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)\nselect r.id, i.id, v.amount, i.base_unit::text, v.pos from (values\n'
  out += ings.map(([iname, amt], p) => `  (${q(iname)}, ${amt}, ${p})`).join(',\n')
  out += `\n) as v(iname, amount, pos)\njoin ingredients i on i.name = v.iname and i.owner_id is null\njoin recipes r on r.name = ${q(name)} and r.owner_id is null;\n\n`
}
// Diet tags live in the migration (single source of truth); append them so a fresh database matches.
// Later migrations refine the tags (0008 moves fish from 'meat' to 'fish'), so apply them in order.
for (const file of ['0005_diet_and_preferences.sql', '0008_fish_tag.sql']) {
  const migration = readFileSync(`supabase/migrations/${file}`, 'utf8')
  const tags = migration.split('-- diet tags start')[1].split('-- diet tags end')[0].replace(/^[^\n]*\n/, '')
  out += `\n-- diet tags (${file})\n${tags.trim()}\n`
}
writeFileSync('supabase/seed.sql', out)
const names = new Set(I.map((x) => x[0]))
for (const r of R) for (const [iname] of r[4]) if (!names.has(iname)) throw new Error('Unknown ingredient ' + iname + ' in ' + r[0])
console.log(`${I.length} ingredients, ${R.length} recipes`)

// ---- seed-more.sql (idempotent: adds only what is missing)
const allNames = new Set([...I, ...I2].map((x) => x[0]))
for (const r of R2) for (const [iname] of r[4]) if (!allNames.has(iname)) throw new Error('Unknown ingredient ' + iname + ' in ' + r[0])
const existingRecipes = new Set(R.map((r) => r[0]))
for (const r of R2) if (existingRecipes.has(r[0])) throw new Error('Duplicate recipe name ' + r[0])

let more = '-- Generated by scripts/gen-seed.mjs. Run after seed.sql. Safe to re-run: skips anything already present.\n\n'
more += 'insert into ingredients (owner_id, name, base_unit, store_section, density_g_per_ml, calories, protein, carbs, fat, fiber, sugar)\n'
more += 'select null::uuid, v.name, v.unit::base_unit, v.section::store_section, v.density::numeric, v.calories::numeric, v.protein::numeric, v.carbs::numeric, v.fat::numeric, v.fiber::numeric, v.sugar::numeric\nfrom (values\n'
more += I2.map(([name, unit, sec, dens, ...m]) => {
  const k = unit === 'each' ? 1 : 100
  return `  (${q(name)}, '${unit}', '${sec}', ${dens ?? 'null'}, ${m.map((v) => n(v / k)).join(', ')})`
}).join(',\n')
more += '\n) as v(name, unit, section, density, calories, protein, carbs, fat, fiber, sugar)\nwhere not exists (select 1 from ingredients i where i.name = v.name and i.owner_id is null);\n\n'
for (const [name, cat, servings, prep, ings, steps] of R2) {
  more += `insert into recipes (owner_id, name, category, servings, prep_minutes, instructions)\nselect null::uuid, ${q(name)}, '${cat}'::meal_category, ${servings}, ${prep}, array[${steps.map(q).join(', ')}]\nwhere not exists (select 1 from recipes where name = ${q(name)} and owner_id is null);\n`
  more += 'insert into recipe_ingredients (recipe_id, ingredient_id, amount, display_unit, position)\nselect r.id, i.id, v.amount, i.base_unit::text, v.pos from (values\n'
  more += ings.map(([iname, amt], p) => `  (${q(iname)}, ${amt}, ${p})`).join(',\n')
  more += `\n) as v(iname, amount, pos)\njoin ingredients i on i.name = v.iname and i.owner_id is null\njoin recipes r on r.name = ${q(name)} and r.owner_id is null\nwhere not exists (select 1 from recipe_ingredients x where x.recipe_id = r.id);\n\n`
}
writeFileSync('supabase/seed-more.sql', more)
console.log(`seed-more: ${I2.length} ingredients, ${R2.length} recipes`)

// Per-serving sanity check: node scripts/gen-seed.mjs --check
if (process.argv.includes('--check')) {
  const byName = new Map([...I, ...I2].map(([nm, unit, , , ...m]) => [nm, { k: unit === 'each' ? 1 : 100, m }]))
  for (const [name, cat, servings, , ings] of R2) {
    const t = [0, 0, 0, 0]
    for (const [iname, amt] of ings) { const { k, m } = byName.get(iname); for (let j = 0; j < 4; j++) t[j] += (m[j] / k) * amt }
    console.log(`CHECK ${cat.padEnd(9)} ${name.padEnd(48)} ${Math.round(t[0] / servings)} kcal  P${Math.round(t[1] / servings)} C${Math.round(t[2] / servings)} F${Math.round(t[3] / servings)}`)
  }
}
