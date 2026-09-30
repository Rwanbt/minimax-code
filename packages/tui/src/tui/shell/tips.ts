import { t } from '../../i18n/translate.js';
import { onLocaleChanged, getActiveLocale } from '../../i18n/context.js';
import type { SupportedLocale } from '../../i18n/schema.js';
import type { MessageKey } from '../../i18n/locales/index.js';

export interface TuiTip {
  readonly id: string;
  /** Invariant: the slash command this tip advertises. Users type it. */
  readonly command: string;
  readonly text: string;
  readonly shortText: string;
  readonly weight?: number;
}

interface TuiTipDefinition {
  readonly id: string;
  readonly command: string;
  readonly textKey: MessageKey;
  readonly shortTextKey: MessageKey;
  readonly weight?: number;
}

/**
 * Tips hold keys, not text, because the previous version exported a
 * module-level `TUI_TIPS` const built from English strings. A `t()` call there
 * would have fixed the language at import time, so the composer would keep
 * showing English tips after the user switched.
 *
 * Every translation must keep the `/command` substring: the tip exists to
 * advertise that command, and dropping it would leave a sentence with nothing
 * actionable in it. The i18n test enforces that.
 */
const TUI_TIP_DEFINITIONS: readonly TuiTipDefinition[] = [
  {
    id: 'goal',
    command: 'goal',
    textKey: 'tip.goal.text',
    shortTextKey: 'tip.goal.short',
    weight: 2,
  },
  {
    id: 'context',
    command: 'context',
    textKey: 'tip.context.text',
    shortTextKey: 'tip.context.short',
    weight: 2,
  },
  {
    id: 'steer',
    command: 'steer',
    textKey: 'tip.steer.text',
    shortTextKey: 'tip.steer.short',
    weight: 2,
  },
  {
    id: 'plugins',
    command: 'plugins',
    textKey: 'tip.plugins.text',
    shortTextKey: 'tip.plugins.short',
    weight: 2,
  },
  {
    id: 'sessions',
    command: 'sessions',
    textKey: 'tip.sessions.text',
    shortTextKey: 'tip.sessions.short',
  },
  {
    id: 'fork',
    command: 'fork',
    textKey: 'tip.fork.text',
    shortTextKey: 'tip.fork.short',
  },
  {
    id: 'rewind',
    command: 'rewind',
    textKey: 'tip.rewind.text',
    shortTextKey: 'tip.rewind.short',
  },
  {
    id: 'compact',
    command: 'compact',
    textKey: 'tip.compact.text',
    shortTextKey: 'tip.compact.short',
  },
  {
    id: 'skills',
    command: 'skills',
    textKey: 'tip.skills.text',
    shortTextKey: 'tip.skills.short',
  },
  {
    id: 'feedback',
    command: 'feedback',
    textKey: 'tip.feedback.text',
    shortTextKey: 'tip.feedback.short',
  },
];

export function buildTuiTips(locale?: SupportedLocale): readonly TuiTip[] {
  const target = locale ?? getActiveLocale();
  return TUI_TIP_DEFINITIONS.map((tip) => ({
    id: tip.id,
    command: tip.command,
    text: t(tip.textKey, target),
    shortText: t(tip.shortTextKey, target),
    ...(tip.weight === undefined ? {} : { weight: tip.weight }),
  }));
}

const tipsCache = new Map<SupportedLocale, readonly TuiTip[]>();

/** Tips for the active locale, memoised. Follows a language switch. */
export function getTuiTips(locale: SupportedLocale = getActiveLocale()): readonly TuiTip[] {
  const cached = tipsCache.get(locale);
  if (cached) return cached;
  const built = buildTuiTips(locale);
  tipsCache.set(locale, built);
  return built;
}

export function invalidateTuiTipsCache(): void {
  tipsCache.clear();
  rotationCache.clear();
}

// A language switch must not leave stale tips behind.
onLocaleChanged(invalidateTuiTipsCache);

export const TUI_TIP_ROTATION_INTERVAL_MS = 30_000;

/** Build a deterministic smooth weighted round-robin sequence. */
export function buildWeightedTuiTipRotation(tips: readonly TuiTip[]): readonly TuiTip[] {
  const items = tips.map((tip) => ({
    tip,
    weight: Math.max(1, Math.trunc(tip.weight ?? 1)),
    current: 0,
  }));
  const totalWeight = items.reduce((total, item) => total + item.weight, 0);
  const rotation: TuiTip[] = [];

  for (let index = 0; index < totalWeight; index += 1) {
    let selected = items[0];
    for (const item of items) {
      item.current += item.weight;
      if (!selected || item.current > selected.current) selected = item;
    }
    if (!selected) break;
    selected.current -= totalWeight;
    rotation.push(selected.tip);
  }

  return rotation;
}

const rotationCache = new Map<SupportedLocale, readonly TuiTip[]>();

function rotationFor(tips: readonly TuiTip[]): readonly TuiTip[] {
  const locale = getActiveLocale();
  const cached = rotationCache.get(locale);
  // Only reuse the memo when the caller passed the default set for this locale.
  if (cached && tips === getTuiTips(locale)) return cached;
  const built = buildWeightedTuiTipRotation(tips);
  rotationCache.set(locale, built);
  return built;
}

export function selectTuiTipAt(
  nowMs: number,
  tips: readonly TuiTip[] = getTuiTips(),
): TuiTip | undefined {
  const rotation = rotationFor(tips);
  if (rotation.length === 0) return undefined;

  const bucket = Math.floor(nowMs / TUI_TIP_ROTATION_INTERVAL_MS);
  const index = ((bucket % rotation.length) + rotation.length) % rotation.length;
  return rotation[index];
}
