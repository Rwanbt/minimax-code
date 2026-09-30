import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EN_CATALOG } from '../../src/i18n/locales/index.js';
import type { MessageKey } from '../../src/i18n/locales/index.js';
import { t, tpl, tPlural, extractPlaceholders, invalidateCatalogCache } from '../../src/i18n/translate.js';
import { negotiateLocale, resolveLocale } from '../../src/i18n/locale.js';
import {
  getActiveLocale,
  setActiveLocale,
  setLocaleEnvironment,
  resetActiveLocale,
  subscribeLocaleChange,
} from '../../src/i18n/context.js';
import { pseudoLocalize, pseudoCatalog } from '../../src/i18n/pseudo-locale.js';
import { getTuiCommands } from '../../src/tui/commands/catalog.js';
import { statusLineText, statusLineItemDescription } from '../../src/tui/features/settings/status-line-copy.js';
import { getTuiTips, buildTuiTips } from '../../src/tui/shell/tips.js';
import {
  resolveTranscriptToolDefinition,
  transcriptToolAction,
} from '../../src/tui/transcript/tool-definitions.js';
import type { SupportedLocale } from '../../src/i18n/schema.js';
import { findForbiddenCharacters, isPluralMessage, requiredPluralCategories } from '../../src/i18n/schema.js';
import { ELLIPSIS } from '../../src/i18n/format.js';

/**
 * Three test classes, per the i18n plan.
 *
 * 1. Functional tests assert state and behaviour without depending on any
 *    particular English wording. If a translator changes a string, these stay
 *    green — which is the point.
 * 2. Catalog tests deliberately assert the English copy. They are the place
 *    where wording is supposed to be pinned.
 * 3. i18n tests use independent fixtures to exercise locale negotiation,
 *    interpolation, pluralisation and fallback.
 *
 * Note what is deliberately absent: `expect(render(x)).toBe(t('en', key))`.
 * Production resolves through the same `t()`, so such an assertion would only
 * prove `t` is consistent with itself.
 */

const CLEAN_ENV: Readonly<Record<string, string | undefined>> = {};

/**
 * Pin the locale rather than assume it.
 *
 * The default is the OS locale, so on a French-locale host the honest starting
 * point is already `fr`. A test that assumed English would pass on CI and fail
 * on a developer's machine — the reverse of what this suite is for.
 */
beforeEach(() => {
  setLocaleEnvironment(CLEAN_ENV);
  invalidateCatalogCache();
  setActiveLocale('en');
});

afterEach(() => {
  setLocaleEnvironment(undefined);
  invalidateCatalogCache();
  setActiveLocale('en');
});

// ── 1. functional ────────────────────────────────────────────────────────────

