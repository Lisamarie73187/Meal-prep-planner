# Meal Prep: notes for Claude

Meal-prep planner: pick recipes, set nutrition targets, get a grocery list. React 19 + TypeScript + Vite + React Router,
plain CSS, Supabase (Postgres, Auth, Storage, RLS), hosted on Vercel. Setup steps are in README.md; this file is the rules
and the things that are easy to get wrong.

**Stage:** the owner plus friends and family are testing. Real people have saved data, so don't make breaking changes to
it. Database changes should be additive.

## How to work with me (the owner)

- **Talk short and plain, no jargon.** Lead with what changed and what you need from me. Technical detail only if I ask.
- **Git: only when I ask.** Never commit or push on your own. When I do say "commit and push", it goes to `main`.
  Committing images is fine.
- **Before saying a change is done, run** `npx tsc -b`, `npx vitest run`, `npm run lint` and `npm run build`, and fix what they find.
  **Say clearly what you did not test** (anything needing my real login, or that would change live data).
- Report failures honestly, with the output. Don't call something working that you didn't check.

## Always ask me first before

- Deleting or changing **live database data** (deleting recipes, SQL that changes rows, changing who is an admin).
- **Deploying server functions or changing secrets** on Supabase.
- **Pushing database migrations** (`supabase db push`).
- **Deleting files** in the project.

Back up before deleting recipes (save a copy under `backups/`). Admin status is set only in SQL on purpose; never grant it
yourself.

## Secrets

- `.env.local` holds keys and tokens and is git-ignored. **Never print its values, paste them in chat, or commit it.**
  Read values in code without echoing them, and redact them from command output.
- Only the anon key goes in the browser (`VITE_` variables). `ANTHROPIC_KEY` and `SUPABASE_ACCESS_TOKEN` stay server-side
  or local.

## Design and UI

- Colors, sizes and spacing come from the **design tokens in `src/styles/tokens.css`**, with a fallback like
  `var(--token, default)`. Don't hard-code values that belong in tokens.
- **Only change the page or section I ask about.** Don't redesign anything else.
- Everything must work on **phone and desktop** (check around 320–390px and a wide screen, with no sideways scrolling).
- Keep it **accessible**: labels, keyboard use, visible focus, readable contrast.
- CSS pitfalls: class names are global, so prefix new ones (the setup wizard already owns `.choice`). Labels are column
  flex by default, `.row` wraps, and inputs are full width unless you override them.

## Data model gotchas

- Ingredient amounts are stored in the ingredient's **base unit** (`g`, `ml` or `each`). `recipe_ingredients.amount` is for the
  **whole recipe**; per serving is that divided by `servings`.
- **Recommended** recipes have `owner_id` null and are shared by everyone. Only admins can change them. A non-admin who
  edits one gets **their own copy in My recipes** (`/recipes/:id/edit`), never a change to the original.
- Signed-out visitors can plan: the plan lives in localStorage with id `local`, and saving it needs an account.
- **The live database is the source of truth for recipes.** `supabase/seed*.sql` is only a starting point and is out of date
  (recipes have been deleted since). Don't re-run it; that would bring deleted recipes back.
- Calories and macros are linked (4/4/9 kcal per g of protein/carbs/fat); the logic is in `src/lib/goals.ts` and
  `useTargetInputs`. Keep both editors (Targets page and the Goals page) on it.

## Supabase and tooling

- Project ref: `lqmzogzebocvvlyuakkh`. The CLI needs `SUPABASE_ACCESS_TOKEN` from `.env.local`; if the shell has a stale
  one, unset it first.
- The `service_role` key can write storage but has **no table privileges** (see migration 0004). For table changes use the
  Supabase management SQL endpoint (`/v1/projects/<ref>/database/query`) with the access token, after asking me.
- **AI recipe reader:** Edge Function `supabase/functions/parse-recipe` calls Claude. Its key is the Supabase secret
  `ANTHROPIC_API_KEY` (set from `ANTHROPIC_KEY` in `.env.local`). Deploy with
  `npx supabase@latest functions deploy parse-recipe --project-ref lqmzogzebocvvlyuakkh --use-api`.
- **AI limits:** the function allows 30 AI requests per person and 300 in total per UTC day (secrets `AI_DAILY_LIMIT_PER_USER` and
  `AI_DAILY_LIMIT_ALL` change them). Counts live in `ai_usage` (migration 0010), reachable only by the function. **Apply migration
  0010 before deploying the function**, or every AI request fails closed with "Couldn't check today's AI limit".
- **Recipe photos:** bucket `recipe-photos` is public; the `recommended/` folder is admin-only. Bulk upload is
  `node scripts/upload-recipe-photos.mjs <category> [--upload]` with pictures in `recipe-photos/<category>/` named after
  the recipe (dry run by default). Don't delete storage files when replacing a photo; adjusted copies may share the path.
- Commands: `npm run dev`, `npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`.
- **Lint:** ESLint (`eslint.config.js`) with React hook rules and jsx-a11y accessibility rules. Keep it at 0 errors. The 12
  `react-hooks/set-state-in-effect` warnings are known and advisory.
- **TypeScript 6 and 7 side by side (on purpose):** `typescript` in package.json is the TS 6 API package
  (`@typescript/typescript6`) because typescript-eslint doesn't support TS 7 yet; `tsc` is TypeScript 7 via the
  `@typescript/native` alias. Don't "fix" this to a plain `typescript@7` or lint breaks.

## Code layout

- `src/lib/`: pure logic with `*.test.ts` beside it (nutrition, goals, grocery, units, suggest, targetHelper, parseRecipe).
  Keep calculations here and unit-tested.
- `src/pages/`, `src/components/`: screens and pieces; the plan flow is Set up (`pages/setup`) then Goals, Meals, Review, Results.
- `src/styles/`: `tokens.css` (design tokens), `base.css`, `components.css`, `setup.css`, `goals.css`, `background.css`.
