import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type LocaleEntry,
  type LocaleStatus,
  type Message,
  type SupportedLocale,
} from '../schema.js';
import { EN_CATALOG, type MessageKey } from './en.js';
import { ZH_HANS_CATALOG } from './zh-Hans.js';
import { FR_CATALOG } from './fr.js';
import { ES_CATALOG } from './es.js';
import { DE_CATALOG } from './de.js';
import { PT_BR_CATALOG } from './pt-BR.js';
import { IT_CATALOG } from './it.js';
import { NL_CATALOG } from './nl.js';
import { PL_CATALOG } from './pl.js';
import { RU_CATALOG } from './ru.js';
import { JA_CATALOG } from './ja.js';
import { KO_CATALOG } from './ko.js';

export type { MessageKey };

type CatalogRecord = Readonly<Record<string, Message>>

/**
 * The locale registry.
 *
 * `status` is what keeps a half-translated language away from a user: only
 * `complete` locales are offered by the settings picker, and `i18n-check`
 * refuses a `complete` claim that does not actually hold.
 */
export const LOCALES: Readonly<Record<SupportedLocale, LocaleEntry>> = {
  en: { status: 'complete', catalog: EN_CATALOG as unknown as CatalogRecord },
  'zh-Hans': { status: 'draft', catalog: ZH_HANS_CATALOG },
  fr: { status: 'draft', catalog: FR_CATALOG },
  es: { status: 'draft', catalog: ES_CATALOG },
  de: { status: 'draft', catalog: DE_CATALOG },
  'pt-BR': { status: 'draft', catalog: PT_BR_CATALOG },
  it: { status: 'draft', catalog: IT_CATALOG },
  nl: { status: 'draft', catalog: NL_CATALOG },
  pl: { status: 'draft', catalog: PL_CATALOG },
  ru: { status: 'draft', catalog: RU_CATALOG },
  ja: { status: 'draft', catalog: JA_CATALOG },
  ko: { status: 'draft', catalog: KO_CATALOG },
}

const STATUS: Readonly<Record<SupportedLocale, LocaleStatus>> = {
  en: 'complete',
  'zh-Hans': 'draft',
  fr: 'draft',
  es: 'draft',
  de: 'draft',
  'pt-BR': 'draft',
  it: 'draft',
  nl: 'draft',
  pl: 'draft',
  ru: 'draft',
  ja: 'draft',
  ko: 'draft',
}

export function localeStatus(locale: SupportedLocale): LocaleStatus {
  return STATUS[locale]
}

/**
 * Endonyms: each language is listed in its own script.
 *
 * A reader who cannot read the current interface language still finds their own
 * in the list, which a translated name would hide from them. These are therefore
 * not translatable copy and deliberately live outside the catalog.
 */
export const LOCALE_ENDONYMS: Readonly<Record<SupportedLocale, string>> = {
  en: 'English',
  'zh-Hans': '简体中文',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
}

export function isLocaleComplete(locale: SupportedLocale): boolean {
  return STATUS[locale] === 'complete'
}

/**
 * Locales a user may pick. A `draft` locale is never offered in a production
 * build; `MCODE_I18N_DEV=1` is the only way to reach one.
 */
export function userSelectableLocales(): readonly SupportedLocale[] {
  return SUPPORTED_LOCALES.filter((locale) => STATUS[locale] === 'complete')
}

export function developmentLocales(): readonly SupportedLocale[] {
  return SUPPORTED_LOCALES
}

/** How much of the English catalog a locale currently covers. */
export function localeCoverage(locale: SupportedLocale): { covered: number; total: number } {
  const total = Object.keys(EN_CATALOG).length
  const covered = Object.keys(LOCALES[locale].catalog).length
  return { covered, total }
}

export {
  DEFAULT_LOCALE,
  EN_CATALOG,
  FR_CATALOG,
  ZH_HANS_CATALOG,
  ES_CATALOG,
  DE_CATALOG,
  PT_BR_CATALOG,
  IT_CATALOG,
  NL_CATALOG,
  PL_CATALOG,
  RU_CATALOG,
  JA_CATALOG,
  KO_CATALOG,
  SUPPORTED_LOCALES,
}
export type { Message, SupportedLocale, LocaleStatus }