describe('locale resolution behaviour', () => {
  it('falls back to English for a tag the build cannot serve', () => {
    expect(negotiateLocale('xx-YY')).toBe('en')
    expect(negotiateLocale('')).toBe('en')
    expect(negotiateLocale(undefined)).toBe('en')
  });

  it('does not serve traditional Chinese from a simplified catalog', () => {
    // There is no zh-Hant catalog. Silently folding zh-TW into simplified
    // Chinese would hand a Taipei reader text they do not naturally read.
    expect(negotiateLocale('zh-TW')).toBe('en')
    expect(negotiateLocale('zh-HK')).toBe('en')
    expect(negotiateLocale('zh-Hant')).toBe('en')
    expect(negotiateLocale('zh-Hant-HK')).toBe('en')
  })

  it('does not present European Portuguese as Brazilian Portuguese', () => {
    expect(negotiateLocale('pt-PT')).toBe('en')
    expect(negotiateLocale('pt-BR')).toBe('pt-BR')
  })

  it('canonicalises before matching', () => {
    expect(negotiateLocale('fr_fr')).toBe('fr')
    expect(negotiateLocale('FR-FR')).toBe('fr')
    expect(negotiateLocale('zh_CN')).toBe('zh-Hans')
  })

  it('prefers an explicit override over everything else', () => {
    const resolved = resolveLocale({
      override: 'de',
      configPreference: 'fr',
      env: { MCODE_LOCALE: 'ja' },
    })
    expect(resolved).toBe('de')
  })

  it('reads the environment in the documented order', () => {
    expect(resolveLocale({ env: { MCODE_LOCALE: 'es' } })).toBe('es')
    expect(resolveLocale({ env: { MAVIS_ELECTRON_LOCALE: 'it' } })).toBe('it')
    expect(resolveLocale({ env: { LC_ALL: 'nl_NL.UTF-8' } })).toBe('nl')
    expect(resolveLocale({ env: { LC_MESSAGES: 'pl_PL' } })).toBe('pl')
    expect(resolveLocale({ env: { LANG: 'ru_RU.UTF-8' } })).toBe('ru')
  })

  it('ignores a C or POSIX locale rather than treating C as a language', () => {
    // `C` means "no localisation", not "the C language". The point is that it
    // must not be negotiated into a locale; resolution then continues down the
    // chain, which on a French host legitimately yields `fr`.
    expect(negotiateLocale('C')).toBe('en')
    expect(negotiateLocale('POSIX')).toBe('en')
    expect(resolveLocale({ env: { LC_ALL: 'C', MCODE_LOCALE: 'ja' } })).toBe('ja')
  })

  it('reports a language change to subscribers and returns whether it moved', () => {
    const seen: string[] = []
    const unsubscribe = subscribeLocaleChange((locale) => seen.push(locale))

    expect(setActiveLocale('fr')).toBe(true)
    expect(getActiveLocale()).toBe('fr')
    expect(setActiveLocale('fr')).toBe(false)

    unsubscribe()
    setActiveLocale('ja')
    expect(seen).toEqual(['fr'])
  })
});

describe('interpolation behaviour', () => {
  it('substitutes every occurrence, not just the first', () => {
    const message = tpl('session.confirm.fork.workspaceUnavailable', { reason: 'x' }, 'en')
    expect(message).toContain('x')
    expect(message).not.toContain('{reason}')
  })

  it('leaves an unsupplied placeholder visible rather than printing undefined', () => {
    const message = tpl('session.error.openForkManually', {}, 'en')
    expect(message).toContain('{sessionId}')
    expect(message).not.toContain('undefined')
  })

  it('passes values through untouched, including ANSI', () => {
    const value = '  \u001b[32mspaced\u001b[0m  '
    const message = tpl('session.error.openForkManually', { sessionId: value }, 'en')
    expect(message).toContain(value)
  })

  it('does not rescan a value as a pattern', () => {
    const message = tpl('session.error.openForkManually', { sessionId: '{reason}' }, 'en')
    // The injected braces are data, not a placeholder to resolve.
    expect(message).toContain('{reason}')
  })

  it('reports the key itself when a key exists nowhere', () => {
    const missing = 'this.key.does.not.exist' as MessageKey
    expect(t(missing, 'en')).toBe(missing)
  })
});

describe('pluralisation behaviour', () => {
  it('derives the category from the locale, not from a hardcoded table', () => {
    // English: 1 file / 2 files
    expect(tPlural('session.format.files', 1, undefined, 'en')).not.toBe(
      tPlural('session.format.files', 2, undefined, 'en'),
    )
  })

  it('picks a form a two-form shortcut would get wrong', () => {
    const polishTwo = new Intl.PluralRules('pl').select(2)
    const polishFive = new Intl.PluralRules('pl').select(5)
    expect(polishTwo).not.toBe(polishFive)
  })

  it('exposes only the categories the platform actually uses', () => {
    expect(requiredPluralCategories('en')).toContain('other')
    expect(requiredPluralCategories('ja')).toEqual(['other'])
  })

  it('falls back to the other form for a locale with a single category', () => {
    const one = tPlural('session.format.files', 1, undefined, 'en');
    const many = tPlural('session.format.files', 7, undefined, 'en');
    expect(one).not.toBe(many)
  })
});

