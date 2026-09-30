import { type KeyId, matchesKey } from "./keys.js";
import type { MessageKey } from "../../i18n/locales/index.js";

/**
 * Global keybinding registry.
 * Downstream packages can add keybindings via declaration merging.
 */
export interface Keybindings {
	// Editor navigation and editing
	"tui.editor.cursorUp": true;
	"tui.editor.cursorDown": true;
	"tui.editor.historyPrevious": true;
	"tui.editor.historyNext": true;
	"tui.editor.cursorLeft": true;
	"tui.editor.cursorRight": true;
	"tui.editor.cursorWordLeft": true;
	"tui.editor.cursorWordRight": true;
	"tui.editor.cursorLineStart": true;
	"tui.editor.cursorLineEnd": true;
	"tui.editor.jumpForward": true;
	"tui.editor.jumpBackward": true;
	"tui.editor.pageUp": true;
	"tui.editor.pageDown": true;
	"tui.editor.deleteCharBackward": true;
	"tui.editor.deleteCharForward": true;
	"tui.editor.deleteWordBackward": true;
	"tui.editor.deleteWordForward": true;
	"tui.editor.deleteToLineStart": true;
	"tui.editor.deleteToLineEnd": true;
	"tui.editor.yank": true;
	"tui.editor.yankPop": true;
	"tui.editor.undo": true;
	// Generic input actions
	"tui.input.newLine": true;
	"tui.input.submit": true;
	"tui.input.tab": true;
	"tui.input.copy": true;
	// Generic selection actions
	"tui.select.up": true;
	"tui.select.down": true;
	"tui.select.pageUp": true;
	"tui.select.pageDown": true;
	"tui.select.confirm": true;
	"tui.select.cancel": true;
	// Alternate-screen viewport navigation
	"tui.altScreen.pageUp": true;
	"tui.altScreen.pageDown": true;
	"tui.altScreen.halfPageUp": true;
	"tui.altScreen.halfPageDown": true;
	"tui.altScreen.lineUp": true;
	"tui.altScreen.lineDown": true;
	"tui.altScreen.previousPrompt": true;
	"tui.altScreen.nextPrompt": true;
	"tui.altScreen.search": true;
	"tui.altScreen.searchNext": true;
	"tui.altScreen.searchPrevious": true;
	"tui.altScreen.searchClose": true;
	"tui.altScreen.top": true;
	"tui.altScreen.bottom": true;
}

export type Keybinding = keyof Keybindings;

export interface KeybindingDefinition {
	defaultKeys: KeyId | KeyId[];
	/**
	 * Catalog key for the human-readable description. The previous shape held a
	 * resolved English string, which a `t()` call could not replace: this table is a
	 * module-level const evaluated at import time, so the help panel would have kept
	 * showing English after a language switch.
	 */
	descriptionKey?: MessageKey;
}

export type KeybindingDefinitions = Record<string, KeybindingDefinition>;
export type KeybindingsConfig = Record<string, KeyId | KeyId[] | undefined>;

