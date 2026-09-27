import { getActiveLocale } from './context.js';
import type { SupportedLocale } from './schema.js';

/**
 * Locale-aware formatting.
 *
 * i18n is not only about strings: timestamps, counts, token totals and durations
 * are all data the user reads, and they follow the active locale too. Every
 * helper takes an explicit locale so a component never has to reach for a
 * global, which keeps rendering deterministic under test.
 */

function localeOrActive(locale?: SupportedLocale): SupportedLocale {
  return locale ?? getActiveLocale()
}

const dateTimeCache = new Map<string, Intl.DateTimeFormat>()

function dateTimeFormatter(locale: SupportedLocale): Intl.DateTimeFormat {
  const cached = dateTimeCache.get(locale)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  dateTimeCache.set(locale, formatter)
  return formatter
}

export function formatDateTime(value: number | Date, locale?: SupportedLocale): string {
  const target = localeOrActive(locale)
  return dateTimeFormatter(target).format(value)
}

const dateCache = new Map<string, Intl.DateTimeFormat>()

function dateFormatter(locale: SupportedLocale): Intl.DateTimeFormat {
  const cached = dateCache.get(locale)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  dateCache.set(locale, formatter)
  return formatter
}

export function formatDate(value: number | Date, locale?: SupportedLocale): string {
  return dateFormatter(localeOrActive(locale)).format(value)
}

const timeCache = new Map<string, Intl.DateTimeFormat>()

function timeFormatter(locale: SupportedLocale): Intl.DateTimeFormat {
  const cached = timeCache.get(locale)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short' })
  timeCache.set(locale, formatter)
  return formatter
}

export function formatTime(value: number | Date, locale?: SupportedLocale): string {
  return timeFormatter(localeOrActive(locale)).format(value)
}

const relativeCache = new Map<string, Intl.RelativeTimeFormat>()

function relativeFormatter(locale: SupportedLocale): Intl.RelativeTimeFormat {
  const cached = relativeCache.get(locale)
  if (cached) return cached
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  relativeCache.set(locale, formatter)
  return formatter
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
]

/** "3 minutes ago" / "il y a 3 minutes", chosen by the active locale. */
export function formatRelativeTime(value: number | Date, locale?: SupportedLocale): string {
  const target = localeOrActive(locale)
  const delta = (value instanceof Date ? value.getTime() : value) - Date.now()
  const magnitude = Math.abs(delta)
  for (const [unit, size] of RELATIVE_UNITS) {
    if (magnitude >= size || unit === 'second') {
      return relativeFormatter(target).format(Math.round(delta / size), unit)
    }
  }
  return relativeFormatter(target).format(0, 'second')
}

const numberCache = new Map<string, Intl.NumberFormat>()

function numberFormatter(locale: SupportedLocale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`
  const cached = numberCache.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(locale, options)
  numberCache.set(key, formatter)
  return formatter
}

export function formatNumber(value: number, locale?: SupportedLocale): string {
  return numberFormatter(localeOrActive(locale), {}).format(value)
}

/** Thousands separators, no decimals. Used for token counts. */
export function formatCompactNumber(value: number, locale?: SupportedLocale): string {
  return numberFormatter(localeOrActive(locale), { maximumFractionDigits: 0 }).format(value)
}

export function formatPercent(ratio: number, locale?: SupportedLocale): string {
  return numberFormatter(localeOrActive(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(ratio)
}

/**
 * Durations. The unit labels come from `Intl.NumberFormat` with unit
 * formatting, so "1 min 30 s" and "1 min 30 s" are produced by the platform
 * rather than by a hardcoded table that would need twelve translations.
 */
export function formatDuration(milliseconds: number, locale?: SupportedLocale): string {
  const target = localeOrActive(locale)
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} h`)
  if (minutes > 0) parts.push(`${minutes} min`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} s`)
  return parts.join(' ')
}

/**
 * The ellipsis is typography, not content. It is a shared constant so the
 * renderer decides where truncation happens, never a translator.
 *
 * The ASCII variant exists because some terminals do not render U+2026; the
 * choice is a terminal-capability question, not a locale question.
 */
export const ELLIPSIS = '\u2026'
export const ELLIPSIS_ASCII = '...'

/** Drop cached Intl formatters. Called on locale change and by tests. */
export function clearFormatCaches(): void {
  dateTimeCache.clear()
  dateCache.clear()
  timeCache.clear()
  relativeCache.clear()
  numberCache.clear()
}