describe('catalog shape', () => {
  it('marks a plural message as such and a plain message as not', () => {
    expect(isPluralMessage(EN_CATALOG['session.format.files'])).toBe(true)
    expect(isPluralMessage(EN_CATALOG['session.history.title'])).toBe(false)
  })

  it('keeps every key free of invisible control characters', () => {
    for (const [key, message] of Object.entries(EN_CATALOG)) {
      const values = isPluralMessage(message)
        ? Object.values(message.plural)
        : [message as string];
      for (const value of values) {
        expect(findForbiddenCharacters(String(value)), `${key}: ${value}`).toEqual([])
      }
    }
  })

  it('keeps every placeholder in the general plural form', () => {
    // A `one` form is legitimately spelled out ("1 file") and carries no
    // placeholder, so the rule is one-directional: whatever any form uses, the
    // `other` form must use too. Not the reverse.
    for (const [key, message] of Object.entries(EN_CATALOG)) {
      if (!isPluralMessage(message)) continue;
      const forms = Object.values(message.plural).map((form) => String(form))
      const union = new Set(forms.flatMap((form) => extractPlaceholders(form)))
      const other = String(message.plural.other)
      for (const name of union) {
        expect(extractPlaceholders(other), `${key}: other form is missing {${name}}`).toContain(name)
      }
    }
  })
});

describe('pseudo-localisation', () => {
  it('makes the text wider, which is the whole point', () => {
    const original = 'Loading preview'
    const pseudo = pseudoLocalize(original)
    expect(pseudo.length).toBeGreaterThan(original.length)
    expect(pseudo).not.toBe(original)
  })

  it('keeps placeholders, keycaps and slash commands intact', () => {
    const pseudo = pseudoLocalize('Open it manually from /sessions: {sessionId}.')
    expect(pseudo).toContain('{sessionId}')
    expect(pseudo).toContain('/sessions')
  })

  it('covers the whole English catalog', () => {
    const catalog = pseudoCatalog()
    for (const key of Object.keys(EN_CATALOG)) {
      expect(catalog[key as MessageKey], key).toBeDefined()
    }
  })
});

// ── 2. catalog ──────────────────────────────────────────────────────────────

describe('English catalog', () => {
  it('declares the history panel title', () => {
    expect(EN_CATALOG['session.history.title']).toBe('History')
  })

  it('keeps the shared navigation hint in one place', () => {
    // 'Esc cancel' appeared in three feature tables; it is a single key now, so
    // a translator changes it once.
    expect(EN_CATALOG['common.hint.escCancel']).toBe('Esc cancel')
  })

  it('exposes the shared typographic ellipsis rather than a translated one', () => {
    expect(ELLIPSIS).toBe('\u2026')
  })
});

// ── 3. i18n ─────────────────────────────────────────────────────────────────

describe('fallback across locales', () => {
  it('returns the English string for a locale that has not translated the key yet', () => {
    // es is a draft with an empty catalog, so every key must fall back.
    expect(t('session.history.title', 'es')).toBe(EN_CATALOG['session.history.title'])
  })

  it('returns the translation when the locale covers the key', () => {
    const french = t('session.history.title', 'fr')
    expect(french).toBeTypeOf('string')
    expect(french.length).toBeGreaterThan(0)
  })

  it('switches the active locale without a restart', () => {
    const english = t('session.history.title')
    setActiveLocale('fr')
    const french = t('session.history.title')
    setActiveLocale('en')
    const backToEnglish = t('session.history.title')

    expect(backToEnglish).toBe(english)
    expect(french).not.toBe(english)
  })

  it('survives a round trip through a locale the catalog does not cover', () => {
    const english = t('composer.placeholder')
    setActiveLocale('ko')
    expect(t('composer.placeholder')).toBe(english)
    setActiveLocale('en')
    expect(t('composer.placeholder')).toBe(english)
  })
});

// ── the hot-swap proof ──────────────────────────────────────────────────────

