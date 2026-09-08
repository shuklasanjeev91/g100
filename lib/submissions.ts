import { randomUUID } from "crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

import { createClient } from "@supabase/supabase-js"

export type Submission = {
  id: string
  formSlug: string
  formTitle: string
  values: Record<string, string>
  createdAt: string
  userAgent?: string
}

const DATA_DIR = join(process.cwd(), "data", "app")
const STORE = join(DATA_DIR, "submissions.json")

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(STORE)) writeFileSync(STORE, "[]\n", "utf8")
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function listSubmissions(): Promise<Submission[]> {
  const client = supabase()
  if (client) {
    const { data, error } = await client
      .from("submissions")
      .select("id,form_slug,form_title,payload,created_at")
      .order("created_at", { ascending: false })
      .limit(200)
    if (!error && data) {
      return data.map((row) => ({
        id: row.id,
        formSlug: row.form_slug,
        formTitle: row.form_title || "",
        values: (row.payload as Record<string, string>) || {},
        createdAt: row.created_at,
      }))
    }
  }

  ensureStore()
  return JSON.parse(readFileSync(STORE, "utf8")) as Submission[]
}

export async function createSubmission(
  input: Omit<Submission, "id" | "createdAt">
): Promise<Submission> {
  const row: Submission = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  }

  const client = supabase()
  if (client) {
    const { error } = await client.from("submissions").insert({
      id: row.id,
      form_slug: row.formSlug,
      form_title: row.formTitle,
      payload: row.values,
      created_at: row.createdAt,
    })
    if (!error) return row
    console.error("[g100] Supabase submission insert failed", error.message)
  }

  ensureStore()
  const rows = JSON.parse(readFileSync(STORE, "utf8")) as Submission[]
  rows.unshift(row)
  writeFileSync(STORE, JSON.stringify(rows, null, 2) + "\n", "utf8")
  return row
}
