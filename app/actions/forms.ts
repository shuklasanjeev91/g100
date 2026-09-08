"use server"

import { getFormBySlug } from "@/lib/forms"
import { getFieldKind } from "@/lib/form-fields"
import { normalizePhone } from "@/lib/geo"
import { validateFormValues } from "@/lib/form-validation"
import { createSubmission } from "@/lib/submissions"

export type SubmitFormState = {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string>
}

export async function submitSiteForm(
  _prev: SubmitFormState,
  formData: FormData
): Promise<SubmitFormState> {
  const formSlug = String(formData.get("_formSlug") || "")
  const form = getFormBySlug(formSlug)
  if (!form) {
    return { ok: false, message: "Unknown form." }
  }

  const values: Record<string, string> = {}
  for (const field of form.fields) {
    const kind = getFieldKind(field)
    const raw = formData.get(field.name)
    let value = typeof raw === "string" ? raw.trim() : ""
    if (kind === "phone" && value) value = normalizePhone(value)
    values[field.name] = value
  }

  const fieldErrors = validateFormValues(form.fields, values)
  if (Object.keys(fieldErrors).length) {
    const first = Object.values(fieldErrors)[0]
    return {
      ok: false,
      message: first || "Please fix the highlighted fields.",
      fieldErrors,
    }
  }

  await createSubmission({
    formSlug: form.slug,
    formTitle: form.title,
    values,
  })

  return {
    ok: true,
    message: "Thank you — your submission was saved. We will follow up soon.",
  }
}