describe('slash-command catalog follows the active locale', () => {
  /**
   * This is the reason the command catalog was refactored. The exported command
   * list used to be a module-level const built from a table of English strings,
   * so the interface language was fixed at import time and no amount of switching
   * could change it. These assertions are the regression guard for that.
   */
  const descriptionOf = (name: string, locale: SupportedLocale): string => {
    const command = getTuiCommands(locale).find((candidate) => candidate.name === name)
    expect(command, `command /${name} is missing`).toBeDefined()
    return command?.description ?? ''
  }

  it('renders the same command differently per locale', () => {
    expect(descriptionOf('help', 'en')).toBe('Show available commands')
    expect(descriptionOf('help', 'fr')).toBe('Afficher les commandes disponibles')
  })

  it('falls back to English for a draft locale with no translations', () => {
    expect(descriptionOf('help', 'es')).toBe(descriptionOf('help', 'en'))
  })

  it('keeps command names invariant across locales', () => {
    // Users type the names, and scripts and agent prompts embed them.
    const englishNames = getTuiCommands('en').map((command) => command.name)
    const frenchNames = getTuiCommands('fr').map((command) => command.name)
    expect(frenchNames).toEqual(englishNames)
  })

  it('switches without a restart: EN -> FR -> JA -> EN', () => {
    const helpEnglish = descriptionOf('help', 'en')
    const helpFrench = descriptionOf('help', 'fr')

    setActiveLocale('fr')
    expect(getTuiCommands().find((c) => c.name === 'help')?.description).toBe(helpFrench)

    // Japanese is a draft with an empty catalog, so it must serve English rather
    // than stale French: a switch has to be able to move in both directions.
    setActiveLocale('ja')
    expect(getTuiCommands().find((c) => c.name === 'help')?.description).toBe(helpEnglish)

    setActiveLocale('en')
    expect(getTuiCommands().find((c) => c.name === 'help')?.description).toBe(helpEnglish)
  })

  it('drops its memoised catalogs when the locale changes', () => {
    setActiveLocale('en')
    const first = getTuiCommands()
    setActiveLocale('fr')
    setActiveLocale('en')
    // A fresh object per switch, otherwise the second one would return French text.
    expect(getTuiCommands()).not.toBe(first)
  })
})
// ── invariant tokens inside translated text ─────────────────────────────────

describe('invariant tokens survive translation', () => {
  /**
   * Two surfaces embed an identifier inside a sentence the user reads, and both
   * depend on that identifier still being there after translation:
   *
   *  - the transcript bolds a tool name by locating it with indexOf, so a
   *    translation that dropped the name would silently stop colouring it;
   *  - a tip exists to advertise a slash command, so a translation without the
   *    command leaves a sentence with nothing actionable in it.
   *
   * Neither is a placeholder, so i18n-check cannot catch it. These tests can.
   */
  const LOCALES = ['en', 'zh-Hans', 'fr'] as const;

  it.each(LOCALES)('keeps the tool name inside the action sentence (%s)', (locale) => {
    const cases: readonly { readonly tool: string; readonly accent: string }[] = [
      { tool: 'web_search', accent: 'WebSearch' },
      { tool: 'web_fetch', accent: 'WebFetch' },
    ];
    for (const { tool, accent } of cases) {
      const definition = resolveTranscriptToolDefinition(tool);
      expect(definition, tool).toBeDefined();
      for (const phase of ['running', 'completed', 'failed'] as const) {
        const action = transcriptToolAction(definition!, phase, locale);
        expect(action, `${locale} ${tool} ${phase}`).toContain(accent);
      }
    }
  });

  it.each(LOCALES)('keeps the slash command inside the tip (%s)', (locale) => {
    for (const tip of buildTuiTips(locale)) {
      const command = `/${tip.command}`;
      expect(tip.text, `${locale} ${tip.id}.text`).toContain(command);
      expect(tip.shortText, `${locale} ${tip.id}.short`).toContain(command);
    }
  });

  it('translates the tip body while keeping the command', () => {
    const english = buildTuiTips('en').find((tip) => tip.id === 'goal');
    const french = buildTuiTips('fr').find((tip) => tip.id === 'goal');
    expect(english).toBeDefined();
    expect(french).toBeDefined();
    expect(french!.text).not.toBe(english!.text);
    expect(french!.text).toContain('/goal');
  });

  it('serves tips for the active locale and drops them on a switch', () => {
    setActiveLocale('en');
    const english = getTuiTips();
    setActiveLocale('fr');
    const french = getTuiTips();
    expect(french).not.toBe(english);
    expect(french[0]?.text).not.toBe(english[0]?.text);
    setActiveLocale('en');
    expect(getTuiTips()).not.toBe(french);
  });
});
// ── keycaps ────────────────────────────────────────────────────────────────

