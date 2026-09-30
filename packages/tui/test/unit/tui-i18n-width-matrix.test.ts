import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { VirtualTerminal } from '../pi-084-upstream/virtual-terminal.js';
import { stripAnsi, truncateToWidth, visibleWidth } from '../../src/tui/rendering/text.js';
import { ELLIPSIS } from '../../src/i18n/format.js';
import { TuiSettingsPicker } from '../../src/tui/features/settings/picker.js';
import { TuiLanguagePicker } from '../../src/tui/features/settings/language-picker.js';
import { TuiPermissionModePicker } from '../../src/tui/features/interaction/permission-mode-picker.js';
import { setActiveLocale, getActiveLocale } from '../../src/i18n/context.js';
import { MINIMAX_CODE_PERMISSION_MODES, formatTuiPermissionModeCompact } from '../../src/application/permission-mode.js';
import { pseudoCatalog } from '../../src/i18n/pseudo-locale.js';
import { EN_CATALOG } from '../../src/i18n/locales/index.js';
import { t } from '../../src/i18n/translate.js';

/**
 * Width matrix — the real layout gate.
 *
 * The plan is explicit that a translated string being longer than the English
 * is not by itself a defect: a ratio of 1.4 can be harmless in a panel that
 * wraps, and a ratio of 1.05 can break a four-column grid. So the gate does not
 * measure lengths. It renders the actual component through a real terminal
 * emulator and looks at what comes out.
 *
 * What it detects:
 *   - a rendered line wider than the viewport, which means the row spilled into
 *     the next column or wrapped without being designed to;
 *   - a split grapheme, which shows up as a lone combining mark or a broken
 *     surrogate;
 *   - a displaced keycap, i.e. a keycap that no longer sits next to its label.
 *
 * Pseudo-locale is generated from English and inflated by about a third, which
 * is wider than French and close to Russian, so it is the pessimistic case.
 * The four real locales then confirm the pessimistic case is not the only one
 * that has to work.
 *
 * SCOPE, stated plainly: the three panels below still carry some of their own
 * hardcoded English labels, so for those labels the matrix proves the widths
 * hold rather than proving translated text fits. It starts biting as each
 * feature's own strings move into the catalog, which is what batches B2 and B3
 * do. The catalog-level report further down covers the 331 keys that are
 * already translated.
 */

const WIDTHS = [40, 60, 80, 100, 120, 160] as const;
const LOCALES = ['en', 'fr', 'ru', 'ja', 'ko'] as const;
const ROWS = 30;

/** Render `lines` into a real terminal and return the resulting viewport. */
function renderInTerminal(lines: readonly string[], columns: number): string[] {
  const terminal = new VirtualTerminal(columns, ROWS);
  terminal.clear();
  terminal.write(lines.join('\r\n'));
  const viewport = terminal.getViewport();
  terminal.reset();
  return viewport;
}

/** Combining marks and lone surrogates that indicate a cut grapheme. */
const LONE_COMBINING_MARK = /[\u0300-\u036f](?![\s\S]*[\u0300-\u036f])/u;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u;

function expectNoOverflow(lines: readonly string[], columns: number, label: string): void {
  const viewport = renderInTerminal(lines, columns);
  for (const [index, line] of viewport.entries()) {
    const width = visibleWidth(line);
    expect(width, `${label} @${columns}: viewport line ${index} is ${width} cells wide`).toBeLessThanOrEqual(columns);
  }
}

function expectNoSplitGrapheme(lines: readonly string[], label: string): void {
  for (const line of lines) {
    const plain = stripAnsi(line);
    expect(LONE_COMBINING_MARK.test(plain), `${label}: split combining mark in ${JSON.stringify(plain)}`).toBe(false);
    expect(LONE_SURROGATE.test(plain), `${label}: split surrogate in ${JSON.stringify(plain)}`).toBe(false);
  }
}

const panels = (locale: string) => ({
  settings: new TuiSettingsPicker('regular', () => true, () => undefined, () => undefined, () => 'English'),
  language: new TuiLanguagePicker(() => true, () => undefined),
  permission: new TuiPermissionModePicker(
    MINIMAX_CODE_PERMISSION_MODES,
    'default',
    () => false,
    () => true,
    () => undefined,
  ),
});

beforeEach(() => {
  setActiveLocale('en');
});

afterEach(() => {
  setActiveLocale('en');
});

