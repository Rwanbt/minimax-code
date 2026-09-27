/**
 * Public surface of the TUI/CLI i18n domain.
 *
 * Import from here rather than from the individual modules: the internal layout
 * is free to change, and components should not have to know whether a helper
 * lives in `translate.ts`, `format.ts` or `context.ts`.
 *
 * Note on reachability: `tsconfig.standalone.json` type-checks the TUI from a
 * single root (`packages/tui/src/index.ts`) and follows imports from there. Any
 * module in this directory therefore only gets type-checked once something in
 * the TUI imports it. That is why the composer and session-mutation copy
 * adapters delegate here rather than keeping their own tables.
 */
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isPlainMessage,
  isPluralMessage,
  isSupportedLocale,
  requiredPluralCategories,
  findForbiddenCharacters,
  assertNoForbiddenCharacters,
  formatCodePoint,
} from './schema.js';
export type {
  LocaleEntry,
  LocalePreference,
  LocaleStatus,
  Message,
  PartialCatalog,
  PlainMessage,
  PluralCategory,
  PluralMessage,
  SupportedLocale,
} from './schema.js';

export {
  LOCALE_ENV_VARS,
  isKnownLocale,
  negotiateLocale,
  resolveLocale,
  systemLocale,
} from './locale.js';
export type { LocaleSources } from './locale.js';

export {
  getActiveLocale,
  setActiveLocale,
  setLocaleConfigPreference,
  setLocaleEnvironment,
  resetActiveLocale,
  subscribeLocaleChange,
  describeLocaleSources,
} from './context.js';

export { t, tpl, tPlural, extractPlaceholders, invalidateCatalogCache } from './translate.js';

export {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatNumber,
  formatCompactNumber,
  formatPercent,
  formatDuration,
  clearFormatCaches,
  ELLIPSIS,
  ELLIPSIS_ASCII,
} from './format.js';

export { pseudoCatalog, pseudoLocalize, resetPseudoCatalog } from './pseudo-locale.js';
export type { PseudoCatalog } from './pseudo-locale.js';

export {
  LOCALES,
  localeStatus,
  isLocaleComplete,
  userSelectableLocales,
  developmentLocales,
  localeCoverage,
  EN_CATALOG,
  FR_CATALOG,
  ZH_HANS_CATALOG,
} from './locales/index.js';
export type { MessageKey } from './locales/index.js';