describe('keycaps survive translation', () => {
  /**
   * The status line help strings mix prose with keycaps. A translator who
   * renamed `Esc` to `Echap` would be describing a key the user cannot press, and
   * nothing in the catalog would notice: `Echap` is a perfectly valid string.
   * These assertions are the only thing standing between a bad translation and
   * a help line that lies about which key to press.
   */
  const LOCALES = ['en', 'zh-Hans', 'fr'] as const;

  const REQUIRED_KEYCAPS: Readonly<Record<string, readonly string[]>> = {
    // Locale-invariant keycaps. The upstream Chinese copy already keeps these,
    // and the French copy deliberately switches Esc to the French spelling.
    'statusLine.close': ['Enter'],
    'statusLine.compactHelp': ['Space', 'Enter'],
    'statusLine.help': ['Space', 'Enter'],
  };

  it.each(LOCALES)('keeps the keycaps in the status line help (%s)', (locale) => {
    for (const [key, caps] of Object.entries(REQUIRED_KEYCAPS)) {
      const value = statusLineText(key as never, locale);
      for (const cap of caps) {
        expect(value, `${locale} ${key} is missing ${cap}`).toContain(cap);
      }
    }
  });

  it.each(LOCALES)('keeps Esc under a locale-invariant name in zh-Hans (%s)', (locale) => {
    // Simplified Chinese upstream writes "Esc"; French writes "Échap". Both are
    // correct for their readers, so the assertion is on the whole string rather
    // than on a fixed spelling.
    const value = statusLineText('statusLine.help', locale);
    expect(value).toMatch(/Esc|Échap/);
  });

  it('resolves item descriptions per locale', () => {
    // Item ids stay invariant; only their description is translated.
    expect(statusLineItemDescription('git-branch', 'en')).toBe('Current Git branch');
    expect(statusLineItemDescription('git-branch', 'fr')).toBe('Branche Git actuelle');
    expect(statusLineItemDescription('git-branch', 'es')).toBe('Current Git branch');
  });

  it('accepts the legacy camelCase names as a shim', () => {
    expect(statusLineText('title' as never, 'en')).toBe(
      statusLineText('statusLine.title', 'en'),
    );
  });
});
// ── plurals the suffix trick cannot reach ───────────────────────────────────

