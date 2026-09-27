import { afterAll, beforeAll } from 'vitest';

import { setActiveLocale } from '../packages/tui/src/i18n/context.js';

/**
 * Pin the interface locale for the whole Vitest suite.
 *
 * The TUI resolves its locale from the environment, so a behavioural test that
 * asserts rendered text would otherwise pass on CI (English host) and fail on a
 * French, German or Japanese developer's machine. That is exactly the class of
 * accidental dependency the i18n plan calls out: a behavioural test must not
 * depend on the ambient locale.
 *
 * Pinning English here makes the existing assertions deterministic again. The
 * remaining work — decoupling individual assertions so they assert structure
 * rather than copy — proceeds batch by batch during extraction. A test that
 * genuinely needs another locale calls `setActiveLocale` itself and restores it.
 */
beforeAll(() => {
  setActiveLocale('en');
});

afterAll(() => {
  setActiveLocale('en');
});
