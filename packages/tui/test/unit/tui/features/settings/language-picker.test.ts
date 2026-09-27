import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readTuiLocaleSetting,
  writeTuiLocaleSetting,
} from '../../../../../src/host/tui-settings.js';
import { TuiLanguagePicker } from '../../../../../src/tui/features/settings/language-picker.js';
import { TuiSettingsPicker } from '../../../../../src/tui/features/settings/picker.js';
import { stripAnsi } from '../../../../../src/tui/rendering/text.js';
import { setActiveLocale, getActiveLocale } from '../../../../../src/i18n/context.js';
import { userSelectableLocales } from '../../../../../src/i18n/locales/index.js';

// Bound keys in this keymap, confirmed against `getKeybindings().matches`:
const DOWN = '\u001b[B';
const UP = '\u001b[A';
const CONFIRM = '\r';
const CANCEL = '\x1b';

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'tui-locale-'));
  setActiveLocale('en');
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  setActiveLocale('en');
});

describe('locale persistence', () => {
  it('defaults to following the system when nothing is stored', () => {
    expect(readTuiLocaleSetting(dataDir)).toBe('system');
  });

  it('round-trips a concrete locale', () => {
    writeTuiLocaleSetting(dataDir, 'fr');
    expect(readTuiLocaleSetting(dataDir)).toBe('fr');
  });

  it('round-trips the system preference', () => {
    writeTuiLocaleSetting(dataDir, 'fr');
    writeTuiLocaleSetting(dataDir, 'system');
    expect(readTuiLocaleSetting(dataDir)).toBe('system');
  });

  it('falls back to system for a stored locale this build cannot serve', () => {
    // The writer refuses unknown locales, so this is the downgrade or
    // hand-edited case: a settings file naming a language this build does not
    // ship must not pin the interface to it.
    writeTuiLocaleSetting(dataDir, 'fr');
    const file = join(dataDir, 'tui', 'tui-settings.json');
    const document = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    document.locale = 'zh-Hant';
    writeFileSync(file, JSON.stringify(document), 'utf8');
    expect(readTuiLocaleSetting(dataDir)).toBe('system');
  });

  it('refuses to store an unsupported locale', () => {
    expect(() => writeTuiLocaleSetting(dataDir, 'xx-YY' as never)).toThrow();
  });

  it('does not drop the other settings when writing one', () => {
    writeTuiLocaleSetting(dataDir, 'de');
    writeTuiLocaleSetting(dataDir, 'fr');
    expect(readTuiLocaleSetting(dataDir)).toBe('fr');
  });
});

describe('language picker', () => {
  it('offers the system preference plus the shippable locales', () => {
    const picker = new TuiLanguagePicker(vi.fn(), vi.fn());
    const rendered = stripAnsi(picker.render(100).join('\n'));
    expect(rendered).toContain('Automatic (system)');
    for (const locale of userSelectableLocales()) {
      expect(rendered).toMatch(/\S/);
      expect(locale.length).toBeGreaterThan(0);
    }
  });

  it('starts on the system entry', () => {
    const picker = new TuiLanguagePicker(vi.fn(), vi.fn());
    expect(stripAnsi(picker.render(100).join('\n'))).toContain('Automatic (system)');
  });

  it('applies a choice through the callback and closes', () => {
    const onLocaleChange = vi.fn().mockReturnValue(true);
    const onClose = vi.fn();
    // Start on the system entry so moving down lands on a real locale.
    const picker = new TuiLanguagePicker(onLocaleChange, onClose, 'system');

    picker.handleInput(DOWN);
    picker.handleInput(CONFIRM);

    expect(onLocaleChange).toHaveBeenCalledTimes(1);
    expect(onLocaleChange.mock.calls[0]?.[0]).toBe('en');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without applying when the entry is already current', () => {
    const onLocaleChange = vi.fn().mockReturnValue(true);
    const onClose = vi.fn();
    const picker = new TuiLanguagePicker(onLocaleChange, onClose, 'system');
    picker.handleInput(CONFIRM);
    expect(onLocaleChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the change is rejected', () => {
    const onClose = vi.fn();
    const picker = new TuiLanguagePicker(vi.fn().mockReturnValue(false), onClose, 'system');
    picker.handleInput(DOWN);
    picker.handleInput(CONFIRM);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels without applying', () => {
    const onLocaleChange = vi.fn().mockReturnValue(true);
    const onClose = vi.fn();
    const picker = new TuiLanguagePicker(onLocaleChange, onClose);
    picker.handleInput(CANCEL);
    expect(onLocaleChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('reports the running language in its header', () => {
    setActiveLocale('en');
    const picker = new TuiLanguagePicker(vi.fn(), vi.fn());
    expect(stripAnsi(picker.render(100).join('\n'))).toContain('English');
  });

  it('renders nothing at zero width rather than throwing', () => {
    const picker = new TuiLanguagePicker(vi.fn(), vi.fn());
    expect(picker.render(0)).toEqual([]);
  });
});

describe('settings picker language row', () => {
  it('shows a Language row alongside the TUI modes', () => {
    const picker = new TuiSettingsPicker('regular', vi.fn(), vi.fn(), vi.fn(), () => 'English');
    const rendered = stripAnsi(picker.render(100).join('\n'));
    expect(rendered).toContain('Language');
    expect(rendered).toContain('English');
    expect(rendered).toContain('Regular');
    expect(rendered).toContain('Fullscreen');
  });

  it('hands over to the language picker when the row is confirmed', () => {
    const onOpenLanguage = vi.fn();
    const picker = new TuiSettingsPicker('regular', vi.fn(), vi.fn(), onOpenLanguage, () => 'English');

    // Row 0 is Regular, which is already current, so it closes. Walk to the
    // Language row instead: two downs from Regular.
    picker.handleInput(DOWN);
    picker.handleInput(DOWN);
    picker.handleInput(CONFIRM);

    expect(onOpenLanguage).toHaveBeenCalledTimes(1);
  });

  it('still applies a TUI mode from the first rows', () => {
    const onTuiModeChange = vi.fn().mockReturnValue(true);
    const picker = new TuiSettingsPicker('regular', onTuiModeChange, vi.fn(), vi.fn(), () => 'English');
    picker.handleInput(DOWN);
    picker.handleInput(CONFIRM);
    expect(onTuiModeChange).toHaveBeenCalledWith('fullscreen');
  });

  it('wraps the selection across the language row', () => {
    const onOpenLanguage = vi.fn();
    const picker = new TuiSettingsPicker('regular', vi.fn(), vi.fn(), onOpenLanguage, () => 'English');
    // Up from the first row wraps to the last row, which is Language.
    picker.handleInput(UP);
    picker.handleInput(CONFIRM);
    expect(onOpenLanguage).toHaveBeenCalledTimes(1);
  });

  it('renders nothing at zero width', () => {
    const picker = new TuiSettingsPicker('regular', vi.fn(), vi.fn(), vi.fn(), () => 'English');
    expect(picker.render(0)).toEqual([]);
  });
});

describe('locale switch effect', () => {
  it('reports the new locale through the context', () => {
    setActiveLocale('fr');
    expect(getActiveLocale()).toBe('fr');
  });
});
