import { t } from '../../../i18n/translate.js';
import { getActiveLocale } from '../../../i18n/context.js';
import { negotiateLocale } from '../../../i18n/locale.js';
import type { TuiStatusLineItem } from '../../shell/status-line-items.js';
import type { MessageKey } from '../../../i18n/locales/index.js';

/**
 * Status line setup copy.
 *
 * This file used to hold two English tables and read the locale itself with
 * `Intl.DateTimeFormat()` at call time, and the item descriptions were
 * `[en, zh]` tuples indexed by an `isChinese` boolean. That shape could only ever
 * carry two languages and resolved independently of every other feature, so a
 * language switch could not reach it. Both tables now live in the central
 * catalog and the locale comes from the single active one.
 *
 * The file stays because `AGENTS.md` asks for content changes over layout
 * changes, which keeps the diff with the upstream sync small.
 */

/** Panel chrome. */
export type StatusLineCopyKey = Extract<
  MessageKey,
  | 'statusLine.title'
  | 'statusLine.search'
  | 'statusLine.preview'
  | 'statusLine.defaults'
  | 'statusLine.unavailable'
  | 'statusLine.empty'
  | 'statusLine.noMatches'
  | 'statusLine.saving'
  | 'statusLine.failed'
  | 'statusLine.locked'
  | 'statusLine.help'
  | 'statusLine.compactHelp'
  | 'statusLine.reset'
  | 'statusLine.filtered'
  | 'statusLine.custom'
  | 'statusLine.close'
>;

/**
 * Per-item descriptions. `build-mode` is excluded upstream because it is not
 * shown as a selectable row.
 */
const ITEM_KEYS = {
  'current-dir': 'statusLine.item.currentDir',
  'session-title': 'statusLine.item.sessionTitle',
  'git-branch': 'statusLine.item.gitBranch',
  'review-link': 'statusLine.item.reviewLink',
  'plan-mode': 'statusLine.item.planMode',
  'approval-mode': 'statusLine.item.approvalMode',
  'model-with-reasoning': 'statusLine.item.modelWithReasoning',
  model: 'statusLine.item.model',
  'context-window': 'statusLine.item.contextWindow',
  subagent: 'statusLine.item.subagent',
  'token-quota': 'statusLine.item.tokenQuota',
  'cache-read-ratio': 'statusLine.item.cacheReadRatio',
  'context-remaining': 'statusLine.item.contextRemaining',
  'context-meter': 'statusLine.item.contextMeter',
  'custom-command': 'statusLine.item.customCommand',
} as const satisfies Readonly<Record<Exclude<TuiStatusLineItem, 'build-mode'>, MessageKey>>;

export type StatusLineItem = keyof typeof ITEM_KEYS;

/**
 * MIGRATION SHIM: the camelCase names this function used to take, mapped onto
 * the catalog keys. Keeping them means the picker does not change in this pass,
 * which keeps the diff with the upstream sync small. Retire each entry as its
 * consumer migrates; when the table is empty the shim is gone.
 */
const LEGACY_KEYS = {
  title: 'statusLine.title',
  search: 'statusLine.search',
  preview: 'statusLine.preview',
  defaults: 'statusLine.defaults',
  unavailable: 'statusLine.unavailable',
  empty: 'statusLine.empty',
  noMatches: 'statusLine.noMatches',
  saving: 'statusLine.saving',
  failed: 'statusLine.failed',
  locked: 'statusLine.locked',
  help: 'statusLine.help',
  compactHelp: 'statusLine.compactHelp',
  reset: 'statusLine.reset',
  filtered: 'statusLine.filtered',
  custom: 'statusLine.custom',
  close: 'statusLine.close',
} as const satisfies Readonly<Record<string, StatusLineCopyKey>>;

/** Accepted for now so existing call sites compile; prefer the catalog keys. */
export type StatusLineCopyKeyOrLegacy = StatusLineCopyKey | keyof typeof LEGACY_KEYS;

function resolveCopyKey(key: StatusLineCopyKeyOrLegacy): MessageKey {
  return key in LEGACY_KEYS
    ? LEGACY_KEYS[key as keyof typeof LEGACY_KEYS]
    : (key as MessageKey);
}

/**
 * @param locale optional explicit locale, still accepted as a free-form BCP 47
 *   string because existing callers pass values like `zh-CN`. It is negotiated
 *   rather than trusted, so `zh-TW` falls back to English rather than being
 *   served simplified Chinese.
 */
export function statusLineText(key: StatusLineCopyKeyOrLegacy, locale?: string): string {
  const catalogKey = resolveCopyKey(key);
  return locale === undefined ? t(catalogKey) : t(catalogKey, negotiateLocale(locale));
}

export function statusLineItemDescription(item: StatusLineItem, locale?: string): string {
  const key = ITEM_KEYS[item];
  return locale === undefined ? t(key) : t(key, negotiateLocale(locale));
}

/** The locale the panel is currently rendering in, for the picker header. */
export function statusLineLocale(): string {
  return getActiveLocale();
}
