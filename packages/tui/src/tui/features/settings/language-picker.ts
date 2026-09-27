import { getActiveLocale } from '../../../i18n/context.js';
import { userSelectableLocales, LOCALE_ENDONYMS } from '../../../i18n/locales/index.js';
import type { LocalePreference, SupportedLocale } from '../../../i18n/schema.js';
import { getKeybindings, type TuiMode } from '../../engine/public.js';
import type { Component } from '../../rendering/component.js';
import { truncateToWidth, visibleWidth } from '../../rendering/text.js';
import { tuiChalk as chalk, tuiColors as colors } from '../../theme/runtime.js';
import {
  questionnaireFrameContentWidth,
  renderQuestionnaireFrame,
} from '../interaction/decision-frame.js';

/**
 * Language picker.
 *
 * Lists `system` first, then the locales this build can actually serve. Only
 * `complete` locales appear: offering a half-translated language is worse than
 * not offering it, because the interface would switch to it and then fall back
 * key by key.
 *
 * Labels are endonyms, so a reader who cannot read the current interface still
 * finds their own language in the list.
 */
export class TuiLanguagePicker implements Component {
  private selectedIndex: number;
  private currentPreference: LocalePreference;
  private readonly options: readonly LocalePreference[];

  constructor(
    private readonly onLocaleChange: (preference: LocalePreference) => boolean,
    private readonly onClose: () => void,
    currentPreference: LocalePreference = 'system',
    private readonly devLocales: readonly SupportedLocale[] = userSelectableLocales(),
  ) {
    this.options = ['system', ...this.devLocales];
    this.currentPreference = currentPreference;
    const index = this.options.indexOf(currentPreference);
    this.selectedIndex = index >= 0 ? index : 0;
  }

  handleInput(data: string): void {
    const keybindings = getKeybindings();
    if (keybindings.matches(data, 'tui.select.up')) {
      this.selectedIndex =
        this.selectedIndex === 0 ? this.options.length - 1 : this.selectedIndex - 1;
      return;
    }
    if (keybindings.matches(data, 'tui.select.down')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      return;
    }
    if (keybindings.matches(data, 'tui.select.confirm')) {
      const selected = this.options[this.selectedIndex];
      if (!selected) return;
      // Compare against the preference in force, not against the selection:
      // they are the same expression and would make this branch always take
      // the "already current" path, closing without ever applying.
      if (selected === this.currentPreference) {
        this.onClose();
        return;
      }
      if (this.onLocaleChange(selected)) {
        this.currentPreference = selected;
        this.onClose();
      }
      // Rejected: stay open so the user can pick something else or cancel.
      return;
    }
    if (keybindings.matches(data, 'tui.select.cancel')) this.onClose();
  }

  invalidate(): void {}

  render(width: number): string[] {
    const safeWidth = Math.max(0, Math.floor(width));
    if (safeWidth === 0) return [];
    const contentWidth = questionnaireFrameContentWidth(safeWidth);
    const compact = contentWidth < 56;
    const active = getActiveLocale();
    const selected = this.options[this.selectedIndex] ?? 'system';
    const meta =
      this.currentPreference === 'system'
        ? `Following system · ${LOCALE_ENDONYMS[active]}`
        : LOCALE_ENDONYMS[this.currentPreference];

    return renderQuestionnaireFrame(
      {
        title: 'Language',
        ...(safeWidth >= 42 ? { meta: chalk.hex(colors.muted)(meta) } : {}),
        body: [
          chalk.hex(colors.muted)('Choose the interface language.'),
          '',
          ...this.options.flatMap((option, index) =>
            renderLocaleRow(option, {
              active: option === this.currentPreference,
              focused: index === this.selectedIndex,
              compact,
              width: contentWidth,
            }),
          ),
        ],
        footer:
          safeWidth < 42
            ? '↑/↓ move · Enter · Esc close'
            : '↑/↓ select · Enter apply · Esc cancel',
      },
      safeWidth,
      'signal',
    );
  }
}

function renderLocaleRow(
  preference: LocalePreference,
  options: {
    readonly active: boolean;
    readonly focused: boolean;
    readonly compact: boolean;
    readonly width: number;
  },
): string[] {
  const label = preference === 'system' ? 'Automatic (system)' : LOCALE_ENDONYMS[preference];
  const prefix = options.focused ? chalk.bold.hex(colors.signal)('›') : ' ';
  const name = (options.focused ? chalk.bold.hex(colors.signal) : chalk.hex(colors.text))(label);
  const status = options.active ? chalk.hex(colors.signal)('● current') : '';

  if (options.compact) {
    return [fitWithRightMeta(`${prefix} ${name}`, status, options.width)];
  }
  return [fitWithRightMeta(`${prefix} ${name}`, status, options.width)];
}

function fitWithRightMeta(content: string, meta: string, width: number): string {
  if (!meta) return truncateToWidth(content, width, '');
  const gap = width - visibleWidth(content) - visibleWidth(meta);
  if (gap >= 2) return `${content}${' '.repeat(gap)}${meta}`;
  const contentWidth = Math.max(0, width - visibleWidth(meta) - 2);
  return `${truncateToWidth(content, contentWidth, '')}  ${meta}`;
}

/** Re-exported so the settings picker can label the entry without importing the context. */
export type { TuiMode };
