#!/usr/bin/env node
/**
 * i18n gate for the TUI/CLI translation domain.
 *
 * Validates the catalogs against the English source of truth and reports, as
 * errors, the defects that would ship broken text. Deliberately NOT a gate:
 * length ratios. A translated string being 1.4x longer than the English tells
 * you nothing on its own — the renderer decides whether that matters, and the
 * width matrix in the virtual-terminal tests is the real gate.
 *
 * Usage:
 *   node scripts/i18n-check.mjs            # fail on errors
 *   node scripts/i18n-check.mjs --report   # print the report, always exit 0
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSync } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LOCALES_DIR = join(ROOT, 'packages/tui/src/i18n/locales');
const SCAN_DIRS = [join(ROOT, 'packages/tui/src')];
const GLOSSARY_PATH = join(ROOT, 'scripts/i18n-glossary.json');

const reportOnly = process.argv.includes('--report');

const errors = [];
const warnings = [];
const notes = [];

const error = (rule, message, detail) => errors.push({ rule, message, detail });
const warn = (rule, message, detail) => warnings.push({ rule, message, detail });
const note = (rule, message) => notes.push({ rule, message });

// ── load the catalogs ───────────────────────────────────────────────────────

function loadModule(entry, outDir, name) {
  const outfile = join(outDir, `${name}.mjs`);
  buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
  });
  return import(`file://${outfile.replace(/\\/g, '/')}`);
}

const scratch = mkdtempSync(join(tmpdir(), 'i18n-check-'));
let registry;
let englishKeys;
let localeCatalogs;
let statuses;
let supportedLocales;

try {
  const registryModule = await loadModule(join(LOCALES_DIR, 'index.ts'), scratch, 'registry');
  registry = registryModule.LOCALES;
  statuses = {};
  for (const [locale, entry] of Object.entries(registry)) statuses[locale] = entry.status;
  supportedLocales = Object.keys(registry);
  englishKeys = Object.keys(registryModule.EN_CATALOG);
  localeCatalogs = registry;
} catch (error_) {
  console.error('i18n-check: could not load the locale registry');
  console.error(error_ instanceof Error ? error_.message : String(error_));
  process.exit(1);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const glossary = JSON.parse(readFileSync(GLOSSARY_PATH, 'utf8'));
const allowlist = new Set(glossary.allowlist.map((entry) => entry.value));

// ── message helpers ─────────────────────────────────────────────────────────

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const FORBIDDEN = new RegExp(
  '[' +
    '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F' +
    '\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF' +
    ']',
);

const isPlural = (message) => typeof message === 'object' && message !== null && 'plural' in message;

function placeholdersIn(pattern) {
  const found = new Set();
  for (const match of String(pattern).matchAll(PLACEHOLDER)) found.add(match[1]);
  return found;
}

function eachPluralForm(message, visit) {
  for (const [category, value] of Object.entries(message.plural)) {
    if (typeof value === 'string') visit(category, value);
  }
}

function requiredCategories(locale) {
  try {
    return new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  } catch {
    return ['other'];
  }
}

const isValidBcp47 = (tag) => {
  try {
    new Intl.Locale(tag);
    return tag === tag.trim() && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag);
  } catch {
    return false;
  }
};

/**
 * A string built only from key names, arrows and separators ("↑↓ · Enter · Esc")
 * is intentionally identical across locales: those are keycaps, not prose.
 * Detected by stripping the keycap vocabulary and checking that nothing but
 * punctuation is left.
 */
const KEYCAP_VOCABULARY =
  /Esc|Enter|Shift|Ctrl|Alt|Tab|Backspace|Delete|Insert|Home|End|Page ?(?:Up|Down)|Pg ?(?:Up|Dn)|Arrow/g;

function isKeycapOnlyString(value) {
  if (!/Esc|Enter|Shift|Ctrl|Alt|Tab|↑|↓|←|→/u.test(value)) return false;
  const residue = value
    .replace(KEYCAP_VOCABULARY, '')
    .replace(/[↑↓←→\s·|,/-]/gu, '');
  return residue === '';
}

// ── rules 10 and 11: locale tag shape and forbidden characters ──────────────

for (const locale of supportedLocales) {
  if (!isValidBcp47(locale)) {
    error('locale-tag', `not a well-formed BCP 47 tag: "${locale}"`);
  }
}

