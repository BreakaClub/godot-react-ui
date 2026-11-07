// Which Tailwind v3.4.17 utilities and variants this library compiles, measured rather than listed by hand.
//
//   node --import tsx scripts/tailwind-coverage.mjs --tailwind=<dir> [--json=<file>] [--plugin=<name>] [--missing]
//
// `<dir>` is a directory whose `node_modules/tailwindcss` is tailwindcss 3.4.17 (for example `npm pack tailwindcss@3.4.17`,
// then `npm install` of that tarball into an empty directory). Every core plugin is run against a recording stand-in for
// Tailwind's plugin API, which enumerates the class names the default theme generates (the same source `tailwind build` uses).
// Each name is then handed to `compileStyle`: it counts as supported when it compiles and unsupported when it throws, so the
// table in `docs/tracks/tailwind-coverage.md` is a measurement, and this script is how to refresh it after a merge.
//
// `--plugin=<name>` limits the run to one plugin, `--missing` lists every unsupported class of each plugin shown, and
// `--json=<file>` writes the full result (per plugin: all classes, the unsupported ones, the error of the first).
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript module as CommonJS, whose named exports an ES module reads through the default.
import styles from '../src/styles.ts';

const { compileStyle } = styles;
rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--tailwind=', '--json=', '--plugin='], flags: ['--missing'] });
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const tailwindDirectory = argument('tailwind');
if (tailwindDirectory === undefined) throw new Error('--tailwind=<directory containing node_modules/tailwindcss 3.4.17> is required');
const requireTailwind = createRequire(resolve(tailwindDirectory, 'package.json'));
const { corePlugins, variantPlugins } = requireTailwind('tailwindcss/lib/corePlugins.js');
const resolveConfig = requireTailwind('tailwindcss/resolveConfig');
const escapeClassName = requireTailwind('tailwindcss/lib/util/escapeClassName.js').default;
const version = requireTailwind('tailwindcss/package.json').version;
if (version !== '3.4.17') throw new Error(`tailwindcss ${version} found; the coverage table is for 3.4.17`);
const config = resolveConfig({ content: [] });

function get(object, path, fallback) {
  const value = String(path).split('.').reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), object);
  return value === undefined ? fallback : value;
}

