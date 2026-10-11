import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// What this checks: common mistakes (recommended), React hook rules, and accessibility problems in JSX.
// Formatting is not checked on purpose. The Edge Function runs on Deno and is checked by its own tooling.
export default tseslint.config(
  // .claude holds other working copies of this project (git worktrees); lint only the real one.
  { ignores: ['dist', 'node_modules', '.claude', 'supabase/functions', 'backups', 'recipe-photos', 'scripts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Very new React rule. Flags a common, working pattern (loading data and setting state in an effect); shown as a
      // warning to clean up gradually instead of rewriting working code all at once.
      'react-hooks/set-state-in-effect': 'warn',
      // Our labels wrap an input plus a styled span with the text, so look a bit deeper for the text.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 4 }],
      // The TypeScript compiler already reports unused variables (noUnusedLocals); keep underscore names for ignored ones.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  { files: ['*.config.{js,ts}', 'vite.config.ts', 'vitest.config.ts'], languageOptions: { globals: globals.node } },
)
