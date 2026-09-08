"use client"

import { useMemo, useState } from "react"
import PhoneInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import "react-phone-number-input/style.css"

import { FieldError } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  DEFAULT_PHONE_COUNTRY,
  findCountryByName,
  findStateByName,
  getCities,
  getCountries,
  getStates,
} from "@/lib/geo"
import { cn } from "@/lib/utils"

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

type PhoneFieldProps = {
  id: string
  name: string
  label: string
  required?: boolean
  placeholder?: string | null
  defaultValue?: string
  value?: string
  error?: string | null
  onValueChange?: (value: string) => void
  onBlurField?: () => void
  className?: string
}

export function PhoneField({
  id,
  name,
  label,
  required = false,
  placeholder,
  defaultValue = "",
  value: controlledValue,
  error,
  onValueChange,
  onBlurField,
  className,
}: PhoneFieldProps) {
  const [uncontrolled, setUncontrolled] = useState<string | undefined>(
    defaultValue || undefined
  )
  const value =
    controlledValue !== undefined
      ? controlledValue || undefined
      : uncontrolled

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div
        className={cn(
          "phone-field flex h-10 w-full items-center rounded-md border bg-background px-2.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
          error
            ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
            : "border-input"
        )}
      >
        <PhoneInput
          id={id}
          international
          countryCallingCodeEditable={false}
          defaultCountry={DEFAULT_PHONE_COUNTRY}
          flags={flags}
          value={value}
          onChange={(next) => {
            const phone = next || ""
            if (controlledValue === undefined) setUncontrolled(next)
            onValueChange?.(phone)
          }}
          onBlur={onBlurField}
          placeholder={placeholder || "Enter mobile number"}
          numberInputProps={{
            className:
              "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            required,
            autoComplete: "tel",
            "aria-invalid": Boolean(error) || undefined,
            "aria-describedby": error ? `${id}-error` : undefined,
          }}
          className="PhoneInput flex w-full items-center gap-2"
        />
      </div>
      <input type="hidden" name={name} value={value || ""} />
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : null}
    </div>
  )
}

type LocationFieldsProps = {
  idPrefix: string
  countryName?: string
  stateName?: string
  cityName?: string
  countryRequired?: boolean
  stateRequired?: boolean
  cityRequired?: boolean
  showState?: boolean
  showCity?: boolean
  defaultCountry?: string
  defaultState?: string
  defaultCity?: string
  countryError?: string | null
  stateError?: string | null
  cityError?: string | null
  onLocationChange?: (next: {
    country: string
    state: string
    city: string
  }) => void
  onBlurField?: (name: "country" | "state" | "city") => void
  className?: string
}

