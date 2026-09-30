import type { MessageKey } from '../../../i18n/locales/index.js';

export const MINIMAX_CODE_WELCOME_PASTE_IMAGE_SHORTCUT = '{paste-image-shortcut}';

/**
 * Welcome panel copy, as keys.
 *
 * This file holds no `t()` call at module level, and that is the whole point.
 * The previous version exported a `MINIMAX_CODE_WELCOME_DESIGN` const built from
 * resolved English strings, which is exactly the anti-pattern the i18n plan
 * calls out: a module-level const is evaluated at import time, so the welcome
 * panel would have kept whichever locale happened to be active when the process
 * started. `app-composition` samples three tips once at startup, so the sample
 * stays stable while the text follows the language.
 *
 * Every tip advertises a slash command, which is invariant by product decision:
 * users type it, and scripts and agent prompts embed it. Each tip is therefore a
 * whole key with the command inside it, never a composition, because word order
 * around an embedded command genuinely moves between languages. The i18n test
 * asserts the commands survive in every locale.
 *
 * `MINIMAX_CODE_TERMINAL_WORDMARK` and its medium and micro siblings are ASCII
 * art and are deliberately absent from the catalog. Translating a logo's glyphs
 * is not a thing.
 */

export type WelcomeTipKey = Extract<
  MessageKey,
  | 'welcome.tip.stateWhatYouWant'
  | 'welcome.tip.atForFiles'
  | 'welcome.tip.init'
  | 'welcome.tip.plan'
  | 'welcome.tip.context'
  | 'welcome.tip.sessions'
  | 'welcome.tip.history'
  | 'welcome.tip.goal'
  | 'welcome.tip.permission'
  | 'welcome.tip.feedback'
  | 'welcome.tip.checkin'
  | 'welcome.stacked.atFiles'
  | 'welcome.stacked.checkin'
  | 'welcome.compact.atFiles'
  | 'welcome.compact.init'
  | 'welcome.compact.checkin'
>;

export type WelcomeNewsKey = Extract<
  MessageKey,
  | 'welcome.wide.news.followups'
  | 'welcome.wide.news.context'
  | 'welcome.wide.news.feedback'
  | 'welcome.stacked.news.followups'
  | 'welcome.stacked.news.context'
  | 'welcome.compact.news.followups'
  | 'welcome.compact.news.context'
>;

/** The pool `app-composition` samples from. Keys, not text, so a sample taken
 *  once at startup still resolves in whichever locale is active later. */
export const MINIMAX_CODE_WELCOME_TIP_KEYS = [
  'welcome.tip.stateWhatYouWant',
  'welcome.tip.atForFiles',
  'welcome.tip.init',
  'welcome.tip.plan',
  'welcome.tip.context',
  'welcome.tip.sessions',
  'welcome.tip.history',
  'welcome.tip.goal',
  'welcome.tip.permission',
  'welcome.tip.feedback',
  'welcome.tip.checkin',
] as const satisfies readonly WelcomeTipKey[];

export const MINIMAX_CODE_WELCOME_WIDE_TIP_KEYS = [
  'welcome.tip.stateWhatYouWant',
  'welcome.tip.atForFiles',
  'welcome.tip.init',
  'welcome.tip.checkin',
] as const satisfies readonly WelcomeTipKey[];

export const MINIMAX_CODE_WELCOME_STACKED_TIP_KEYS = [
  'welcome.tip.stateWhatYouWant',
  'welcome.stacked.atFiles',
  'welcome.stacked.checkin',
] as const satisfies readonly WelcomeTipKey[];

export const MINIMAX_CODE_WELCOME_COMPACT_TIP_KEYS = [
  'welcome.compact.atFiles',
  'welcome.compact.init',
  'welcome.compact.checkin',
] as const satisfies readonly WelcomeTipKey[];

export const MINIMAX_CODE_WELCOME_WIDE_NEWS_KEYS = [
  'welcome.wide.news.followups',
  'welcome.wide.news.context',
  'welcome.wide.news.feedback',
] as const satisfies readonly WelcomeNewsKey[];

export const MINIMAX_CODE_WELCOME_STACKED_NEWS_KEYS = [
  'welcome.stacked.news.followups',
  'welcome.stacked.news.context',
] as const satisfies readonly WelcomeNewsKey[];

export const MINIMAX_CODE_WELCOME_COMPACT_NEWS_KEYS = [
  'welcome.compact.news.followups',
  'welcome.compact.news.context',
] as const satisfies readonly WelcomeNewsKey[];

/** Numeric layout thresholds. No copy, so a static const is correct here. */
export const MINIMAX_CODE_WELCOME_HERO = {
  fullMinWidth: 91,
  mediumMinWidth: 44,
  microMinWidth: 11,
  fallbackTitle: 'M',
} as const;

export const MINIMAX_CODE_TERMINAL_WORDMARK = [
  '███╗   ███╗██╗███╗   ██╗██╗███╗   ███╗ █████╗ ██╗  ██╗     ██████╗ ██████╗ ██████╗ ███████╗',
  '████╗ ████║██║████╗  ██║██║████╗ ████║██╔══██╗╚██╗██╔╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
  '██╔████╔██║██║██╔██╗ ██║██║██╔████╔██║███████║ ╚███╔╝     ██║     ██║   ██║██║  ██║█████╗',
  '██║╚██╔╝██║██║██║╚██╗██║██║██║╚██╔╝██║██╔══██║ ██╔██╗     ██║     ██║   ██║██║  ██║██╔══╝',
  '██║ ╚═╝ ██║██║██║ ╚████║██║██║ ╚═╝ ██║██║  ██║██╔╝ ██╗    ╚██████╗╚██████╔╝██████╔╝███████╗',
  '╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
] as const;

export const MINIMAX_CODE_TERMINAL_MEDIUM_WORDMARK = [
  '███╗   ███╗ ██████╗ ██████╗ ██████╗ ███████╗',
  '████╗ ████║██╔════╝██╔═══██╗██╔══██╗██╔════╝',
  '██╔████╔██║██║     ██║   ██║██║  ██║█████╗',
  '██║╚██╔╝██║██║     ██║   ██║██║  ██║██╔══╝',
  '██║ ╚═╝ ██║╚██████╗╚██████╔╝██████╔╝███████╗',
  '╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
] as const;

export const MINIMAX_CODE_TERMINAL_MICRO_WORDMARK = [
  '███╗   ███╗',
  '████╗ ████║',
  '██╔████╔██║',
  '██║╚██╔╝██║',
  '██║ ╚═╝ ██║',
  '╚═╝     ╚═╝',
] as const;
