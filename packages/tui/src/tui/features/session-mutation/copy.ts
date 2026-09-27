import { t, tpl, tPlural } from '../../../i18n/translate.js';
import { negotiateLocale } from '../../../i18n/locale.js';
import { getActiveLocale } from '../../../i18n/context.js';
import type { MessageKey } from '../../../i18n/locales/index.js';

/**
 * Session history and mutation copy, kept as a per-feature module to limit
 * conflicts with upstream.
 *
 * MIGRATION SHIM. The English text now lives in the central catalog under
 * product-function keys. This file maps the legacy key names onto those keys so
 * the six consumer modules do not all change at once. Retire each entry as its
 * consumer is migrated in batches B3 and B5; when this table is empty the
 * adapter is deleted.
 *
 * The locale no longer comes from `Intl.DateTimeFormat()` read at call time.
 * It comes from the single active locale, so a language switch takes effect
 * without a restart and every feature agrees on the answer.
 */

type CatalogKey = Extract<MessageKey,
  | 'session.history.title'
  | 'session.history.helper'
  | 'session.history.loading'
  | 'common.hint.escCancel'
  | 'common.hint.enterRetryEscClose'
  | 'session.history.compactHint'
  | 'common.action.search'
  | 'session.history.noResults'
  | 'session.history.forkAvailable'
  | 'session.history.forkUnavailable'
  | 'session.history.preparingFork'
  | 'session.history.preparingEdit'
  | 'session.history.preparingRewind'
  | 'session.history.preparingTarget'
  | 'session.history.hint'
  | 'session.history.filterHint'
  | 'session.history.incompleteLabel'
  | 'session.history.actions'
  | 'session.history.actionsHint'
  | 'session.history.mutationUnavailable'
  | 'session.fork.title'
  | 'session.fork.description'
  | 'session.edit.title'
  | 'session.edit.description'
  | 'session.rewind.conversationLabel'
  | 'session.rewind.conversationDescription'
  | 'session.rewind.bothLabel'
  | 'session.rewind.bothDescription'
  | 'session.history.readOnlyWhileRunning'
  | 'session.history.noSession'
  | 'session.edit.previewHeading'
  | 'command.history.description'
  | 'command.history.unavailable'
>

const HISTORY_KEYS = {
  title: 'session.history.title',
  helper: 'session.history.helper',
  loading: 'session.history.loading',
  loadingHint: 'common.hint.escCancel',
  loadErrorHint: 'common.hint.enterRetryEscClose',
  compactHint: 'session.history.compactHint',
  search: 'common.action.search',
  noResults: 'session.history.noResults',
  forkAvailable: 'session.history.forkAvailable',
  forkUnavailable: 'session.history.forkUnavailable',
  preparingFork: 'session.history.preparingFork',
  preparingEdit: 'session.history.preparingEdit',
  preparingRewind: 'session.history.preparingRewind',
  preparingTarget: 'session.history.preparingTarget',
  hint: 'session.history.hint',
  filterHint: 'session.history.filterHint',
  incomplete: 'session.history.incompleteLabel',
  actions: 'session.history.actions',
  actionsHint: 'session.history.actionsHint',
  mutationUnavailable: 'session.history.mutationUnavailable',
  fork: 'session.fork.title',
  forkDescription: 'session.fork.description',
  edit: 'session.edit.title',
  editDescription: 'session.edit.description',
  rewindConversation: 'session.rewind.conversationLabel',
  rewindConversationDescription: 'session.rewind.conversationDescription',
  rewindFiles: 'session.rewind.bothLabel',
  rewindFilesDescription: 'session.rewind.bothDescription',
  running: 'session.history.readOnlyWhileRunning',
  noSession: 'session.history.noSession',
  editPreviewHeading: 'session.edit.previewHeading',
  commandDescription: 'command.history.description',
  commandUnavailable: 'command.history.unavailable',
} as const satisfies Readonly<Record<string, CatalogKey>>

