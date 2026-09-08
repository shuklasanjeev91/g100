import { NextResponse } from "next/server"

import { getFormBySlug } from "@/lib/forms"
import { getFieldKind } from "@/lib/form-fields"
import { normalizePhone } from "@/lib/geo"
import { validateFormValues } from "@/lib/form-validation"
import { createSubmission, listSubmissions } from "@/lib/submissions"

export async function GET() {
  return NextResponse.json({ submissions: await listSubmissions() })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    formSlug?: string
    values?: Record<string, string>
  }
  const formSlug = body.formSlug || ""
  const form = getFormBySlug(formSlug)
  if (!form) {
    return NextResponse.json({ error: "Unknown form" }, { status: 400 })
  }

  const incoming = body.values || {}
  const values: Record<string, string> = {}

  for (const field of form.fields) {
    const kind = getFieldKind(field)
    let value = String(incoming[field.name] || "").trim()
    if (kind === "phone" && value) value = normalizePhone(value)
    values[field.name] = value
  }

  const fieldErrors = validateFormValues(form.fields, values)
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      {
        error: Object.values(fieldErrors)[0] || "Validation failed",
        fieldErrors,
      },
      { status: 400 }
    )
  }

  const row = await createSubmission({
    formSlug: form.slug,
    formTitle: form.title,
    values,
  })

  return NextResponse.json({ ok: true, submission: row }, { status: 201 })
}