/** The class names a rule selector carries: `.divide-x > :not([hidden]) ~ :not([hidden])` is `divide-x`. */
function classesOfSelector(selector) {
  const classes = [];
  for (const part of selector.split(',')) {
    const match = /^\s*\.((?:\\.|[^\s.:>~+[,])+)/.exec(part);
    if (match) classes.push(match[1].replace(/\\(.)/g, '$1'));
  }
  return classes;
}

/** Tailwind's `negateValue`: only a number with an optional unit (or a calc-like function) has a negative class; `auto` and `full` have none. */
function isNegatable(value) {
  const text = String(value);
  return text === '0' || /^[+-]?(\d+|\d*\.\d+)(e[+-]?\d+)?(%|\w+)?$/.test(text) || ['var', 'calc', 'min', 'max', 'clamp'].some(name => text.includes(`${name}(`));
}

function recordUtilities(into, utilities) {
  for (const entry of Array.isArray(utilities) ? utilities : [utilities]) {
    for (const [key, value] of Object.entries(entry)) {
      if (key.startsWith('@')) recordUtilities(into, value);
      else for (const name of classesOfSelector(key)) into.add(name);
    }
  }
}

function pluginApi(into) {
  const matchUtilities = (utilities, options = {}) => {
    const values = options.values ?? {};
    for (const key of Object.keys(utilities)) {
      for (const valueKey of Object.keys(values)) {
        const name = valueKey === 'DEFAULT' ? key : `${key}-${valueKey}`;
        into.add(name);
        if (options.supportsNegativeValues && valueKey !== 'DEFAULT' && isNegatable(values[valueKey])) into.add(`-${name}`);
      }
      // A bare utility with no values table, or values reached only as `[arbitrary]`, has no enumerable name.
    }
  };
  return {
    addBase() {}, addDefaults() {}, addVariant() {}, matchVariant() {},
    addComponents: components => recordUtilities(into, components),
    addUtilities: utilities => recordUtilities(into, utilities),
    matchUtilities,
    matchComponents: matchUtilities,
    theme: (path, fallback) => get(config.theme, path, fallback),
    config: (path, fallback) => (path === undefined ? config : get(config, path, fallback)),
    corePlugins: () => true,
    prefix: value => value,
    e: escapeClassName,
    variants: () => [],
  };
}

const wantedPlugin = argument('plugin');
const showMissing = process.argv.includes('--missing');
const results = [];
for (const [name, plugin] of Object.entries(corePlugins)) {
  if (name === 'preflight' || (wantedPlugin !== undefined && wantedPlugin !== name)) continue;
  const classes = new Set();
  plugin(pluginApi(classes));
  const supported = [];
  const unsupported = [];
  let firstError;
  for (const className of classes) {
    try {
      compileStyle(className);
      supported.push(className);
    } catch (error) {
      unsupported.push(className);
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }
  results.push({ plugin: name, total: classes.size, supported: supported.length, unsupported, firstError });
}

// Variants: each name is tried in front of one utility known to compile; `matchVariant` families get representative values.
const PROBE = 'p-1';
const variantProbes = [
  ...['*', 'first-letter', 'first-line', 'marker', 'selection', 'file', 'placeholder', 'backdrop', 'before', 'after'],
  ...['first', 'last', 'only', 'odd', 'even', 'first-of-type', 'last-of-type', 'only-of-type', 'visited', 'target', 'open', 'default',
    'checked', 'indeterminate', 'placeholder-shown', 'autofill', 'optional', 'required', 'valid', 'invalid', 'in-range', 'out-of-range',
    'read-only', 'empty', 'focus-within', 'hover', 'focus', 'focus-visible', 'active', 'enabled', 'disabled'],
  ...['group-hover', 'group-focus', 'group-active', 'group-disabled', 'group-focus-within', 'group-focus-visible', 'group-first', 'group-odd',
    'group-hover/name', 'peer-hover', 'peer-focus', 'peer-checked', 'peer-disabled', 'peer-focus-visible', 'peer-invalid', 'peer-hover/name'],
  ...['ltr', 'rtl', 'motion-safe', 'motion-reduce', 'dark', 'print', 'portrait', 'landscape', 'contrast-more', 'contrast-less', 'forced-colors'],
  ...['sm', 'md', 'lg', 'xl', '2xl', 'max-sm', 'max-md', 'max-lg', 'max-xl', 'max-2xl', 'min-[900px]', 'max-[900px]', 'min-[1200px]'],
  ...['supports-[display:grid]', 'has-[:checked]', 'group-has-[:checked]', 'peer-has-[:checked]',
    'aria-checked', 'aria-disabled', 'aria-expanded', 'aria-hidden', 'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected',
    'aria-[sort=ascending]', 'group-aria-expanded', 'peer-aria-checked', 'data-[state=open]', 'data-[active]', 'group-data-[state=open]', 'peer-data-[state=open]',
    '[&:nth-child(3)]', '[&>*]', '[@media(min-width:900px)]'],
];
const variants = variantProbes.map(variant => {
  try {
    compileStyle(`${variant}:${PROBE}`);
    return { variant, supported: true };
  } catch (error) {
    return { variant, supported: false, error: error instanceof Error ? error.message : String(error) };
  }
});

const total = results.reduce((sum, row) => sum + row.total, 0);
const supported = results.reduce((sum, row) => sum + row.supported, 0);
console.log(`tailwindcss ${version}: ${supported} of ${total} default-theme class names compile (${(100 * supported / total).toFixed(1)} %)`);
console.log('');
console.log('| plugin | classes | compile | unsupported |');
console.log('| --- | ---: | ---: | ---: |');
for (const row of results) console.log(`| ${row.plugin} | ${row.total} | ${row.supported} | ${row.total - row.supported} |`);
if (showMissing) {
  for (const row of results.filter(entry => entry.unsupported.length > 0)) {
    console.log(`\n${row.plugin} (${row.unsupported.length}): ${row.unsupported.join(' ')}`);
  }
}
console.log('');
console.log(`variants: ${variants.filter(entry => entry.supported).length} of ${variants.length} probes compile`);
for (const entry of variants) console.log(`${entry.supported ? 'yes' : 'no '} ${entry.variant}`);
const jsonPath = argument('json');
if (jsonPath !== undefined) await writeFile(resolve(jsonPath), JSON.stringify({ version, results, variants }, null, 2));
