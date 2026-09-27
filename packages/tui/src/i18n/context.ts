import { DEFAULT_LOCALE, type SupportedLocale } from './schema.js';
import { resolveLocale } from './locale.js';

/**
 * Process-wide active locale plus change notification.
 *
 * Nothing in the TUI may cache a translated string at module load: the catalog
 * of slash commands, the help panel and the composer all have to re-resolve when
 * the user switches language, without a restart. This module is the single
 * source of truth for "what locale are we in right now".
 */
type LocaleListener = (locale: SupportedLocale) => void

/**
 * Extra invalidation hooks registered by consumers that memoise locale-derived
 * data outside the catalog — the slash-command sets, for instance. They live
 * here rather than in `translate.ts` so the i18n domain does not have to know
 * about the command catalog, and the catalog does not have to be imported by the
 * i18n domain.
 */
type InvalidationHook = () => void

const invalidationHooks = new Set<InvalidationHook>()

/** Register a callback invoked whenever the active locale changes. Returns an unsubscribe. */
export function onLocaleChanged(hook: InvalidationHook): () => void {
  invalidationHooks.add(hook)
  return () => {
    invalidationHooks.delete(hook)
  }
}

function runInvalidationHooks(): void {
  for (const hook of [...invalidationHooks]) {
    try {
      hook()
    } catch {
      // A failing hook must not abort the language switch.
    }
  }
};

let activeLocale: SupportedLocale = DEFAULT_LOCALE;
let override: string | null = null;
let configPreference: string | null = null;
let envOverride: Readonly<Record<string, string | undefined>> | undefined;
let initialized = false;

const listeners = new Set<LocaleListener>();

function compute(): SupportedLocale {
  if (envOverride) return resolveLocale({ override, configPreference, env: envOverride })
  return resolveLocale({ override, configPreference })
}

function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  activeLocale = compute();
}

/** Notify subscribers, then let dependent caches drop what they derived. */
function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener(activeLocale);
    } catch {
      // A misbehaving subscriber must not abort the language switch for the
      // rest of the interface.
    }
  }
  runInvalidationHooks();
}

export function getActiveLocale(): SupportedLocale {
  ensureInitialized();
  return activeLocale;
}

/**
 * Switch the active locale. Returns `true` when the locale actually changed, so
 * callers can skip a needless re-render.
 */
export function setActiveLocale(locale: SupportedLocale): boolean {
  ensureInitialized();
  override = locale;
  if (activeLocale === locale) return false;
  activeLocale = locale;
  notify();
  return true;
}

/**
 * Drop the process override and fall back to config, environment, then system.
 * Used on restart and by tests that need a clean resolution.
 */
export function resetActiveLocale(): void {
  override = null;
  activeLocale = compute();
  notify();
}

export function setLocaleConfigPreference(preference: string | null): void {
  configPreference = preference;
  if (override) return;
  const next = compute();
  if (next === activeLocale) return;
  activeLocale = next;
  notify();
}

/** Test seam: pin the environment without mutating `process.env`. */
export function setLocaleEnvironment(
  env: Readonly<Record<string, string | undefined>> | undefined,
): void {
  envOverride = env;
  if (override) return;
  const next = compute();
  if (next === activeLocale) return;
  activeLocale = next;
  notify();
}

export function subscribeLocaleChange(listener: LocaleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Snapshot for diagnostics; never returns secrets, only the resolved tag. */
export function describeLocaleSources(): {
  override: string | null
  configPreference: string | null
  active: SupportedLocale
} {
  return { override, configPreference, active: getActiveLocale() }
}
