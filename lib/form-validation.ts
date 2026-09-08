import {
  getFieldKind,
  type FormField,
  type FormFieldKind,
} from "@/lib/form-fields"
import {
  isKnownCity,
  isKnownCountry,
  isKnownState,
  isValidMobile,
  normalizePhone,
} from "@/lib/geo"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const URL_RE =
  /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i

export type FieldErrors = Record<string, string>

function labelOf(field: FormField) {
  return field.label || field.placeholder || field.name
}

export function validateFieldValue(
  field: FormField,
  rawValue: string,
  ctx: { country?: string; state?: string } = {}
): string | null {
  const kind = getFieldKind(field)
  const label = labelOf(field)
  let value = rawValue.trim()

  if (kind === "phone" && value) {
    value = normalizePhone(value)
  }

  if (field.required && !value) {
    return `Please fill in ${label}.`
  }

  if (!value) return null

  switch (kind) {
    case "email":
      if (!EMAIL_RE.test(value)) {
        return "Please enter a valid email address."
      }
      break
    case "url":
      if (!URL_RE.test(value)) {
        return "Please enter a valid website or LinkedIn URL."
      }
      break
    case "phone":
      if (!isValidMobile(value)) {
        return "Please enter a valid mobile number with country code."
      }
      break
    case "country":
      if (!isKnownCountry(value)) {
        return "Please select a valid country."
      }
      break
    case "state":
      if (ctx.country && !isKnownState(ctx.country, value)) {
        return "Please select a valid state / province."
      }
      break
    case "city":
      if (
        ctx.country &&
        ctx.state &&
        !isKnownCity(ctx.country, ctx.state, value)
      ) {
        return "Please select a valid city."
      }
      break
    case "textarea":
      if (field.required && value.length < 10) {
        return `${label} should be at least 10 characters.`
      }
      break
    case "text":
      if (field.required && value.length < 2) {
        return `${label} should be at least 2 characters.`
      }
      break
    default:
      break
  }

  return null
}

export function validateFormValues(
  fields: FormField[],
  values: Record<string, string>
): FieldErrors {
  const errors: FieldErrors = {}
  const countryField = fields.find((f) => getFieldKind(f) === "country")
  const stateField = fields.find((f) => getFieldKind(f) === "state")
  const country = countryField ? values[countryField.name] || "" : ""
  const state = stateField ? values[stateField.name] || "" : ""

  for (const field of fields) {
    const kind = getFieldKind(field)
    if (kind === "hidden") continue
    const message = validateFieldValue(field, values[field.name] || "", {
      country,
      state,
    })
    if (message) errors[field.name] = message
  }

  return errors
}

export function isFormValid(
  fields: FormField[],
  values: Record<string, string>
) {
  return Object.keys(validateFormValues(fields, values)).length === 0
}

export function emptyValuesForFields(fields: FormField[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    values[field.name] = ""
  }
  return values
}

export function kindNeedsLiveCheck(kind: FormFieldKind) {
  return (
    kind === "email" ||
    kind === "url" ||
    kind === "phone" ||
    kind === "country" ||
    kind === "state" ||
    kind === "city" ||
    kind === "text" ||
    kind === "textarea" ||
    kind === "select"
  )
}