const MUTATION_KEYS = {
  'sessionMutation.history.fork.title': 'session.history.forkPickerTitle',
  'sessionMutation.history.fork.helper': 'session.history.forkPickerHelper',
  'sessionMutation.history.rewind.title': 'session.history.rewindPickerTitle',
  'sessionMutation.history.rewind.helper': 'session.history.rewindPickerHelper',
  'sessionMutation.history.edit.title': 'session.history.editPickerTitle',
  'sessionMutation.history.edit.helper': 'session.history.editPickerHelper',
  'sessionMutation.history.empty': 'session.history.empty',
  'sessionMutation.history.fork.hint': 'session.history.fork.hint',
  'sessionMutation.history.rewind.hint': 'session.history.rewind.hint',
  'sessionMutation.history.edit.hint': 'session.history.edit.hint',
  'sessionMutation.history.incomplete.one': 'session.history.incompleteHidden',
  'sessionMutation.history.incomplete.many': 'session.history.incompleteHidden',
  'sessionMutation.scope.title': 'session.scope.title',
  'sessionMutation.scope.helper': 'session.scope.helper',
  'sessionMutation.scope.conversation.label': 'session.scope.conversation.label',
  'sessionMutation.scope.conversation.description': 'session.scope.conversation.description',
  'sessionMutation.scope.both.label': 'session.scope.both.label',
  'sessionMutation.scope.both.description': 'session.scope.both.description',
  'sessionMutation.scope.hint': 'session.scope.hint',
  'sessionMutation.preview.heading': 'session.preview.heading',
  'sessionMutation.preview.editHeading': 'session.preview.editHeading',
  'sessionMutation.preview.empty': 'session.preview.empty',
  'sessionMutation.preview.noSafe': 'session.preview.noSafe',
  'sessionMutation.preview.ready': 'session.preview.ready',
  'sessionMutation.preview.skipped': 'session.preview.skipped',
  'sessionMutation.preview.close': 'session.preview.close',
  'sessionMutation.preview.editHint': 'session.preview.editHint',
  'sessionMutation.preview.rewindHint': 'session.preview.rewindHint',
  'sessionMutation.preview.confirmRewindHint': 'session.preview.confirmRewindHint',
  'sessionMutation.preview.scrollHint': 'session.preview.scrollHint',
  'sessionMutation.preview.loading': 'session.preview.loading',
  'sessionMutation.preview.summary': 'session.preview.summary',
  'sessionMutation.preview.summaryEmpty': 'session.preview.summaryEmpty',
  'sessionMutation.format.unknownTime': 'session.format.unknownTime',
  'sessionMutation.format.noPrompt': 'session.format.noPrompt',
  'sessionMutation.format.assistantReplied': 'session.format.assistantReplied',
  'sessionMutation.format.files.one': 'session.format.files',
  'sessionMutation.format.files.many': 'session.format.files',
  'sessionMutation.format.affected.one': 'session.format.affectedTurns',
  'sessionMutation.format.affected.many': 'session.format.affectedTurns',
  'sessionMutation.format.turn.one': 'session.format.turns',
  'sessionMutation.format.turn.many': 'session.format.turns',
  'sessionMutation.format.action.modified': 'session.format.actionModified',
  'sessionMutation.format.action.created': 'session.format.actionCreated',
  'sessionMutation.format.action.deleted': 'session.format.actionDeleted',
  'sessionMutation.format.action.unknown': 'session.format.actionUnknown',
  'sessionMutation.outcome.boundaryUnavailable': 'session.outcome.boundaryUnavailable',
  'sessionMutation.outcome.noSafeFiles': 'session.outcome.noSafeFiles',
  'sessionMutation.outcome.conversationSuccess': 'session.outcome.conversationSuccess',
  'sessionMutation.outcome.filesSuccess': 'session.outcome.filesSuccess',
  'sessionMutation.error.conflict': 'session.error.conflict',
  'sessionMutation.error.busy': 'session.error.busy',
  'sessionMutation.error.retry': 'session.error.retry',
  'sessionMutation.error.retrySameOperation': 'session.error.retrySameOperation',
  'sessionMutation.error.loadHistory': 'session.error.loadHistory',
  'sessionMutation.error.retryFork': 'session.error.retryFork',
  'sessionMutation.error.retryRewind': 'session.error.retryRewind',
  'sessionMutation.error.retryEdit': 'session.error.retryEdit',
  'sessionMutation.error.loadPreview': 'session.error.loadPreview',
  'sessionMutation.error.loadForkOptions': 'session.error.loadForkOptions',
  'sessionMutation.error.chooseAgain': 'session.error.chooseAgain',
  'sessionMutation.error.sessionUnchanged': 'session.error.sessionUnchanged',
  'sessionMutation.error.sourceUnchanged': 'session.error.sourceUnchanged',
  'sessionMutation.error.forkRequest': 'session.error.forkRequest',
  'sessionMutation.error.forkRetry': 'session.error.forkRetry',
  'sessionMutation.error.forkRetrySameOperation': 'session.error.forkRetrySameOperation',
  'sessionMutation.error.activateFork': 'session.error.activateFork',
  'sessionMutation.error.openForkManually': 'session.error.openForkManually',
  'sessionMutation.error.refresh': 'session.error.refresh',
  'sessionMutation.error.editRefresh': 'session.error.editRefresh',
  'sessionMutation.error.pendingInteraction': 'session.error.pendingInteraction',
  'sessionMutation.error.exitPlan': 'session.error.exitPlan',
  'sessionMutation.error.openParent': 'session.error.openParent',
  'sessionMutation.error.editExitPlan': 'session.error.editExitPlan',
  'sessionMutation.error.editOpenParent': 'session.error.editOpenParent',
  'sessionMutation.error.editRequest': 'session.error.editRequest',
  'sessionMutation.error.editNeedsNewOperation': 'session.error.editNeedsNewOperation',
  'sessionMutation.error.editNeedsResubmit': 'session.error.editNeedsResubmit',
  'sessionMutation.error.editSubmitAfterRewind': 'session.error.editSubmitAfterRewind',
  'sessionMutation.hint.forkRunning': 'session.hint.forkRunning',
  'sessionMutation.hint.forkNoSession': 'session.hint.forkNoSession',
  'sessionMutation.hint.rewindNoSession': 'session.hint.rewindNoSession',
  'sessionMutation.hint.editNoSession': 'session.hint.editNoSession',
  'sessionMutation.hint.editRunning': 'session.hint.editRunning',
  'sessionMutation.hint.editing': 'session.hint.editing',
  'sessionMutation.hint.editSubmitting': 'session.hint.editSubmitting',
  'sessionMutation.hint.editResubmit': 'session.hint.editResubmit',
  'sessionMutation.hint.loadingFork': 'session.hint.loadingFork',
  'sessionMutation.hint.loadingRewind': 'session.hint.loadingRewind',
  'sessionMutation.hint.loadingEdit': 'session.hint.loadingEdit',
  'sessionMutation.hint.noForkPrompts': 'session.hint.noForkPrompts',
  'sessionMutation.confirm.fork.title': 'session.confirm.fork.title',
  'sessionMutation.confirm.fork.helper': 'session.confirm.fork.helper',
  'sessionMutation.confirm.fork.suggestedTitle': 'session.confirm.fork.suggestedTitle',
  'sessionMutation.confirm.fork.currentSession': 'session.confirm.fork.currentSession',
  'sessionMutation.confirm.fork.workspaceEligible': 'session.confirm.fork.workspaceEligible',
  'sessionMutation.confirm.fork.workspaceUnavailable': 'session.confirm.fork.workspaceUnavailable',
  'sessionMutation.confirm.fork.worktreeUnavailable': 'session.confirm.fork.worktreeUnavailable',
  'sessionMutation.confirm.fork.workspaceCurrent': 'session.confirm.fork.workspaceCurrent',
  'sessionMutation.confirm.titleLabel': 'session.confirm.titleLabel',
  'sessionMutation.confirm.sourceLabel': 'session.confirm.sourceLabel',
  'sessionMutation.confirm.fromLabel': 'session.confirm.fromLabel',
  'sessionMutation.confirm.confirmHint': 'session.confirm.confirmHint',
  'sessionMutation.confirm.fork.busy': 'session.confirm.fork.busy',
  'sessionMutation.confirm.rewind.title': 'session.confirm.rewind.title',
  'sessionMutation.confirm.rewind.filesWarning': 'session.confirm.rewind.filesWarning',
  'sessionMutation.confirm.rewind.conversationWarning': 'session.confirm.rewind.conversationWarning',
  'sessionMutation.confirm.scopeLabel': 'session.confirm.scopeLabel',
  'sessionMutation.confirm.targetLabel': 'session.confirm.targetLabel',
  'sessionMutation.confirm.impactLabel': 'session.confirm.impactLabel',
  'sessionMutation.confirm.filesUnchanged': 'session.confirm.filesUnchanged',
  'sessionMutation.confirm.filesLabel': 'session.confirm.filesLabel',
  'sessionMutation.confirm.fileCounts': 'session.confirm.fileCounts',
  'sessionMutation.confirm.rewind.busy': 'session.confirm.rewind.busy',
  'sessionMutation.outcome.partial': 'session.outcome.partial',
  'sessionMutation.outcome.failedAfterRewind': 'session.outcome.failedAfterRewind',
  'sessionMutation.outcome.unsafe': 'session.outcome.unsafe',
  'sessionMutation.outcome.errorSuffix': 'session.outcome.errorSuffix',
  'sessionMutation.fork.unavailableReason': 'session.fork.unavailableReason',
  'sessionMutation.fork.unavailableDefault': 'session.fork.unavailableDefault',
  'sessionMutation.command.fork.description': 'command.fork.description',
  'sessionMutation.command.rewind.description': 'command.rewind.description',
  'sessionMutation.command.edit.description': 'command.edit.description',
  'sessionMutation.command.fork.unavailable': 'command.fork.unavailable',
  'sessionMutation.command.rewind.unavailable': 'command.rewind.unavailable',
  'sessionMutation.command.edit.unavailable': 'command.edit.unavailable',
} as const satisfies Readonly<Record<string, MessageKey>>

