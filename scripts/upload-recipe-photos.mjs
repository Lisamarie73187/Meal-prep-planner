#!/usr/bin/env node
// Bulk-add photos to the recommended recipes (shared by every user).
//
//   node scripts/upload-recipe-photos.mjs breakfast            # dry run: shows what would happen, changes nothing
//   node scripts/upload-recipe-photos.mjs breakfast --upload   # does it
//
// Put the pictures in recipe-photos/<category>/ named after the recipe, e.g. berry-overnight-oats.jpg
// (capitals, spaces and "&" don't matter: "Berry Overnight Oats.JPG" works too). Running it again replaces photos.
// Needs SUPABASE_ACCESS_TOKEN in .env.local (the service key is fetched with it for the run and never printed or saved).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, parse } from 'node:path'

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack']
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif', '.tiff', '.bmp'])
const MAX_EDGE = 1200

const args = process.argv.slice(2)
const category = args.find((a) => !a.startsWith('--'))
const upload = args.includes('--upload')
if (!CATEGORIES.includes(category)) {
  console.error(`Usage: node scripts/upload-recipe-photos.mjs <${CATEGORIES.join('|')}> [--upload] [--dir <folder>]`)
  process.exit(1)
}
const dirArg = args.indexOf('--dir')
const dir = dirArg >= 0 ? args[dirArg + 1] : join('recipe-photos', category)

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  if (line.includes('=') && !line.startsWith('#')) env[line.slice(0, line.indexOf('='))] = line.slice(line.indexOf('=') + 1).trim()
}
const URL_ = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const REF = new globalThis.URL(URL_).hostname.split('.')[0]
const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ---- what recipes exist (public read)
const recipes = await (await fetch(`${URL_}/rest/v1/recipes?select=id,name,photo_path&owner_id=is.null&category=eq.${category}&order=name`, { headers: { apikey: ANON } })).json()
if (!Array.isArray(recipes)) { console.error('Could not read recipes:', JSON.stringify(recipes).slice(0, 200)); process.exit(1) }

// ---- what pictures you gave me
if (!existsSync(dir)) { console.error(`Folder not found: ${dir}\nCreate it and put the ${category} pictures inside.`); process.exit(1) }
const files = readdirSync(dir).filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()) && !f.startsWith('.'))
const bySlug = new Map(recipes.map((r) => [slug(r.name), r]))
const matches = []
const unmatchedFiles = []
for (const f of files) {
  const r = bySlug.get(slug(parse(f).name))
  if (r) matches.push({ file: f, recipe: r }); else unmatchedFiles.push(f)
}
const seen = new Map()
for (const m of matches) seen.set(m.recipe.id, [...(seen.get(m.recipe.id) ?? []), m.file])
const duplicates = [...seen.values()].filter((v) => v.length > 1)
const missing = recipes.filter((r) => !seen.has(r.id))

console.log(`\n${category}: ${recipes.length} recipes, ${files.length} picture(s) in ${dir}\n`)
for (const m of matches) console.log(`  OK   ${m.file}  ->  ${m.recipe.name}${m.recipe.photo_path ? '   (replaces its current photo)' : ''}`)
for (const f of unmatchedFiles) {
  const near = recipes.filter((r) => slug(r.name).includes(slug(parse(f).name)) || slug(parse(f).name).includes(slug(r.name))).map((r) => r.name)
  console.log(`  ??   ${f}  ->  no recipe with that name${near.length ? `. Did you mean: ${near.join(' / ')}?` : ''}`)
}
for (const r of missing) console.log(`  --   ${r.name}  (no picture yet -> ${slug(r.name)}.jpg)`)
if (duplicates.length) { console.error(`\nTwo pictures for the same recipe: ${duplicates.map((d) => d.join(' & ')).join('; ')}. Remove one.`); process.exit(1) }

// ---- shrink to 1200px JPEG (sips ships with macOS), also in a dry run so problems show up early
const work = mkdtempSync(join(tmpdir(), 'recipe-photos-'))
const prepared = []
try {
  for (const m of matches) {
    const out = join(work, `${slug(m.recipe.name)}.jpg`)
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', String(MAX_EDGE), join(dir, m.file), '--out', out], { stdio: 'pipe' })
    } catch { console.error(`\nCould not read ${m.file}. Try re-saving it as a JPG or PNG.`); process.exit(1) }
    const kb = Math.round(statSync(out).size / 1024)
    prepared.push({ ...m, out, kb })
  }
  if (prepared.length) console.log(`\nResized ${prepared.length} picture(s) to <=${MAX_EDGE}px JPEG, ${prepared.map((p) => p.kb + ' KB').join(', ')}.`)

  if (!upload) {
    console.log(`\nDry run only. Nothing was uploaded or changed.${matches.length ? ' Run again with --upload to apply.' : ''}`)
    process.exit(0)
  }
  if (!matches.length) { console.log('\nNothing to upload.'); process.exit(0) }
  if (!env.SUPABASE_ACCESS_TOKEN) { console.error('SUPABASE_ACCESS_TOKEN is missing from .env.local'); process.exit(1) }

  // ---- service key, fetched for this run only
  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } })
  if (!keysRes.ok) { console.error(`Could not get the upload key (HTTP ${keysRes.status}). Check SUPABASE_ACCESS_TOKEN.`); process.exit(1) }
  const service = (await keysRes.json()).find((k) => k.name === 'service_role')?.api_key
  if (!service) { console.error('No service_role key found for the project.'); process.exit(1) }
  const auth = { apikey: service, Authorization: `Bearer ${service}` }
  // The service key can write files but has no rights on the recipes table, so table changes go through the
  // project's SQL endpoint (same access token). Values are quoted here, never trusted raw.
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`
  const sql = async (query) => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`)
    return res.json()
  }

  let done = 0
  for (const p of prepared) {
    const path = `recommended/${slug(p.recipe.name)}-${Date.now()}.jpg`
    const up = await fetch(`${URL_}/storage/v1/object/recipe-photos/${path}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=31536000' }, body: readFileSync(p.out) })
    if (!up.ok) { console.error(`  FAIL ${p.recipe.name}: upload ${up.status} ${(await up.text()).slice(0, 120)}`); continue }
    try {
      await sql(`update recipes set photo_path = ${q(path)}, updated_at = now() where id = ${q(p.recipe.id)} and owner_id is null`)
    } catch (e) { console.error(`  FAIL ${p.recipe.name}: saved the file but could not link it (${e.message}). Run again.`); continue }
    console.log(`  done ${p.recipe.name}`)
    done++
    // Tidy the replaced file, unless another recipe (e.g. an adjusted copy) still points at it.
    const old = p.recipe.photo_path
    if (old?.startsWith('recommended/')) {
      const users = await sql(`select id from recipes where photo_path = ${q(old)}`).catch(() => null)
      if (Array.isArray(users) && users.length === 0) await fetch(`${URL_}/storage/v1/object/recipe-photos/${old}`, { method: 'DELETE', headers: auth })
    }
  }
  console.log(`\n${done} of ${prepared.length} photos added. They show up for every user straight away.`)
  if (done < prepared.length) process.exit(1)
} finally {
  rmSync(work, { recursive: true, force: true })
}
