/**
 * Sync all local content JSON → Supabase (pages, media, hubs, wings,
 * forms, hierarchy, manifest).
 *
 * Usage: node --env-file=.env.local scripts/sync-to-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

const root = process.cwd()
const dataDir = join(root, "data", "wordpress")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / keys in .env.local")
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function readJson(name, base = dataDir) {
  return JSON.parse(readFileSync(join(base, name), "utf8"))
}

function normalizeUrl(u) {
  if (!u) return null
  return String(u)
    .replace(
      /^https?:\/\/localhost(?::\d+)?\/G100\/wp-content\//i,
      "https://www.g100.in/wp-content/"
    )
    .replace(
      /^https?:\/\/127\.0\.0\.1(?::\d+)?\/G100\/wp-content\//i,
      "https://www.g100.in/wp-content/"
    )
    .replace(/^http:\/\/(www\.)?g100\.in\//i, "https://www.g100.in/")
}

function toTs(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

async function upsertBatches(table, rows, batchSize = 100, onConflict = "id") {
  let ok = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).upsert(chunk, { onConflict })
    if (error) {
      console.error(`Failed ${table} batch @${i}:`, error.message)
      throw error
    }
    ok += chunk.length
    process.stdout.write(`\r${table}: ${ok}/${rows.length}`)
  }
  console.log()
}

async function main() {
  console.log("Reading local content exports…")
  const pages = readJson("pages.json")
  const media = readJson("media.json")
  const hubs = readJson("hubs.json")
  const wings = readJson("wings.json")
  const manifest = readJson("manifest.json")
  const forms = existsSync(join(dataDir, "forms.json"))
    ? readJson("forms.json")
    : []
  const hierarchyPath = join(root, "data", "g100-hierarchy.json")
  const hierarchy = existsSync(hierarchyPath)
    ? JSON.parse(readFileSync(hierarchyPath, "utf8"))
    : null

  const pageRows = pages.map((p) => ({
    id: p.id,
    title: p.title || "",
    slug: p.slug || String(p.id),
    url: p.url || null,
    excerpt: p.excerpt || "",
    content_html: p.content_html || "",
    parent: p.parent || 0,
    menu_order: p.menu_order || 0,
    date: toTs(p.date),
    modified: toTs(p.modified),
    role: p.role || "other",
    featured_image:
      normalizeUrl(p.featured_image) ||
      (p.images || []).map(normalizeUrl).find(Boolean) ||
      null,
    images: (p.images || []).map(normalizeUrl).filter(Boolean),
    updated_at: new Date().toISOString(),
  }))

  console.log(`Upserting ${pageRows.length} pages…`)
  await upsertBatches("pages", pageRows, 40)

  // Preserve existing storage_* columns — only upsert source fields
  const mediaRows = media.map((m) => ({
    id: m.id,
    title: m.title || "",
    slug: m.slug || "",
    mime: m.mime || "",
    parent: m.parent || 0,
    url: normalizeUrl(m.url) || m.url,
    file: m.file || "",
    date: toTs(m.date),
  }))

  console.log(`Upserting ${mediaRows.length} media (preserving storage urls)…`)
  await upsertBatches("media", mediaRows, 200)

  const hubRows = Object.entries(hubs).map(([key, page]) => ({
    key,
    page_id: page?.id ?? null,
    title: page?.title ?? null,
    slug: page?.slug ?? null,
  }))
  console.log(`Upserting ${hubRows.length} hubs…`)
  {
    const { error } = await supabase.from("hubs").upsert(hubRows, { onConflict: "key" })
    if (error) throw error
  }

  const wingRows = wings.map((w, i) => ({
    page_id: w.id,
    sort_order: i,
  }))
  console.log(`Upserting ${wingRows.length} wings…`)
  {
    const { error } = await supabase.from("wings").upsert(wingRows, {
      onConflict: "page_id",
    })
    if (error) throw error
  }

  if (forms.length) {
    const formRows = forms.map((f) => ({
      id: Number(f.id) || 0,
      slug: f.slug || String(f.id),
      title: f.title || "",
      kind: f.kind || "cf7",
      fields: f.fields || [],
      updated_at: new Date().toISOString(),
    }))
    // contact form uses id 0 — ok as PK
    console.log(`Upserting ${formRows.length} forms…`)
    await upsertBatches("forms", formRows, 50)
  }

  if (hierarchy) {
    console.log("Upserting site hierarchy…")
    const { error } = await supabase.from("site_content").upsert(
      {
        key: "hierarchy",
        payload: hierarchy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    if (error) throw error
  }

  const { error: manErr } = await supabase.from("site_manifest").upsert(
    {
      id: 1,
      site: manifest.site || "https://www.g100.in",
      database_name: manifest.database || "supabase",
      page_count: pageRows.length,
      media_count: mediaRows.length,
      role_counts: manifest.role_counts || {},
      wings_count: wingRows.length,
      hubs: Object.keys(hubs),
      synced_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  )
  if (manErr) throw manErr

  // Drop pages removed from the latest export
  const keepIds = pageRows.map((p) => p.id)
  console.log("Pruning obsolete pages…")
  {
    const { data: remoteIds, error } = await supabase.from("pages").select("id")
    if (error) throw error
    const keep = new Set(keepIds)
    const obsolete = (remoteIds || []).map((r) => r.id).filter((id) => !keep.has(id))
    if (obsolete.length) {
      // clear wing/hub refs first
      await supabase.from("wings").delete().in("page_id", obsolete)
      await supabase.from("hubs").update({ page_id: null }).in("page_id", obsolete)
      const { error: delErr } = await supabase.from("pages").delete().in("id", obsolete)
      if (delErr) throw delErr
      console.log(`Removed ${obsolete.length} obsolete pages`)
    } else {
      console.log("No obsolete pages")
    }
  }

  console.log("Sync complete.")
  console.log({
    pages: pageRows.length,
    media: mediaRows.length,
    hubs: hubRows.length,
    wings: wingRows.length,
    forms: forms.length,
    hierarchy: Boolean(hierarchy),
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