export type SessionHistoryCopyKey = keyof typeof HISTORY_KEYS
export type SessionMutationCopyKey = keyof typeof MUTATION_KEYS

/**
 * The active locale as a plain string, for the handful of helpers that hand a
 * locale to a shared formatter (see `formatProductTime`). This used to read
 * `Intl.DateTimeFormat()` at call time, which meant every feature resolved the
 * locale independently and a language switch could not take effect. It now
 * returns the single active locale.
 */
export function sessionMutationLocale(): string {
  return getActiveLocale()
}

/**
 * @param locale optional explicit locale, still accepted as a free-form BCP 47
 *   string because existing callers pass values like `zh-CN`. It is negotiated
 *   rather than trusted, so `zh-TW` falls back to English instead of being
 *   served simplified Chinese.
 */
export function sessionHistoryText(key: SessionHistoryCopyKey, locale?: string): string {
  const catalogKey = HISTORY_KEYS[key]
  return locale === undefined ? t(catalogKey) : t(catalogKey, negotiateLocale(locale))
}

export function sessionMutationText(key: SessionMutationCopyKey, locale?: string): string {
  const catalogKey = MUTATION_KEYS[key]
  const target = locale === undefined ? undefined : negotiateLocale(locale)
  // The legacy `.one` / `.many` names encoded the count at the call site: the
  // consumer picked the key instead of passing a number. Now that the catalog
  // holds a real plural message, route through `tPlural` with a representative
  // count. Migrating a consumer to pass its real count to `tPlural` is preferred
  // and is the only form that stays correct in three- and four-category
  // languages.
  if (key.endsWith('.one')) return tPlural(catalogKey, 1, { count: 1 }, target)
  if (key.endsWith('.many')) return tPlural(catalogKey, 2, { count: 2 }, target)
  return target === undefined ? t(catalogKey) : t(catalogKey, target)
}