for (const [locale, entry] of Object.entries(localeCatalogs)) {
  for (const [key, message] of Object.entries(entry.catalog)) {
    const check = (value) => {
      if (FORBIDDEN.test(value)) {
        error('forbidden-chars', `control or bidi character in ${locale}/${key}`);
      }
    };
    if (isPlural(message)) eachPluralForm(message, (_category, value) => check(value));
    else if (typeof message === 'string') check(message);
  }
}

// ── rule 13: a locale cannot claim `complete` without parity ────────────────

for (const [locale, status] of Object.entries(statuses)) {
  if (status !== 'complete') continue;
  const covered = Object.keys(localeCatalogs[locale].catalog).length;
  if (covered !== englishKeys.length) {
    error(
      'complete-without-parity',
      `${locale} is marked complete but covers ${covered}/${englishKeys.length} keys`,
    );
  }
}

// ── rules 2-8: per-locale parity, shape and placeholders ────────────────────

for (const locale of supportedLocales) {
  if (locale === 'en') continue;
  const entry = localeCatalogs[locale];
  const catalog = entry.catalog;
  const required = requiredCategories(locale);
  const missing = [];

  for (const key of englishKeys) {
    const english = localeCatalogs.en.catalog[key];
    const translated = catalog[key];

    if (translated === undefined) {
      missing.push(key);
      continue;
    }

    // rule 6: the string/plural nature must match English.
    if (isPlural(english) !== isPlural(translated)) {
      error(
        'message-shape',
        `${locale}/${key}: English is ${isPlural(english) ? 'plural' : 'plain'} but the translation is ${
          isPlural(translated) ? 'plural' : 'plain'
        }`,
      );
      continue;
    }

    if (isPlural(translated)) {
      // rule 7: every category the platform actually needs must be present.
      for (const category of required) {
        const value = translated.plural[category];
        if (typeof value !== 'string') {
          error(
            'plural-category',
            `${locale}/${key}: missing required plural category "${category}" (Intl.PluralRules(${locale}))`,
          );
          continue;
        }
        // Compare each category against the SAME category in English, falling
        // back to `other`. Comparing everything against `one` would flag a
        // correct `{count}` as unknown, since the English `one` form is often
        // spelled out ("1 file") and carries no placeholder at all.
        const englishForCategory = isPlural(english)
          ? (english.plural[category] ?? english.plural.other)
          : english;
        const expected = placeholdersIn(englishForCategory);
        const actual = placeholdersIn(value);
        for (const name of expected) {
          if (!actual.has(name)) {
            error('placeholder-missing', `${locale}/${key}: placeholder {${name}} absent from the "${category}" form`);
          }
        }
        for (const name of actual) {
          if (!expected.has(name)) {
            error('placeholder-extra', `${locale}/${key}: unknown placeholder {${name}} in the "${category}" form`);
          }
        }
      }
      // rule 8: categories the platform never returns are noise.
      for (const category of Object.keys(translated.plural)) {
        if (!required.includes(category)) {
          warn('plural-category-extra', `${locale}/${key}: plural category "${category}" is never used by ${locale}`);
        }
      }
      continue;
    }

    const expected = placeholdersIn(english);
    const actual = placeholdersIn(translated);
    for (const name of expected) {
      if (!actual.has(name)) {
        error('placeholder-missing', `${locale}/${key}: placeholder {${name}} absent from the translation`);
      }
    }
    for (const name of actual) {
      if (!expected.has(name)) {
        error('placeholder-extra', `${locale}/${key}: unknown placeholder {${name}} in the translation`);
      }
    }

    // rule 14: a plain message whose English carries {count} should be a plural.
    if (expected.has('count') && !isPlural(english)) {
      warn('plural-declared-plain', `${locale}/${key}: English is a plain string carrying {count}`);
    }
  }

  if (missing.length > 0) {
    if (statuses[locale] === 'complete') {
      error('missing-keys', `${locale} is complete but ${missing.length} keys are missing: ${missing.slice(0, 8).join(', ')}`);
    } else {
      note('draft-coverage', `${locale} (${statuses[locale]}): ${missing.length}/${englishKeys.length} keys still to translate`);
    }
  }

  // extra keys that English does not declare
  for (const key of Object.keys(catalog)) {
    if (!englishKeys.includes(key)) {
      error('unknown-key', `${locale}: "${key}" is not declared in the English catalog`);
    }
  }
}

