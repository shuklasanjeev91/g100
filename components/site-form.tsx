"use client"

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"

import { submitSiteForm, type SubmitFormState } from "@/app/actions/forms"
import {
  LocationFields,
  PhoneField,
} from "@/components/form-geo-fields"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getFieldKind,
  type FormField,
  type SiteForm as SiteFormDef,
} from "@/lib/form-fields"
import {
  emptyValuesForFields,
  validateFormValues,
} from "@/lib/form-validation"
import { cn } from "@/lib/utils"

type SiteFormProps = {
  form: SiteFormDef
  submitLabel?: string
  className?: string
}

const initialState: SubmitFormState = { ok: false, message: "" }

const controlClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

function fieldLabel(field: FormField) {
  return field.label || field.placeholder || field.name
}

function errorControlClass(hasError: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
    : undefined
}

export function SiteForm({
  form,
  submitLabel = "Submit",
  className,
}: SiteFormProps) {
  const [state, formAction, pending] = useActionState(
    submitSiteForm,
    initialState
  )
  const formRef = useRef<HTMLFormElement>(null)
  const lastMessage = useRef("")

  const fields = form.fields
  const [values, setValues] = useState(() => emptyValuesForFields(fields))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [attempted, setAttempted] = useState(false)

  const countryField = fields.find((f) => getFieldKind(f) === "country")
  const stateField = fields.find((f) => getFieldKind(f) === "state")
  const cityField = fields.find((f) => getFieldKind(f) === "city")
  const locationKinds = new Set(["country", "state", "city"])

  const errors = useMemo(
    () => validateFormValues(fields, values),
    [fields, values]
  )

  const anyInteracted = attempted || Object.values(touched).some(Boolean)

  function visibleError(name: string) {
    const message = errors[name]
    if (!message) return null
    // After first interaction or submit, show every invalid field live
    if (anyInteracted || (values[name] || "").trim().length > 0) {
      return message
    }
    return null
  }

  const hasBlockingErrors = Object.keys(errors).length > 0

  useEffect(() => {
    if (!state.message || state.message === lastMessage.current) return
    lastMessage.current = state.message
    if (state.ok) {
      toast.success(state.message)
      formRef.current?.reset()
      setValues(emptyValuesForFields(fields))
      setTouched({})
      setAttempted(false)
    } else {
      toast.error(state.message)
      flushSync(() => {
        setAttempted(true)
        if (state.fieldErrors) {
          setTouched((prev) => {
            const next = { ...prev }
            for (const name of Object.keys(state.fieldErrors || {})) {
              next[name] = true
            }
            return next
          })
        }
      })
    }
  }, [state, fields])

  function setFieldValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  function markTouched(name: string) {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  function markAllTouched() {
    setTouched(() => {
      const next: Record<string, boolean> = {}
      for (const field of fields) next[field.name] = true
      return next
    })
  }

  function blockIfInvalid(): boolean {
    const nextErrors = validateFormValues(fields, values)
    if (!Object.keys(nextErrors).length) return false

    flushSync(() => {
      setAttempted(true)
      markAllTouched()
    })

    const first = Object.keys(nextErrors)[0]
    const el =
      formRef.current?.querySelector<HTMLElement>(
        `#${CSS.escape(`${form.slug}-${first}`)}`
      ) ||
      formRef.current?.querySelector<HTMLElement>(
        `[name="${CSS.escape(first)}"]`
      )
    el?.focus?.()
    toast.error(nextErrors[first] || "Please fix the highlighted fields.")
    return true
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (blockIfInvalid()) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function clientAction(formData: FormData) {
    if (blockIfInvalid()) return
    formAction(formData)
  }

  let locationRendered = false

  return (
    <form
      ref={formRef}
      action={clientAction}
      onSubmit={onSubmit}
      className={cn(
        "space-y-5 border border-border bg-card p-7 shadow-[0_1px_0_0_oklch(0.72_0.11_80/0.12)] md:p-9",
        className
      )}
      noValidate
    >
      <input type="hidden" name="_formSlug" value={form.slug} />

      {fields.map((field) => {
        const id = `${form.slug}-${field.name}`
        const label = fieldLabel(field)
        const kind = getFieldKind(field)
        const error = visibleError(field.name)

        if (locationKinds.has(kind)) {
          if (locationRendered) return null
          if (!countryField && !stateField && !cityField) return null
          locationRendered = true
          return (
            <LocationFields
              key="location-fields"
              idPrefix={form.slug}
              countryName={countryField?.name || "country"}
              stateName={stateField?.name || "state"}
              cityName={cityField?.name || "city"}
              countryRequired={countryField?.required ?? false}
              stateRequired={stateField?.required ?? false}
              cityRequired={cityField?.required ?? false}
              showState={Boolean(stateField)}
              showCity={Boolean(cityField)}
              countryError={
                countryField ? visibleError(countryField.name) : null
              }
              stateError={stateField ? visibleError(stateField.name) : null}
              cityError={cityField ? visibleError(cityField.name) : null}
              onLocationChange={({ country, state, city }) => {
                setValues((prev) => {
                  const next = { ...prev }
                  if (countryField) next[countryField.name] = country
                  if (stateField) next[stateField.name] = state
                  if (cityField) next[cityField.name] = city
                  return next
                })
                setTouched((prev) => {
                  const next = { ...prev }
                  if (countryField) next[countryField.name] = true
                  if (stateField) next[stateField.name] = true
                  if (cityField) next[cityField.name] = true
                  return next
                })
              }}
              onBlurField={(which) => {
                const target =
                  which === "country"
                    ? countryField?.name
                    : which === "state"
                      ? stateField?.name
                      : cityField?.name
                if (target) markTouched(target)
              }}
            />
          )
        }

        if (kind === "phone") {
          return (
            <PhoneField
              key={field.name}
              id={id}
              name={field.name}
              label={label}
              required={field.required}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              error={error}
              onValueChange={(value) => setFieldValue(field.name, value)}
              onBlurField={() => markTouched(field.name)}
            />
          )
        }

        if (kind === "select") {
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>
                {label}
                {field.required ? " *" : ""}
              </Label>
              <select
                id={id}
                name={field.name}
                required={field.required}
                value={values[field.name] || ""}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onBlur={() => markTouched(field.name)}
                onChange={(event) =>
                  setFieldValue(field.name, event.target.value)
                }
                className={cn(controlClass, errorControlClass(Boolean(error)))}
              >
                <option value="" disabled>
                  {field.placeholder || `Select ${label}`}
                </option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {error ? (
                <FieldError id={`${id}-error`}>{error}</FieldError>
              ) : null}
            </div>
          )
        }

        if (kind === "textarea") {
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>
                {label}
                {field.required ? " *" : ""}
              </Label>
              <Textarea
                id={id}
                name={field.name}
                required={field.required}
                placeholder={field.placeholder ?? undefined}
                rows={5}
                value={values[field.name] || ""}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onBlur={() => markTouched(field.name)}
                onChange={(event) =>
                  setFieldValue(field.name, event.target.value)
                }
                className={errorControlClass(Boolean(error))}
              />
              {error ? (
                <FieldError id={`${id}-error`}>{error}</FieldError>
              ) : null}
            </div>
          )
        }

        const inputType =
          kind === "email" || kind === "url" ? kind : "text"

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={id}>
              {label}
              {field.required ? " *" : ""}
            </Label>
            <Input
              id={id}
              name={field.name}
              type={inputType}
              required={field.required}
              placeholder={field.placeholder ?? undefined}
              value={values[field.name] || ""}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onBlur={() => markTouched(field.name)}
              onChange={(event) =>
                setFieldValue(field.name, event.target.value)
              }
              className={errorControlClass(Boolean(error))}
            />
            {error ? (
              <FieldError id={`${id}-error`}>{error}</FieldError>
            ) : null}
          </div>
        )
      })}

      {attempted && hasBlockingErrors ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          Please fix the highlighted fields before submitting.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg" variant="brand">
        {pending ? "Sending…" : submitLabel}
      </Button>
    </form>
  )
}
