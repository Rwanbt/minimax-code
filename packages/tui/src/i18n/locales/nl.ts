import type { Message } from '../schema.js'
import type { MessageKey } from './en.js'

/**
 * Nederlands (DUTCH). Status: draft.
 *
 * A `draft` locale is never offered by the settings picker. Missing keys fall back to English at runtime, which is why an empty catalog is safe to commit.
 *
 * Filled in by the translation workstream once the English catalog is frozen.
 */

export const NL_CATALOG = {
} as const satisfies Partial<Record<MessageKey, Message>>

export type NLKey = keyof typeof NL_CATALOG
