import { readFileSync } from "fs"
import { join } from "path"
import { cache } from "react"

import {
  enrichFormFields,
  type FormField,
  type FormFieldKind,
  type SiteForm,
} from "@/lib/form-fields"
import { getSupabaseCache, isSupabaseDataReady } from "@/lib/supabase/hydrate"

export type { FormField, FormFieldKind, SiteForm }
export { getFieldKind, inferFieldKind } from "@/lib/form-fields"

const DATA_DIR = join(process.cwd(), "data", "wordpress")

function readLocalForms(): SiteForm[] {
  const raw = JSON.parse(
    readFileSync(join(DATA_DIR, "forms.json"), "utf8")
  ) as SiteForm[]
  return raw
}

export const getForms = cache((): SiteForm[] => {
  let raw: SiteForm[] = []
  if (isSupabaseDataReady()) {
    const remote = getSupabaseCache().forms
    if (remote.length) raw = remote
  }
  if (!raw.length) raw = readLocalForms()

  return raw.map((form) => ({
    ...form,
    fields: enrichFormFields(form),
  }))
})

export function getFormBySlug(slug: string): SiteForm | undefined {
  return getForms().find((form) => form.slug === slug)
}