export const TUI_KEYBINDINGS = {
	"tui.editor.cursorUp": { defaultKeys: "up", descriptionKey: 'keybinding.moveCursorUp' },
	"tui.editor.cursorDown": { defaultKeys: "down", descriptionKey: 'keybinding.moveCursorDown' },
	"tui.editor.historyPrevious": {
		defaultKeys: [],
		descriptionKey: 'keybinding.selectPrevHistory',
	},
	"tui.editor.historyNext": {
		defaultKeys: [],
		descriptionKey: 'keybinding.selectNextHistory',
	},
	"tui.editor.cursorLeft": {
		defaultKeys: ["left", "ctrl+b"],
		descriptionKey: 'keybinding.moveCursorLeft',
	},
	"tui.editor.cursorRight": {
		defaultKeys: ["right", "ctrl+f"],
		descriptionKey: 'keybinding.moveCursorRight',
	},
	"tui.editor.cursorWordLeft": {
		defaultKeys: ["alt+left", "ctrl+left", "alt+b"],
		descriptionKey: 'keybinding.moveCursorWordLeft',
	},
	"tui.editor.cursorWordRight": {
		defaultKeys: ["alt+right", "ctrl+right", "alt+f"],
		descriptionKey: 'keybinding.moveCursorWordRight',
	},
	"tui.editor.cursorLineStart": {
		defaultKeys: ["home", "ctrl+home", "ctrl+a"],
		descriptionKey: 'keybinding.moveToLineStart',
	},
	"tui.editor.cursorLineEnd": {
		defaultKeys: ["end", "ctrl+end", "ctrl+e"],
		descriptionKey: 'keybinding.moveToLineEnd',
	},
	"tui.editor.jumpForward": {
		defaultKeys: "ctrl+]",
		descriptionKey: 'keybinding.jumpForwardToChar',
	},
	"tui.editor.jumpBackward": {
		defaultKeys: "ctrl+alt+]",
		descriptionKey: 'keybinding.jumpBackwardToChar',
	},
	"tui.editor.pageUp": { defaultKeys: ["pageUp", "ctrl+pageUp"], descriptionKey: 'keybinding.pageUp' },
	"tui.editor.pageDown": { defaultKeys: ["pageDown", "ctrl+pageDown"], descriptionKey: 'keybinding.pageDown' },
	"tui.editor.deleteCharBackward": {
		defaultKeys: "backspace",
		descriptionKey: 'keybinding.deleteCharBackward',
	},
	"tui.editor.deleteCharForward": {
		defaultKeys: ["delete", "ctrl+d"],
		descriptionKey: 'keybinding.deleteCharForward',
	},
	"tui.editor.deleteWordBackward": {
		defaultKeys: ["ctrl+w", "alt+backspace"],
		descriptionKey: 'keybinding.deleteWordBackward',
	},
	"tui.editor.deleteWordForward": {
		defaultKeys: ["alt+d", "alt+delete"],
		descriptionKey: 'keybinding.deleteWordForward',
	},
	"tui.editor.deleteToLineStart": {
		defaultKeys: "ctrl+u",
		descriptionKey: 'keybinding.deleteToLineStart',
	},
	"tui.editor.deleteToLineEnd": {
		defaultKeys: "ctrl+k",
		descriptionKey: 'keybinding.deleteToLineEnd',
	},
	"tui.editor.yank": { defaultKeys: "ctrl+y", descriptionKey: 'keybinding.yank' },
	"tui.editor.yankPop": { defaultKeys: "alt+y", descriptionKey: 'keybinding.yankPop' },
	"tui.editor.undo": { defaultKeys: "ctrl+-", descriptionKey: 'keybinding.undo' },
	"tui.input.newLine": { defaultKeys: ["shift+enter", "ctrl+j"], descriptionKey: 'keybinding.insertNewline' },
	"tui.input.submit": { defaultKeys: "enter", descriptionKey: 'keybinding.submitInput' },
	"tui.input.tab": { defaultKeys: "tab", descriptionKey: 'keybinding.tabAutocomplete' },
	"tui.input.copy": { defaultKeys: "ctrl+c", descriptionKey: 'keybinding.copySelection' },
	"tui.select.up": { defaultKeys: "up", descriptionKey: 'keybinding.moveSelectionUp' },
	"tui.select.down": { defaultKeys: "down", descriptionKey: 'keybinding.moveSelectionDown' },
	"tui.select.pageUp": { defaultKeys: "pageUp", descriptionKey: 'keybinding.selectionPageUp' },
	"tui.select.pageDown": {
		defaultKeys: "pageDown",
		descriptionKey: 'keybinding.selectionPageDown',
	},
	"tui.select.confirm": { defaultKeys: "enter", descriptionKey: 'keybinding.confirmSelection' },
	"tui.select.cancel": {
		defaultKeys: ["escape", "ctrl+c"],
		descriptionKey: 'keybinding.cancelSelection',
	},
	// These intentionally shadow the unmodified editor bindings in fullscreen mode.
	"tui.altScreen.pageUp": {
		defaultKeys: "pageUp",
		descriptionKey: 'keybinding.viewportUpOnePage',
	},
	"tui.altScreen.pageDown": {
		defaultKeys: "pageDown",
		descriptionKey: 'keybinding.viewportDownOnePage',
	},
	"tui.altScreen.halfPageUp": {
		defaultKeys: [],
		descriptionKey: 'keybinding.viewportUpHalfPage',
	},
	"tui.altScreen.halfPageDown": {
		defaultKeys: [],
		descriptionKey: 'keybinding.viewportDownHalfPage',
	},
	"tui.altScreen.lineUp": {
		defaultKeys: [],
		descriptionKey: 'keybinding.viewportUpOneLine',
	},
	"tui.altScreen.lineDown": {
		defaultKeys: [],
		descriptionKey: 'keybinding.viewportDownOneLine',
	},
	"tui.altScreen.previousPrompt": {
		defaultKeys: "ctrl+shift+up",
		descriptionKey: 'keybinding.jumpToPrevPrompt',
	},
	"tui.altScreen.nextPrompt": {
		defaultKeys: "ctrl+shift+down",
		descriptionKey: 'keybinding.jumpToNextPrompt',
	},
	"tui.altScreen.search": {
		defaultKeys: "ctrl+shift+f",
		descriptionKey: 'keybinding.searchPrimaryScrollView',
	},
	"tui.altScreen.searchNext": {
		defaultKeys: ["enter", "ctrl+g"],
		descriptionKey: 'keybinding.selectNextSearchMatch',
	},
	"tui.altScreen.searchPrevious": {
		defaultKeys: ["shift+enter", "ctrl+shift+g"],
		descriptionKey: 'keybinding.selectPrevSearchMatch',
	},
	"tui.altScreen.searchClose": {
		defaultKeys: "escape",
		descriptionKey: 'keybinding.closeTranscriptSearch',
	},
	"tui.altScreen.top": { defaultKeys: "home", descriptionKey: 'keybinding.viewportToTop' },
	"tui.altScreen.bottom": { defaultKeys: "end", descriptionKey: 'keybinding.viewportToBottom' },
} as const satisfies KeybindingDefinitions;

