import type { Message } from '../schema.js'
import type { MessageKey } from './en.js'

/**
 * Deutsch (GERMAN). Status: draft.
 *
 * A `draft` locale is never offered by the settings picker. Missing keys fall back to English at runtime, which is why an empty catalog is safe to commit.
 *
 * Filled in by the translation workstream once the English catalog is frozen.
 */

export const DE_CATALOG = {
} as const satisfies Partial<Record<MessageKey, Message>>

export type DEKey = keyof typeof DE_CATALOG