// ── untranslated detection: a warning, never a failure ─────────────────────

for (const locale of supportedLocales) {
  if (locale === 'en') continue;
  const catalog = localeCatalogs[locale].catalog;
  const identical = [];
  for (const [key, value] of Object.entries(catalog)) {
    const english = localeCatalogs.en.catalog[key];
    if (english === undefined) continue;
    const isSame = isPlural(value)
      ? Object.keys(value.plural).every(
          (category) => value.plural[category] === (isPlural(english) ? english.plural[category] : undefined),
        )
      : value === english;
    if (!isSame) continue;
    if (allowlist.has(String(value))) continue;
    if (isKeycapOnlyString(String(value))) continue;
    if (/^[A-Z]/.test(String(value)) && !/\s/.test(String(value))) continue;
    identical.push(key);
  }
  if (identical.length > 0) {
    warn(
      'identical-to-english',
      `${locale}: ${identical.length} value(s) identical to English (allowlist them in scripts/i18n-glossary.json if intentional)`,
      identical.slice(0, 6),
    );
  }
}

// ── rules 1 and 9: call sites vs catalog ────────────────────────────────────

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'i18n') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (['.ts', '.tsx'].includes(extname(entry.name)) && !/\.test\.ts$/.test(entry.name)) {
      yield full;
    }
  }
}

const CALL = /\b(?:t|tpl|tPlural)\(\s*'([^']+)'/g;
const referenced = new Map();

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(CALL)) {
      const key = match[1];
      if (!referenced.has(key)) referenced.set(key, new Set());
      referenced.get(key).add(relative(ROOT, file));
    }
  }
}

for (const [key, files] of referenced) {
  if (!englishKeys.includes(key)) {
    error('unknown-key', `referenced but not in the English catalog: "${key}"`, [...files].slice(0, 3));
  }
}

const orphans = englishKeys.filter((key) => !referenced.has(key));
if (orphans.length > 0) {
  note('orphans', `${orphans.length} catalog key(s) not referenced yet: ${orphans.slice(0, 8).join(', ')}`);
}

// ── rule 12: a draft locale must not be user-reachable in production ────────

const pickerSource = join(ROOT, 'packages/tui/src/i18n/locales/index.ts');
const picker = readFileSync(pickerSource, 'utf8');
if (process.env.NODE_ENV === 'production') {
  for (const [locale, status] of Object.entries(statuses)) {
    if (status === 'draft' && picker.includes(`userSelectableLocales`) && locale === 'en') {
      // no-op: the real check is that userSelectableLocales filters on status
    }
  }
}
if (!picker.includes("STATUS[locale] === 'complete'")) {
  error(
    'draft-exposure',
    'userSelectableLocales() must filter on complete status so a draft locale cannot be offered',
  );
}

// ── report ──────────────────────────────────────────────────────────────────

const pad = (value) => String(value).padStart(5);

console.log('i18n-check');
console.log(`  english keys : ${englishKeys.length}`);
console.log(`  locales      : ${supportedLocales.length}`);
for (const [locale, entry] of Object.entries(localeCatalogs)) {
  const covered = Object.keys(entry.catalog).length;
  console.log(
    `  ${pad(locale)} ${String(entry.status).padEnd(9)} ${covered}/${englishKeys.length}` +
      `${covered === englishKeys.length ? '' : '  (draft)'}`.replace(/^ {2}/, '  '),
  );
}

if (notes.length > 0) {
  console.log('\nnotes');
  for (const item of notes) console.log(`  - [${item.rule}] ${item.message}`);
}
if (warnings.length > 0) {
  console.log(`\nwarnings (${warnings.length})`);
  for (const item of warnings) {
    console.log(`  - [${item.rule}] ${item.message}`);
    if (item.detail) console.log(`      ${item.detail.join(', ')}`);
  }
}
if (errors.length > 0) {
  console.log(`\nerrors (${errors.length})`);
  for (const item of errors) {
    console.log(`  - [${item.rule}] ${item.message}`);
    if (item.detail) console.log(`      ${item.detail.join(', ')}`);
  }
}

if (errors.length === 0) {
  console.log('\ni18n-check passed');
}

process.exit(reportOnly || errors.length === 0 ? 0 : 1);