export function LocationFields({
  idPrefix,
  countryName = "country",
  stateName = "state",
  cityName = "city",
  countryRequired = true,
  stateRequired = true,
  cityRequired = true,
  showState = true,
  showCity = true,
  defaultCountry = "",
  defaultState = "",
  defaultCity = "",
  countryError,
  stateError,
  cityError,
  onLocationChange,
  onBlurField,
  className,
}: LocationFieldsProps) {
  const countries = useMemo(() => getCountries(), [])

  const initialCountry = findCountryByName(defaultCountry)
  const [countryIso, setCountryIso] = useState(initialCountry?.isoCode ?? "")
  const [stateIso, setStateIso] = useState(() => {
    if (!initialCountry || !defaultState) return ""
    return findStateByName(initialCountry.isoCode, defaultState)?.isoCode ?? ""
  })
  const [city, setCity] = useState(defaultCity)

  const states = useMemo(() => getStates(countryIso), [countryIso])
  const cities = useMemo(
    () => getCities(countryIso, stateIso),
    [countryIso, stateIso]
  )

  const countryValue =
    countries.find((c) => c.isoCode === countryIso)?.name ?? ""
  const stateValue = states.find((s) => s.isoCode === stateIso)?.name ?? ""

  function emit(
    nextCountry: string,
    nextState: string,
    nextCity: string
  ) {
    onLocationChange?.({
      country: nextCountry,
      state: nextState,
      city: nextCity,
    })
  }

  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor={`${idPrefix}-country`}>
          Country
          {countryRequired ? " *" : ""}
        </Label>
        <select
          id={`${idPrefix}-country`}
          required={countryRequired}
          value={countryIso}
          aria-invalid={Boolean(countryError) || undefined}
          aria-describedby={
            countryError ? `${idPrefix}-country-error` : undefined
          }
          onBlur={() => onBlurField?.("country")}
          onChange={(event) => {
            const iso = event.target.value
            setCountryIso(iso)
            setStateIso("")
            setCity("")
            const name =
              countries.find((c) => c.isoCode === iso)?.name ?? ""
            emit(name, "", "")
          }}
          className={cn(
            selectClass,
            countryError &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
          )}
        >
          <option value="" disabled>
            Select country
          </option>
          {countries.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <input type="hidden" name={countryName} value={countryValue} />
        {countryError ? (
          <FieldError id={`${idPrefix}-country-error`}>{countryError}</FieldError>
        ) : null}
      </div>

      {showState ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-state`}>
            State / Province
            {stateRequired ? " *" : ""}
          </Label>
          <select
            id={`${idPrefix}-state`}
            required={stateRequired && states.length > 0}
            value={stateIso}
            disabled={!countryIso}
            aria-invalid={Boolean(stateError) || undefined}
            aria-describedby={
              stateError ? `${idPrefix}-state-error` : undefined
            }
            onBlur={() => onBlurField?.("state")}
            onChange={(event) => {
              const iso = event.target.value
              setStateIso(iso)
              setCity("")
              const name = states.find((s) => s.isoCode === iso)?.name ?? ""
              emit(countryValue, name, "")
            }}
            className={cn(
              selectClass,
              stateError &&
                "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
            )}
          >
            <option value="" disabled>
              {countryIso ? "Select state" : "Select country first"}
            </option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="hidden" name={stateName} value={stateValue} />
          {stateError ? (
            <FieldError id={`${idPrefix}-state-error`}>{stateError}</FieldError>
          ) : null}
        </div>
      ) : null}

      {showCity ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-city`}>
            City
            {cityRequired ? " *" : ""}
          </Label>
          {cities.length > 0 ? (
            <>
              <select
                id={`${idPrefix}-city`}
                required={cityRequired}
                value={city}
                disabled={!stateIso}
                aria-invalid={Boolean(cityError) || undefined}
                aria-describedby={
                  cityError ? `${idPrefix}-city-error` : undefined
                }
                onBlur={() => onBlurField?.("city")}
                onChange={(event) => {
                  const next = event.target.value
                  setCity(next)
                  emit(countryValue, stateValue, next)
                }}
                className={cn(
                  selectClass,
                  cityError &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                )}
              >
                <option value="" disabled>
                  {stateIso ? "Select city" : "Select state first"}
                </option>
                {cities.map((c) => (
                  <option key={`${c.name}-${c.stateCode}`} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name={cityName} value={city} />
            </>
          ) : (
            <input
              id={`${idPrefix}-city`}
              name={cityName}
              required={cityRequired && Boolean(stateIso)}
              disabled={!stateIso}
              value={city}
              aria-invalid={Boolean(cityError) || undefined}
              aria-describedby={
                cityError ? `${idPrefix}-city-error` : undefined
              }
              onBlur={() => onBlurField?.("city")}
              onChange={(event) => {
                const next = event.target.value
                setCity(next)
                emit(countryValue, stateValue, next)
              }}
              placeholder={stateIso ? "Enter city" : "Select state first"}
              className={cn(
                selectClass,
                cityError &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
              )}
              autoComplete="address-level2"
            />
          )}
          {cityError ? (
            <FieldError id={`${idPrefix}-city-error`}>{cityError}</FieldError>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
