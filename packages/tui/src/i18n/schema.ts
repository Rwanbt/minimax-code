/**
 * Message model and locale types for the TUI/CLI i18n domain.
 *
 * The English catalog is the semantic source of truth: it declares which keys
 * exist and, for each key, whether the message is a plain string or a plural.
 * Every other locale mirrors that shape. The compiler, not a runtime check, is
 * what guarantees a `complete` locale covers every key.
 */

/** CLDR plural categories. Which ones a locale needs comes from Intl.PluralRules, never from a hardcoded list. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

export type PlainMessage = string

export interface PluralMessage {
  plural: {
    other: string
    zero?: string
    one?: string
    two?: string
    few?: string
    many?: string
  }
}

export type Message = PlainMessage | PluralMessage

/** BCP 47 tags shipped with the product. `en` is the fallback for every unknown tag. */
export type SupportedLocale =
  | 'en'
  | 'zh-Hans'
  | 'fr'
  | 'es'
  | 'de'
  | 'pt-BR'
  | 'it'
  | 'nl'
  | 'pl'
  | 'ru'
  | 'ja'
  | 'ko'

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'en',
  'zh-Hans',
  'fr',
  'es',
  'de',
  'pt-BR',
  'it',
  'nl',
  'pl',
  'ru',
  'ja',
  'ko',
]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

/**
 * `system` is a user preference meaning "follow the environment", not a locale.
 * Only `complete` locales may be exposed to users; `draft` ones are dev-only.
 */
export type LocalePreference = 'system' | SupportedLocale

export type LocaleStatus = 'draft' | 'complete'

export type Catalog = Readonly<Record<string, Message>>

export type PartialCatalog = Readonly<Record<string, Message>>

export interface LocaleEntry {
  readonly status: LocaleStatus
  readonly catalog: Catalog
}

export function isPlainMessage(message: Message): message is PlainMessage {
  return typeof message === 'string'
}

export function isPluralMessage(message: Message): message is PluralMessage {
  return typeof message === 'object' && message !== null && 'plural' in message
}

/**
 * Categories a locale actually needs. Derived from the platform's own CLDR data
 * so Polish (4 forms) and Russian (3 forms) work without a hardcoded table.
 */
export function requiredPluralCategories(locale: SupportedLocale): readonly PluralCategory[] {
  try {
    return new Intl.PluralRules(locale).resolvedOptions().pluralCategories
  } catch {
    return ['other']
  }
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Control and bidi characters that must never appear in a catalog.
 *
 * Written with explicit escapes on purpose: a literal U+0000 in this source file
 * makes it binary, and a zero-width character shifts visibleWidth() without
 * rendering anything visible — which is far worse in a TUI than a visible typo.
 * Tab and newline stay legal because the keyboard-help panel indexes use them.
 */
const FORBIDDEN_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/

export function findForbiddenCharacters(value: string): string[] {
  const found: string[] = []
  for (const character of value) {
    if (FORBIDDEN_CHARACTERS.test(character)) found.push(character)
  }
  return found
}

export function formatCodePoint(character: string): string {
  return `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
}

export function assertNoForbiddenCharacters(key: string, value: string): void {
  const found = findForbiddenCharacters(value)
  if (found.length === 0) return
  const rendered = [...new Set(found)].map(formatCodePoint).join(', ')
  throw new Error(`i18n key "${key}" contains forbidden characters: ${rendered}`)
}
