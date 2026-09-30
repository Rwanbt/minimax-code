import { getActiveLocale } from './context.js';
import {
  DEFAULT_LOCALE,
  isPlainMessage,
  isPluralMessage,
  requiredPluralCategories,
  type Message,
  type PluralCategory,
  type SupportedLocale,
} from './schema.js';
import { LOCALES, type MessageKey } from './locales/index.js';

/**
 * Placeholder syntax is `{identifier}`. Matching is deliberately lottie — the
 * source no longer contains the literal `{name}` in this file's own helpers, so
 * only the message catalog defines placeholder names.
 */
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g

const PLACEHOLDER_SHAPE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function extractPlaceholders(pattern: string): string[] {
  const found: string[] = []
  for (const match of pattern.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]
    if (name && !found.includes(name)) found.push(name)
  }
  return found
}

type ResolvedCatalog = Readonly<Record<string, Message>>

const cache = new Map<SupportedLocale, ResolvedCatalog>()

function catalogFor(locale: SupportedLocale): ResolvedCatalog {
  const cached = cache.get(locale)
  if (cached) return cached
  const entry = LOCALES[locale]
  const resolved: ResolvedCatalog = entry ? entry.catalog : ({} as ResolvedCatalog)
  cache.set(locale, resolved)
  return resolved
}

/** Drop cached catalogs. Called on locale change and by tests. */
export function invalidateCatalogCache(): void {
  cache.clear()
}

/**
 * Resolve a message together with the locale it was actually found in.
 *
 * The pair matters for plurals. When a draft locale has no entry the text comes
 * from English, so the plural category has to be selected for English as well:
 * selecting `other` for a Japanese reader and applying it to the English
 * sentence would render "1 agents active" — the English `other` form — instead
 * of "1 agent active". This affected every key in every draft locale, which is
 * every locale except English until the translation workstreams land.
 */
function resolveMessage(
  key: MessageKey,
  locale: SupportedLocale,
): { message: Message; locale: SupportedLocale } | undefined {
  const fromLocale = catalogFor(locale)[key]
  if (fromLocale !== undefined) return { message: fromLocale, locale }
  if (locale === DEFAULT_LOCALE) return undefined
  const fallback = catalogFor(DEFAULT_LOCALE)[key]
  return fallback === undefined ? undefined : { message: fallback, locale: DEFAULT_LOCALE }
}

function messageFor(key: MessageKey, locale: SupportedLocale): Message | undefined {
  return resolveMessage(key, locale)?.message
}

function renderPattern(
  key: MessageKey,
  pattern: string,
  locale: SupportedLocale,
  values: Readonly<Record<string, string | number>> | undefined,
): string {
  if (values === undefined) {
    // Nothing to substitute. Leave the pattern untouched rather than guessing.
    return pattern
  }

  // Resolve every occurrence, then report what was asked for but never supplied.
  const missing = new Set<string>()
  const rendered = pattern.replace(PLACEHOLDER_PATTERN, (whole, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      missing.add(name)
      return whole
    }
    // Values pass through untouched: no trim, no normalisation, and any ANSI
    // codes inside a value survive. A value is never rescanned as a pattern.
    return String(values[name])
  })

  if (missing.size > 0 && process.env.NODE_ENV !== 'production') {
    const names = [...missing].join(', ')
    // A missing placeholder is a translation defect, not a crash. Surfacing the
    // key keeps the UI usable while making the bug loud during development.
    console.warn(`[i18n] missing placeholder(s) ${names} for key "${key}" (locale ${locale})`)
  }

  return rendered
}

function formatPlain(
  key: MessageKey,
  locale: SupportedLocale,
  values?: Readonly<Record<string, string | number>>,
): string {
  const message = messageFor(key, locale)
  if (message === undefined) {
    // A key that exists nowhere: show it so the gap is visible in the interface.
    return key
  }
  if (isPlainMessage(message)) return renderPattern(key, message, locale, values)
  // Declared plural in English but called without a count: `other` is the
  // CLDR-defined neutral form.
  return renderPattern(key, message.plural.other, locale, values)
}

/** Translate `key` in the active locale. */
export function t(key: MessageKey, values?: Readonly<Record<string, string | number>>): string
export function t(
  key: MessageKey,
  locale: SupportedLocale,
  values?: Readonly<Record<string, string | number>>,
): string
export function t(
  key: MessageKey,
  localeOrValues?: SupportedLocale | Readonly<Record<string, string | number>>,
  maybeValues?: Readonly<Record<string, string | number>>,
): string {
  if (typeof localeOrValues === 'string') {
    return formatPlain(key, localeOrValues, maybeValues)
  }
  return formatPlain(key, getActiveLocale(), localeOrValues)
}

/** Interpolating variant. Same semantics as `t`; named for call-site clarity. */
export function tpl(
  key: MessageKey,
  values: Readonly<Record<string, string | number>>,
  locale?: SupportedLocale,
): string {
  return formatPlain(key, locale ?? getActiveLocale(), values)
}

function selectPluralForm(forms: PluralMessageLike, count: number, locale: SupportedLocale): string {
  let category: PluralCategory
  try {
    category = new Intl.PluralRules(locale).select(count)
  } catch {
    category = count === 1 ? 'one' : 'other'
  }
  return forms[category] ?? forms.other
}

interface PluralMessageLike {
  other: string
  zero?: string
  one?: string
  two?: string
  few?: string
  many?: string
}

/**
 * Plural-aware translation. The category comes from `Intl.PluralRules` so Polish
 * and Russian (both four forms) are correct without a per-locale table.
 *
 * The category is selected for the locale the message was actually resolved
 * from, not the one requested — see `resolveMessage`.
 */
export function tPlural(
  key: MessageKey,
  count: number,
  values?: Readonly<Record<string, string | number>>,
  locale?: SupportedLocale,
): string {
  const target = locale ?? getActiveLocale()
  const resolved = resolveMessage(key, target)
  if (resolved === undefined) return key
  const { message, locale: messageLocale } = resolved
  if (isPlainMessage(message)) {
    // English declared this key as plain text; a `{count}` may still be present.
    return renderPattern(key, message, target, { ...values, count })
  }
  const pattern = selectPluralForm(message.plural, count, messageLocale)
  return renderPattern(key, pattern, target, { ...values, count })
}

/** Locale-aware formatting helpers live in `format.ts`; re-exported here for convenience. */
export { requiredPluralCategories }
