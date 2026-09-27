import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from './schema.js';

/**
 * Environment variable names, in precedence order. Each rank is deliberate:
 * an explicit process/CLI override beats user config, which beats the
 * environment, which beats the OS default.
 */
export const LOCALE_ENV_VARS = [
  'MCODE_LOCALE',
  'MAVIS_ELECTRON_LOCALE',
  'LC_ALL',
  'LC_MESSAGES',
  'LANG',
] as const

/**
 * Conservative BCP 47 lookup table.
 *
 * Entries are explicit rather than derived from a `startsWith` match so that
 * neighbouring variants never get silently folded together. Two families are
 * deliberately NOT auto-converted:
 *
 *   zh-TW / zh-HK / zh-MO / zh-Hant  -> no zh-Hant catalog exists, so these fall
 *                                      back to English rather than being served
 *                                      simplified Chinese a reader in Taipei
 *                                      does not naturally read.
 *   pt-PT / pt                       -> only pt-BR is supported, so these fall
 *                                      back to English rather than being served
 *                                      Brazilian Portuguese.
 */
const LOCALE_ALIASES: Readonly<Record<string, SupportedLocale>> = {
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',

  fr: 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'fr-BE': 'fr',
  'fr-CH': 'fr',
  'fr-LU': 'fr',

  es: 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  'es-CL': 'es',
  'es-CO': 'es',
  'es-PE': 'es',

  de: 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  'de-LI': 'de',

  it: 'it',
  'it-IT': 'it',
  'it-CH': 'it',

  nl: 'nl',
  'nl-NL': 'nl',
  'nl-BE': 'nl',

  pl: 'pl',
  'pl-PL': 'pl',

  ru: 'ru',
  'ru-RU': 'ru',

  ja: 'ja',
  'ja-JP': 'ja',

  ko: 'ko',
  'ko-KR': 'ko',

  // Portuguese: only the Brazilian variant is a product locale.
  'pt-BR': 'pt-BR',

  // Simplified Chinese only.
  'zh-Hans': 'zh-Hans',
  'zh-CN': 'zh-Hans',
  'zh-SG': 'zh-Hans',
}

/** Language subtags that resolve to a specific regional variant rather than to the bare language. */
const LANGUAGE_TO_LOCALE: Readonly<Record<string, SupportedLocale>> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  de: 'de',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  ru: 'ru',
  ja: 'ja',
  ko: 'ko',
  pt: 'pt-BR',
  zh: 'zh-Hans',
}

/**
 * Explicit deny for Portuguese region subtags. Checked before the language
 * fallback so `pt-PT` never inherits the generic `pt` -> `pt-BR` mapping.
 *
 * Only `pt-BR` is a product locale. The bare language tag `pt` follows the
 * product decision to default to Brazilian Portuguese, but an explicit European
 * region must not be silently served Brazilian text: `pt-PT` falls back to
 * English so the user picks a supported variant deliberately.
 */
const NON_BRAZILIAN_PORTUGUESE = new Set(['pt-pt'])

/**
 * Traditional-Chinese subtags that must NOT be routed to simplified Chinese.
 * Present as an explicit deny list so the intent survives future edits.
 */
const TRADITIONAL_CHINESE = new Set(['hant', 'tw', 'hk', 'mo'])

/** Canonicalise a tag with the platform, then walk specificity: full tag, language+script, language. */
export function negotiateLocale(input: string | null | undefined): SupportedLocale {
  if (typeof input !== 'string') return DEFAULT_LOCALE
  const trimmed = input.trim().replace(/_/gu, '-')
  if (trimmed.length === 0) return DEFAULT_LOCALE

  let canonical = trimmed
  try {
    canonical = new Intl.Locale(trimmed).toString()
  } catch {
    // Not a well-formed tag. Fall through to the manual walk, which tolerates
    // slightly malformed input instead of throwing.
    canonical = trimmed
  }

  const direct = LOCALE_ALIASES[canonical]
  if (direct) return direct

  let language: string | undefined
  let script: string | undefined
  try {
    const locale = new Intl.Locale(canonical)
    language = locale.language.toLowerCase()
    script = locale.script
  } catch {
    const parts = canonical.split('-')
    language = parts[0]?.toLowerCase()
    script = parts.find((part) => /^[a-z]{4}$/i.test(part))?.toLowerCase()
  }

  if (!language) return DEFAULT_LOCALE

  if (language === 'pt') {
    if (NON_BRAZILIAN_PORTUGUESE.has(canonical.toLowerCase())) return DEFAULT_LOCALE
    return 'pt-BR'
  }

  // zh-Hant and its region siblings stay out of simplified Chinese on purpose.
  if (language === 'zh') {
    if (script && TRADITIONAL_CHINESE.has(script.toLowerCase())) return DEFAULT_LOCALE
    const region = canonical.split('-')[1]?.toLowerCase()
    if (region && TRADITIONAL_CHINESE.has(region)) return DEFAULT_LOCALE
    return 'zh-Hans'
  }

  return LANGUAGE_TO_LOCALE[language] ?? DEFAULT_LOCALE
}

/** `true` when the tag is one this build can actually serve. */
export function isKnownLocale(input: string | null | undefined): boolean {
  if (typeof input !== 'string' || input.trim().length === 0) return false
  try {
    return isSupportedLocale(new Intl.Locale(input.trim().replace(/_/gu, '-')).toString())
  } catch {
    return false
  }
}

/** The OS-reported locale, used as the last non-explicit source. */
export function systemLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || null
  } catch {
    return null
  }
}

export interface LocaleSources {
  /** Rank 1: explicit override from the process or CLI caller. */
  readonly override?: string | null
  /** Rank 2: `tui.locale` from the user configuration. */
  readonly configPreference?: string | null
  /** Rank 6-8: environment, for tests and embedders. */
  readonly env?: Readonly<Record<string, string | undefined>>
}

/**
 * Resolve the effective locale. Each rank is skipped when absent or when the
 * supplied value cannot be negotiated, so a typo silently falls through instead
 * of blanking the interface.
 */
export function resolveLocale(sources: LocaleSources = {}): SupportedLocale {
  const { override, configPreference, env = process.env } = sources

  if (typeof override === 'string' && override.trim().length > 0) {
    return negotiateLocale(override)
  }

  if (isSupportedLocale(configPreference)) return configPreference
  if (typeof configPreference === 'string' && configPreference.trim().length > 0) {
    return negotiateLocale(configPreference)
  }

  for (const name of LOCALE_ENV_VARS) {
    const value = env[name]
    if (typeof value !== 'string') continue
    // POSIX locales look like `fr_FR.UTF-8`; the encoding and modifier suffixes
    // are not part of the language tag.
    const normalized = value.split('.')[0]?.split('@')[0]
    if (!normalized || normalized.trim().length === 0) continue
    if (normalized === 'C' || normalized === 'POSIX') continue
    const resolved = negotiateLocale(normalized)
    if (resolved !== DEFAULT_LOCALE) return resolved
  }

  return negotiateLocale(systemLocale())
}
