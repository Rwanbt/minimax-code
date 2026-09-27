import { t } from '../../../i18n/translate.js';
import { negotiateLocale } from '../../../i18n/locale.js';
import type { MessageKey } from '../../../i18n/locales/index.js';

/**
 * Composer copy, kept as a per-feature module to limit conflicts with upstream.
 *
 * MIGRATION SHIM. The English text now lives in the central catalog under
 * product-function keys. This file maps the legacy key names onto those keys so
 * the consumer modules do not all change at once. Retire each entry as its
 * consumer is migrated in batch B2; when this table is empty the adapter is
 * deleted.
 *
 * The locale no longer comes from `Intl.DateTimeFormat()` read at call time.
 * It comes from the single active locale, so a language switch takes effect
 * without a restart and every feature agrees on the answer.
 */

const COMPOSER_KEYS = {
  imagePreviewLoading: 'composer.image.loading',
  imagePreviewUnavailable: 'composer.image.unavailable',
  imagePreviewTextOnly: 'composer.image.unsupported',
  imagePreviewHint: 'composer.image.hint',
  placeholder: 'composer.placeholder',
  draftSaveFailed: 'composer.draft.saveFailed',
  draftCleanupFailed: 'composer.draft.cleanupFailed',
  draftMigrationFailed: 'composer.draft.migrationFailed',
  draftRestoreFailed: 'composer.draft.restoreFailed',
  draftRecoveryUnavailable: 'composer.draft.recoveryUnavailable',
  draftCleanupNextStep: 'composer.draft.cleanupNextStep',
} as const satisfies Readonly<Record<string, MessageKey>>

export type ComposerCopyKey = keyof typeof COMPOSER_KEYS

/**
 * @param locale optional explicit locale, still accepted as a free-form BCP 47
 *   string because existing callers pass values like `zh-CN`. It is negotiated
 *   rather than trusted, so `zh-TW` falls back to English instead of being
 *   served simplified Chinese.
 */
export function composerText(key: ComposerCopyKey, locale?: string): string {
  const catalogKey = COMPOSER_KEYS[key]
  return locale === undefined ? t(catalogKey) : t(catalogKey, negotiateLocale(locale))
}
