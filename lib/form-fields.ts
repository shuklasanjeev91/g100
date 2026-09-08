export type FormFieldKind =
  | "text"
  | "email"
  | "url"
  | "phone"
  | "country"
  | "state"
  | "city"
  | "select"
  | "textarea"
  | "hidden"

export type FormField = {
  type: string
  name: string
  required: boolean
  placeholder: string | null
  options: string[]
  label: string | null
  /** Normalized semantic kind used by SiteForm controls */
  kind?: FormFieldKind
}

export type SiteForm = {
  id: number
  title: string
  slug: string
  kind: string
  fields: FormField[]
}

function blob(field: FormField) {
  return `${field.name} ${field.label || ""} ${field.placeholder || ""}`.toLowerCase()
}

export function inferFieldKind(field: FormField): FormFieldKind {
  if (field.kind) return field.kind
  const text = blob(field)
  if (field.type === "email" || text.includes("email")) return "email"
  if (field.type === "url" || /website|linkedin|url/.test(text)) return "url"
  if (
    field.type === "tel" ||
    field.type === "phone" ||
    /mobile|phone|whatsapp|\btel\b/.test(text) ||
    (field.type === "number" && /mobile|phone|number/.test(text))
  ) {
    return "phone"
  }
  if (
    /^country$|country\b/.test(text) &&
    !/country club|country partner/.test(text)
  ) {
    return "country"
  }
  if (/\bstate\b|province|region/.test(text)) return "state"
  if (/\bcity\b|town/.test(text)) return "city"
  if (field.type === "textarea") return "textarea"
  if (field.type === "select") return "select"
  if (field.type === "hidden") return "hidden"
  return "text"
}

export function getFieldKind(field: FormField): FormFieldKind {
  return field.kind || inferFieldKind(field)
}

export function makeField(
  partial: Omit<FormField, "options" | "placeholder"> &
    Partial<Pick<FormField, "options" | "placeholder">>
): FormField {
  return {
    options: [],
    placeholder: null,
    ...partial,
  }
}

/** Ensure join/signup forms expose phone + cascading location fields. */
export function enrichFormFields(form: SiteForm): FormField[] {
  const needsLocation = [
    "join-country-club",
    "sign-up-denim-club",
    "sign-up",
    "contact",
  ].includes(form.slug)

  const mapped = form.fields.map((field) => {
    const kind = inferFieldKind(field)
    return {
      ...field,
      kind,
      options: kind === "country" || kind === "state" ? [] : field.options,
    }
  })

  if (!needsLocation) return mapped

  const hasPhone = mapped.some((f) => f.kind === "phone")
  const hasCountry = mapped.some((f) => f.kind === "country")
  const hasState = mapped.some((f) => f.kind === "state")
  const hasCity = mapped.some((f) => f.kind === "city")
  const requiredGeo = form.slug !== "contact"

  const extras: FormField[] = []
  if (!hasPhone && form.slug !== "contact") {
    extras.push(
      makeField({
        type: "tel",
        name: "mobile",
        required: true,
        label: "Mobile Number",
        kind: "phone",
      })
    )
  }
  if (!hasCountry) {
    extras.push(
      makeField({
        type: "select",
        name: "country",
        required: requiredGeo,
        label: "Country",
        kind: "country",
      })
    )
  }
  if (!hasState) {
    extras.push(
      makeField({
        type: "select",
        name: "state",
        required: requiredGeo,
        label: "State / Province",
        kind: "state",
      })
    )
  }
  if (!hasCity) {
    extras.push(
      makeField({
        type: "select",
        name: "city",
        required: requiredGeo,
        label: "City",
        kind: "city",
      })
    )
  }

  if (!extras.length) return mapped

  const insertAt = (() => {
    const emailIdx = mapped.findIndex((f) => f.kind === "email")
    const phoneIdx = mapped.findIndex((f) => f.kind === "phone")
    const countryIdx = mapped.findIndex((f) => f.kind === "country")
    if (countryIdx >= 0) return countryIdx + 1
    if (phoneIdx >= 0) return phoneIdx + 1
    if (emailIdx >= 0) return emailIdx + 1
    return mapped.length
  })()

  const next: FormField[] = [...mapped]
  next.splice(insertAt, 0, ...extras)
  return next
}
