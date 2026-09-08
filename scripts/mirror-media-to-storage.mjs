/**
 * Mirror remote g100.in images into Supabase Storage for faster CDN delivery.
 * Prioritizes featured images + first gallery image per page.
 *
 * Usage: node --env-file=.env.local scripts/mirror-media-to-storage.mjs [--limit=200]
 */
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error("Missing Supabase env")
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 300

function extFromUrl(u, mime) {
  const path = u.split("?")[0]
  const m = path.match(/\.([a-zA-Z0-9]+)$/)
  if (m) return m[1].toLowerCase()
  if (mime?.includes("png")) return "png"
  if (mime?.includes("webp")) return "webp"
  if (mime?.includes("gif")) return "gif"
  if (mime?.includes("svg")) return "svg"
  return "jpg"
}

async function mirrorOne(row) {
  if (row.storage_url) return "skip"
  const source = row.url
  if (!source?.startsWith("http")) return "skip"

  const res = await fetch(source)
  if (!res.ok) return "fail-fetch"
  const buf = Buffer.from(await res.arrayBuffer())
  const hash = createHash("sha1").update(source).digest("hex").slice(0, 16)
  const ext = extFromUrl(source, row.mime)
  const path = `originals/${row.id}-${hash}.${ext}`

  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, buf, {
      contentType: row.mime || "image/jpeg",
      upsert: true,
    })
  if (upErr) {
    console.error("upload", row.id, upErr.message)
    return "fail-upload"
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path)
  const { error: dbErr } = await supabase
    .from("media")
    .update({ storage_path: path, storage_url: data.publicUrl })
    .eq("id", row.id)
  if (dbErr) {
    console.error("db", row.id, dbErr.message)
    return "fail-db"
  }
  return "ok"
}

async function main() {
  const { data: pages, error } = await supabase
    .from("pages")
    .select("featured_image, images")
    .limit(5000)
  if (error) throw error

  const wanted = new Set()
  for (const p of pages || []) {
    if (p.featured_image) wanted.add(p.featured_image)
    for (const img of (p.images || []).slice(0, 1)) wanted.add(img)
  }

  const urls = [...wanted].filter(Boolean).slice(0, LIMIT)
  console.log(`Mirroring up to ${urls.length} priority images…`)

  let ok = 0
  let fail = 0
  for (const imageUrl of urls) {
    const { data: rows } = await supabase
      .from("media")
      .select("id, url, mime, storage_url")
      .eq("url", imageUrl)
      .limit(1)
    const row = rows?.[0]
    if (!row) {
      // Insert a synthetic media row for page images not in media table
      continue
    }
    const status = await mirrorOne(row)
    if (status === "ok") ok += 1
    else if (status.startsWith("fail")) fail += 1
    process.stdout.write(`\rok=${ok} fail=${fail}`)
  }
  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