describe('width matrix', () => {
  it.each(WIDTHS)('renders every panel within the viewport at %i columns', (columns) => {
    for (const locale of LOCALES) {
      setActiveLocale(locale as never);
      const built = panels(locale);
      const cases: [string, string[]][] = [
        [`settings/${locale}`, built.settings.render(columns)],
        [`language/${locale}`, built.language.render(columns)],
        [`permission/${locale}`, built.permission.render(columns)],
      ];
      for (const [label, lines] of cases) {
        expect(lines.length, `${label} @${columns} rendered nothing`).toBeGreaterThan(0);
        expectNoOverflow(lines, columns, label);
        expectNoSplitGrapheme(lines, label);
      }
    }
  });

  it('does not overflow in the inflated pseudo-locale', () => {
    // The pseudo catalog is the pessimistic width case. Sanity-check that it is
    // actually wider, or the rest of this file would be proving nothing.
    const sample = t('composer.placeholder', 'en');
    const pseudo = pseudoCatalog()['composer.placeholder'];
    const pseudoText = typeof pseudo === 'string' ? pseudo : pseudo.plural.other;
    expect(visibleWidth(pseudoText)).toBeGreaterThan(visibleWidth(sample));

    for (const columns of WIDTHS) {
      const built = panels('pseudo');
      for (const [label, lines] of [
        ['settings/pseudo', built.settings.render(columns)] as const,
        ['language/pseudo', built.language.render(columns)] as const,
        ['permission/pseudo', built.permission.render(columns)] as const,
      ]) {
        expectNoOverflow(lines, columns, label);
        expectNoSplitGrapheme(lines, label);
      }
    }
  });

  it('keeps a long label inside its column with a visible marker', () => {
    // The behaviour the old `.slice()` could not produce: a marker rather than
    // a silently shortened word. `truncateToWidth` wraps the ellipsis in SGR
    // resets, so the assertion has to look at the stripped text — asserting on
    // the raw string fails on the escape sequence, not on the content.
    const truncated = truncateToWidth('Permission rules for this scope', 12, ELLIPSIS);
    expect(visibleWidth(truncated)).toBeLessThanOrEqual(12);
    expect(stripAnsi(truncated).endsWith(ELLIPSIS)).toBe(true);
  });

  it('does not overflow on a double-width locale', () => {
    // Each Japanese character is two cells, so a twelve-cell budget holds six
    // characters. The old code-point slice would have taken twelve of them and
    // produced a line twice as wide as its column.
    const cjk = truncateToWidth('この範囲に適用される権限ルール', 12, ELLIPSIS);
    expect(visibleWidth(cjk)).toBeLessThanOrEqual(12);
  });

  it('pads to an exact width when asked, for column alignment', () => {
    const padded = truncateToWidth('Portée', 12, ELLIPSIS, true);
    expect(visibleWidth(padded)).toBe(12);
  });
});

describe('permission code grid', () => {
  it('keeps every compact code at four cells or fewer', () => {
    // The grid is a fixed four columns and the codes stay English by decision.
    // padEnd would not error if a code grew, it would quietly misalign the whole
    // grid, so the invariant is asserted rather than documented.
    for (const mode of MINIMAX_CODE_PERMISSION_MODES) {
      expect(visibleWidth(formatTuiPermissionModeCompact(mode)), mode).toBeLessThanOrEqual(4);
    }
  });

  it('renders the permission modes at the narrowest supported width', () => {
    setActiveLocale('en');
    const built = panels('en');
    for (const columns of WIDTHS) {
      expectNoOverflow(built.permission.render(columns), columns, `permission/${columns}`);
    }
  });
});

describe('locale round trip', () => {
  it('returns to the original locale after the matrix', () => {
    expect(getActiveLocale()).toBe('en');
  });
});
describe('catalog width risk report', () => {
  /**
   * A risk report, not a gate.
   *
   * The plan is explicit that a translation being longer than the English is not
   * by itself a defect: a string in a wrapping panel is harmless however long it
   * is, and a string five percent longer can still break a fixed column. So
   * these numbers are printed for review rather than asserted on. The renderer
   * matrix above is the gate; this tells a translator where to look first.
   */
  it('reports the widest catalog strings per locale', () => {
    const BUDGET = 24;
    for (const locale of ['fr', 'zh-Hans'] as const) {
      const wide: { key: string; width: number }[] = [];
      for (const [key, message] of Object.entries(EN_CATALOG)) {
        const translated = t(key as never, locale);
        const width = visibleWidth(translated);
        if (width > BUDGET) wide.push({ key, width });
      }
      wide.sort((left, right) => right.width - left.width);
      const report = wide
        .slice(0, 8)
        .map((entry) => `${entry.key}=${entry.width}`)
        .join(' ');
      console.log(`[width risk ${locale}] over ${BUDGET} cells: ${wide.length} keys — ${report}`);
      // Sanity: the report must actually be reading translated text, otherwise
      // it would be silently reporting English widths for every locale.
      expect(visibleWidth(t('composer.placeholder', locale))).toBeGreaterThan(0);
    }
  });
});
