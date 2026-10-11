#!/usr/bin/env bash
# Claude Code "Stop" hook: when Claude finishes a turn, run the project checks (npm run check: type check, lint,
# tests, build) if the code has changed since the last passing run. If they fail, exit 2 so Claude is told what broke
# and has to fix it before it can finish. Turns that change no code skip the checks.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

input=$(cat)
# If Claude already got sent back once this turn, don't loop forever: let it finish (it will still have seen the failure).
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi

stamp=.claude/.last-check-pass
files=$(git ls-files -co --exclude-standard -- src supabase/functions scripts index.html package.json package-lock.json tsconfig.json eslint.config.js vite.config.ts vitest.config.ts 2>/dev/null)
hash=$(printf '%s\n' "$files" | xargs shasum 2>/dev/null | shasum | cut -d' ' -f1)
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash" ]; then exit 0; fi

out=$(npm run check 2>&1)
if [ $? -eq 0 ]; then
  printf '%s' "$hash" > "$stamp"
  exit 0
fi

{
  echo "The project checks (npm run check) failed. Fix these before finishing, then run them again:"
  printf '%s\n' "$out" | grep -v -E "ExperimentalWarning|trace-warnings|Support for loading" | tail -60
} >&2
exit 2
