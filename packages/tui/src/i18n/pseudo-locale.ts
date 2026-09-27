import { isPlainMessage, isPluralMessage, type Message, type PluralCategory } from './schema.js';
import type { MessageKey } from './locales/en.js';
import { EN_CATALOG } from './locales/en.js';

/**
 * Pseudo-localisation, generated from the English catalog.
 *
 * The purpose is not to be readable: it is to make layout failures visible
 * before a real translation exists. A pseudo-locale that keeps its original
 * width proves nothing, so this one accents Latin letters, pads the text by
 * roughly a third, and wraps it in visible delimiters.
 *
 * Length ratios are not a release gate — the renderer is (see the width matrix
 * in the virtual-terminal tests). This generator only exists to feed that gate.
 */

/** Accented Latin letters, used to catch terminals and fonts that assume ASCII. */
const ACCENTED: Readonly<Record<string, string>> = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ď',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ĺ',
  m: 'ḿ',
  n: 'ñ',
  o: 'ó',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Å',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ď',
  E: 'É',
  F: 'Ƒ',
  G: 'Ğ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ĺ',
  M: 'Ḿ',
  N: 'Ń',
  O: 'Ø',
  P: 'Ṕ',
  Q: 'Ǫ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ť',
  U: 'Û',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
}

/** Runs that must survive untouched: placeholders, keycaps, slash commands, ANSI. */
const PRESERVED = [
  /\{[A-Za-z_][A-Za-z0-9_]*\}/g, // placeholders
  /\x1b\[[0-9;]*m/g, // ANSI SGR
  /\/(?:[a-z][a-z-]*)/gi, // slash commands
  /\b(?:Esc|Enter|Shift|Ctrl|Alt|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|PgUp|PgDn)\b/g, // keycaps
  /\b(?:↑|↓|←|→)\b/g, // arrows
]

const PREFIX = '⟦'
const SUFFIX = '⟧'
const PADDING = '···'

/**
 * Index markers use control characters that `assertNoForbiddenCharacters` rejects in any
 * catalog, so a marker can never collide with real content the way a space-delimited number
 * would ("Loading 2 files" must not lose its own 2).
 */
const MARK_OPEN = '\u0001'
const MARK_CLOSE = '\u0002'

function protectSegments(pattern: string): { text: string; holes: string[] } {
  const holes: string[] = []
  let text = pattern
  for (const rule of PRESERVED) {
    text = text.replace(rule, (match) => {
      holes.push(match)
      return MARK_OPEN + (holes.length - 1) + MARK_CLOSE
    })
  }
  return { text, holes }
}

function restoreSegments(text: string, holes: readonly string[]): string {
  let restored = text
  for (let index = 0; index < holes.length; index += 1) {
    const hole = holes[index]
    if (hole === undefined) continue
    restored = restored.split(MARK_OPEN + index + MARK_CLOSE).join(hole)
  }
  return restored
}

/** Accent, pad, and delimit. Placeholders and keycaps are put back verbatim. */
export function pseudoLocalize(pattern: string): string {
  if (typeof pattern !== 'string' || pattern.length === 0) return pattern

  const { text, holes } = protectSegments(pattern)

  const accented = [...text]
    .map((character) => ACCENTED[character] ?? character)
    .join('')

  const restored = restoreSegments(accented, holes)
  return `${PREFIX}${restored}${PADDING}${SUFFIX}`
}

function pseudoMessage(message: Message): Message {
  if (isPlainMessage(message)) return pseudoLocalize(message)
  if (isPluralMessage(message)) {
    const plural: Record<string, string> = {}
    for (const category of Object.keys(message.plural) as PluralCategory[]) {
      const value = message.plural[category]
      if (typeof value === 'string') plural[category] = pseudoLocalize(value)
    }
    return { plural: plural as never }
  }
  return message
}

export type PseudoCatalog = Readonly<Record<MessageKey, Message>>

let cached: PseudoCatalog | null = null

/** The English catalog with every message pseudo-localised. Built once, reused. */
export function pseudoCatalog(): PseudoCatalog {
  if (cached) return cached
  const result = {} as Record<MessageKey, Message>
  for (const [key, value] of Object.entries(EN_CATALOG)) {
    result[key as MessageKey] = pseudoMessage(value as Message)
  }
  cached = result as PseudoCatalog
  return cached
}

export function resetPseudoCatalog(): void {
  cached = null
}