export interface KeybindingConflict {
	key: KeyId;
	keybindings: string[];
}

function normalizeKeys(keys: KeyId | KeyId[] | undefined): KeyId[] {
	if (keys === undefined) return [];
	const keyList = Array.isArray(keys) ? keys : [keys];
	const seen = new Set<KeyId>();
	const result: KeyId[] = [];
	for (const key of keyList) {
		if (!seen.has(key)) {
			seen.add(key);
			result.push(key);
		}
	}
	return result;
}

export class KeybindingsManager {
	private definitions: KeybindingDefinitions;
	private userBindings: KeybindingsConfig;
	private keysById = new Map<Keybinding, KeyId[]>();
	private conflicts: KeybindingConflict[] = [];

	constructor(definitions: KeybindingDefinitions, userBindings: KeybindingsConfig = {}) {
		this.definitions = definitions;
		this.userBindings = userBindings;
		this.rebuild();
	}

	private rebuild(): void {
		this.keysById.clear();
		this.conflicts = [];

		const userClaims = new Map<KeyId, Set<Keybinding>>();
		for (const [keybinding, keys] of Object.entries(this.userBindings)) {
			if (!(keybinding in this.definitions)) continue;
			for (const key of normalizeKeys(keys)) {
				const claimants = userClaims.get(key) ?? new Set<Keybinding>();
				claimants.add(keybinding as Keybinding);
				userClaims.set(key, claimants);
			}
		}

		for (const [key, keybindings] of userClaims) {
			if (keybindings.size > 1) {
				this.conflicts.push({ key, keybindings: [...keybindings] });
			}
		}

		for (const [id, definition] of Object.entries(this.definitions)) {
			const userKeys = this.userBindings[id];
			const keys = userKeys === undefined ? normalizeKeys(definition.defaultKeys) : normalizeKeys(userKeys);
			this.keysById.set(id as Keybinding, keys);
		}
	}

	matches(data: string, keybinding: Keybinding): boolean {
		const keys = this.keysById.get(keybinding) ?? [];
		for (const key of keys) {
			if (matchesKey(data, key)) return true;
		}
		return false;
	}

	getKeys(keybinding: Keybinding): KeyId[] {
		return [...(this.keysById.get(keybinding) ?? [])];
	}

	getDefinition(keybinding: Keybinding): KeybindingDefinition {
		return this.definitions[keybinding]!;
	}

	getConflicts(): KeybindingConflict[] {
		return this.conflicts.map((conflict) => ({ ...conflict, keybindings: [...conflict.keybindings] }));
	}

	setUserBindings(userBindings: KeybindingsConfig): void {
		this.userBindings = userBindings;
		this.rebuild();
	}

	getUserBindings(): KeybindingsConfig {
		return { ...this.userBindings };
	}

	getResolvedBindings(): KeybindingsConfig {
		const resolved: KeybindingsConfig = {};
		for (const id of Object.keys(this.definitions)) {
			const keys = this.keysById.get(id as Keybinding) ?? [];
			resolved[id] = keys.length === 1 ? keys[0]! : [...keys];
		}
		return resolved;
	}
}

let globalKeybindings: KeybindingsManager | null = null;

export function setKeybindings(keybindings: KeybindingsManager): void {
	globalKeybindings = keybindings;
}

export function getKeybindings(): KeybindingsManager {
	if (!globalKeybindings) {
		globalKeybindings = new KeybindingsManager(TUI_KEYBINDINGS);
	}
	return globalKeybindings;
}