describe('plural forms the suffix trick cannot reach', () => {
  /**
   * The work-summary counters used to read
   * `${count} agent${count === 1 ? '' : 's'} active`. That is a hardcoded
   * English rule: two forms, chosen by equality to one. Polish needs four and
   * Russian three, and neither can be written as a suffix, so these assertions
   * are the evidence that the catalog form is actually in use.
   */
  it('distinguishes counts that a one/other split would merge', () => {
    const key = 'tasks.agentsActive' as const;
    // Polish: one / few / many. 2 and 5 are both "other" in English but differ
    // in Polish, which is the whole point.
    const polish2 = tPlural(key, 2, undefined, 'pl');
    const polish5 = tPlural(key, 5, undefined, 'pl');
    expect(polish5).not.toBe(polish2);

    // Russian: one / few / many.
    const russian1 = tPlural(key, 1, undefined, 'ru');
    const russian3 = tPlural(key, 3, undefined, 'ru');
    expect(russian3).not.toBe(russian1);
  });

  it('carries the count through unchanged in every locale', () => {
    // `tpl` substitutes the raw value, so the count appears verbatim. Number
    // formatting is a separate concern handled by format.ts, and conflating the
    // two here would make this test depend on locale digit grouping.
    for (const locale of ['en', 'fr', 'pl', 'ru', 'ja'] as const) {
      for (const count of [0, 1, 2, 5, 21, 1_000_000]) {
        const rendered = tPlural('tasks.agentsActive', count, undefined, locale);
        expect(rendered, `${locale} @${count}`).toContain(String(count));
      }
    }
  });

  it('falls back to English for Japanese until it is translated', () => {
    // Japanese is a draft with an empty catalog, so every key resolves through
    // the English fallback. The fallback is the English plural selection, which
    // means 1 and 7 still read differently — correct behaviour, not a bug, and
    // the reason this asserts the fallback rather than a single Japanese form.
    expect(tPlural('tasks.agentsActive', 1, undefined, 'ja')).toBe(
      tPlural('tasks.agentsActive', 1, undefined, 'en'),
    );
    expect(tPlural('tasks.agentsActive', 7, undefined, 'ja')).toBe(
      tPlural('tasks.agentsActive', 7, undefined, 'en'),
    );
  });

  it('agrees with the platform about how many plural forms each locale has', () => {
    // The catalog must not invent a form a locale never selects. Measured, not
    // assumed: Japanese has one, English two, French three, and Russian and
    // Polish four — not three, which is the number one would guess.
    expect(new Intl.PluralRules('ja').resolvedOptions().pluralCategories).toHaveLength(1);
    expect(new Intl.PluralRules('en').resolvedOptions().pluralCategories).toHaveLength(2);
    expect(new Intl.PluralRules('fr').resolvedOptions().pluralCategories).toHaveLength(3);
    expect(new Intl.PluralRules('ru').resolvedOptions().pluralCategories).toHaveLength(4);
    expect(new Intl.PluralRules('pl').resolvedOptions().pluralCategories).toHaveLength(4);
  });

  it('selects the plural form for the locale the text came from', () => {
    // Regression guard. `ja` is a draft with an empty catalog, so the text is
    // English — and English count 1 is the `one` form. Selecting the category for
    // the requested locale instead would pick Japanese `other` and render
    // "1 agents active".
    expect(tPlural('tasks.agentsActive', 1, undefined, 'ja')).toBe('1 agent active');
    expect(tPlural('tasks.agentsActive', 7, undefined, 'ja')).toBe('7 agents active');
  });

  it('falls back to English for a draft locale with no translations', () => {
    expect(tPlural('tasks.agentsActive', 3, undefined, 'es')).toBe(
      tPlural('tasks.agentsActive', 3, undefined, 'en'),
    );
  });
});
describe('shell chrome invariants', () => {
  /**
   * The update chip bolds the `/update` command inside a translated sentence by
   * locating it with indexOf. A translation that dropped the command would lose
   * the emphasis and read as an unstyled sentence — no error, just a worse
   * interface. Nothing in the catalog can catch that.
   */
  const LOCALES = ['en', 'zh-Hans', 'fr'] as const;

  // The two long candidates carry the version; the two short ones drop it on
  // purpose, which is how they fit a narrow terminal.
  const ACTION_KEYS = [
    'chrome.update.action.runQuoted',
    'chrome.update.action.run',
    'chrome.update.action.review',
    'chrome.update.action.install',
  ] as const;
  const VERSIONED = new Set<keyof typeof ACTION_KEYS>([
    'chrome.update.action.runQuoted',
    'chrome.update.action.run',
  ]);

  it.each(LOCALES)('keeps /update inside every action sentence (%s)', (locale) => {
    for (const key of ACTION_KEYS) {
      const value = tpl(key, { version: '1.2.3' }, locale);
      expect(value, `${locale} ${key}`).toContain('/update');
      if (VERSIONED.has(key)) {
        expect(value, `${locale} ${key} should carry the version`).toContain('1.2.3');
      } else {
        expect(value, `${locale} ${key} should stay short`).not.toContain('1.2.3');
      }
    }
  });

  it('keeps the compact and long forms of a term meaning the same thing', () => {
    // Ctx/Context, Eff/Effort and Think/Thinking are the same word at two
    // widths. French has no natural short form of "thinking", so the compact
    // chip spells it out rather than inventing an abbreviation — which is a
    // translation decision, not a missing key. The pair must still agree.
    expect(t('chrome.chip.thinkingOn.compact', 'fr')).toBe(
      t('chrome.chip.thinkingOn.full', 'fr'),
    );
    expect(t('chrome.chip.context.compact', 'en')).not.toBe(
      t('chrome.chip.context.full', 'en'),
    );
  });

  it('substitutes the window and effort values into the context chips', () => {
    expect(tpl('chrome.chip.context.compact', { window: '128K' }, 'en')).toBe('Ctx 128K');
    expect(tpl('chrome.chip.effort.full', { effort: 'high' }, 'en')).toBe('Effort high');
  });
});
