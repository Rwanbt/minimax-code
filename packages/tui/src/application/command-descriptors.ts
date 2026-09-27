import type { MessageKey } from '../i18n/locales/index.js';

/**
 * Slash-command metadata shared between the TUI catalog and the ACP surface.
 *
 * R1 of the i18n migration. The table used to hold a resolved English
 * `description` string, and because it is a module-level const it was evaluated
 * at import time: a `t()` call here would have produced English for the whole
 * process and a language switch could never take effect. The description is now
 * a key, resolved per locale when the catalog is built.
 *
 * Command NAMES stay invariant. Users type them, and scripts and agent prompts
 * embed them, so translating them would break muscle memory and automation.
 */
export interface TuiCommandDescriptor {
  readonly name: string;
  /** Catalog key for the human-readable description. Resolve with `t()`. */
  readonly descriptionKey: MessageKey;
}

export const TUI_COMMAND_DESCRIPTORS = {
  help: {
    name: 'help',
    descriptionKey: 'command.help.description',
  },
  new: {
    name: 'new',
    descriptionKey: 'command.new.description',
  },
  model: {
    name: 'model',
    descriptionKey: 'command.model.description',
  },
  status: {
    name: 'status',
    descriptionKey: 'command.status.description',
  },
  doctor: {
    name: 'doctor',
    descriptionKey: 'command.doctor.description',
  },
  context: {
    name: 'context',
    descriptionKey: 'command.context.description',
  },
  skills: {
    name: 'skills',
    descriptionKey: 'command.skills.description',
  },
  mcp: {
    name: 'mcp',
    descriptionKey: 'command.mcp.description',
  },
  usage: {
    name: 'usage',
    descriptionKey: 'command.usage.description',
  },
  compact: {
    name: 'compact',
    descriptionKey: 'command.compact.description',
  },
  export: {
    name: 'export',
    descriptionKey: 'command.export.description',
  },
} as const satisfies Record<string, TuiCommandDescriptor>;
