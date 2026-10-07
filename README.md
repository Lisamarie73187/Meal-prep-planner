# Meal Prep

Pick recipes, say how many meals to prep, and get a combined grocery list, scaled recipes and per-container portions.
React + TypeScript + Vite + React Router, plain CSS, Supabase (Postgres, Auth, Storage, RLS), hosted on Vercel.

## Setup

1. **Supabase project:** create one at supabase.com. Copy the Project URL and the *anon public* key from Project Settings → API. Never use the `service_role` key here.
2. **Env:** `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Database:** in the Supabase SQL Editor run, in order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_rls.sql`
   3. `supabase/migrations/0003_storage.sql`
   4. `supabase/migrations/0004_grants.sql` (table privileges; without it every query fails with "permission denied")
   5. `supabase/migrations/0005_diet_and_preferences.sql` (diet flags on ingredients, per-plan preferences)
   6. `supabase/migrations/0006_hidden_recipes.sql` ("Never show again" lists, private per person)
   7. `supabase/migrations/0007_more_recipes.sql` (records the second recipe batch in history; does nothing until the base seed exists, so on a fresh project it is a no-op)
   8. `supabase/migrations/0008_fish_tag.sql` (a separate "fish" tag so the Pescatarian diet can allow fish but not meat)
   9. `supabase/seed.sql` (run once: 62 ingredients, 24 recommended recipes, with diet flags)
   10. `supabase/seed-more.sql` (17 more ingredients, 23 more recipes: plant-based, gluten-free and dairy-free options; safe to re-run)
4. **Auth:** for local testing, turn off Authentication → Providers → Email → "Confirm email" (leave it on in production).
5. **Run:** `npm install && npm run dev`.
6. **Make yourself admin** (after signing up in the app):
   ```sql
   update profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   There is deliberately no UI for this, and a trigger blocks clients from changing `is_admin`.

## Deploy (Vercel)

Import the repo, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings → Environment Variables. `vercel.json` rewrites all paths to `index.html` so React Router routes survive a refresh.

## Scripts

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm test`
- `node scripts/gen-seed.mjs` regenerates `supabase/seed.sql` from the ingredient and recipe data in the script.

## How it works

- **Units:** amounts are stored in base units (`g`, `ml`, `each`). Nutrition is stored per 1 base unit. An optional per-ingredient density (g/ml) allows conversion between weight and cups/spoons. Conversion and display rounding live in `src/lib/units.ts`.
- **Nutrition** is always summed from ingredients (`src/lib/nutrition.ts`), never stored on recipes.
- **Grocery list:** `src/lib/grocery.ts` combines same-named ingredients, scales per-serving amounts to the meal count, and subtracts inventory.
- **Auto-fit:** `src/lib/autofit.ts` is a bounded least-squares fit (50%–200% per ingredient) to per-meal calories, protein, carbs and fat.
- **Plans** are saved as drafts and confirmed later. Confirming snapshots each recipe and the inventory, so old grocery lists reopen unchanged.
- **Security** is enforced by RLS policies in `0002_rls.sql` and `0003_storage.sql`, not by client checks.