/**
 * @deprecated prefer `tpl`, which resolves the locale itself. Kept for the
 *   consumers that still pass an explicit locale.
 */
export function sessionMutationTemplate(
  key: SessionMutationCopyKey,
  values: Readonly<Record<string, string | number>>,
  locale?: string,
): string {
  const catalogKey = MUTATION_KEYS[key]
  const target = locale === undefined ? undefined : negotiateLocale(locale)
  // These legacy keys now resolve to a real plural message, so form selection
  // has to happen here. Prefer the count the caller passed, which keeps the
  // rendered text correct in three- and four-category languages; fall back to
  // a representative count only when the caller did not supply one.
  const raw = values.count
  const count = typeof raw === 'number' && Number.isFinite(raw) ? raw : key.endsWith('.one') ? 1 : 2
  if (key.endsWith('.one') || key.endsWith('.many')) {
    return tPlural(catalogKey, count, values, target)
  }
  return target === undefined ? tpl(catalogKey, values) : tpl(catalogKey, values, target)
}

/**
 * @deprecated plural-aware callers should use `tPlural` directly.
 */
export function sessionMutationPlural(
  key: SessionMutationCopyKey,
  count: number,
  locale?: string,
): string {
  const catalogKey = MUTATION_KEYS[key]
  return locale === undefined
    ? tPlural(catalogKey, count)
    : tPlural(catalogKey, count, undefined, negotiateLocale(locale))
}
