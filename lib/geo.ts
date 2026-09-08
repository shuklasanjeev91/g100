import { City, Country, State } from "country-state-city"
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js"

export type GeoCountry = {
  isoCode: string
  name: string
  phonecode: string
  flag: string
}

export type GeoState = {
  isoCode: string
  name: string
  countryCode: string
}

export type GeoCity = {
  name: string
  stateCode: string
  countryCode: string
}

export function getCountries(): GeoCountry[] {
  return Country.getAllCountries()
    .map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      phonecode: c.phonecode,
      flag: c.flag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getStates(countryIso: string): GeoState[] {
  if (!countryIso) return []
  return State.getStatesOfCountry(countryIso)
    .map((s) => ({
      isoCode: s.isoCode,
      name: s.name,
      countryCode: s.countryCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getCities(countryIso: string, stateIso: string): GeoCity[] {
  if (!countryIso || !stateIso) return []
  return City.getCitiesOfState(countryIso, stateIso)
    .map((c) => ({
      name: c.name,
      stateCode: c.stateCode,
      countryCode: c.countryCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function findCountryByName(name: string) {
  const needle = name.trim().toLowerCase()
  if (!needle) return undefined
  return Country.getAllCountries().find(
    (c) =>
      c.name.toLowerCase() === needle || c.isoCode.toLowerCase() === needle
  )
}

export function findStateByName(countryIso: string, name: string) {
  const needle = name.trim().toLowerCase()
  if (!countryIso || !needle) return undefined
  return State.getStatesOfCountry(countryIso).find(
    (s) =>
      s.name.toLowerCase() === needle || s.isoCode.toLowerCase() === needle
  )
}

export function isKnownCountry(name: string) {
  return Boolean(findCountryByName(name))
}

export function isKnownState(countryName: string, stateName: string) {
  const country = findCountryByName(countryName)
  if (!country) return false
  const states = State.getStatesOfCountry(country.isoCode)
  if (!states.length) return true
  if (!stateName.trim()) return false
  return Boolean(findStateByName(country.isoCode, stateName))
}

export function isKnownCity(
  countryName: string,
  stateName: string,
  cityName: string
) {
  const country = findCountryByName(countryName)
  if (!country) return false
  const state = findStateByName(country.isoCode, stateName)
  if (!state) {
    // Country has no states in dataset — accept free-text city
    return State.getStatesOfCountry(country.isoCode).length === 0
      ? Boolean(cityName.trim())
      : false
  }
  const needle = cityName.trim().toLowerCase()
  if (!needle) return false
  const cities = City.getCitiesOfState(country.isoCode, state.isoCode)
  if (!cities.length) return true
  return cities.some((c) => c.name.toLowerCase() === needle)
}

/** Normalize to E.164 when possible; otherwise return trimmed input. */
export function normalizePhone(value: string, defaultCountry = "IN"): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as never)
  return parsed?.number ?? trimmed
}

export function isValidMobile(value: string, defaultCountry = "IN"): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    return isValidPhoneNumber(trimmed) || isValidPhoneNumber(trimmed, defaultCountry as never)
  } catch {
    return false
  }
}

/** Default dial country for G100 (India-based network). */
export const DEFAULT_PHONE_COUNTRY = "IN" as const
