// Per-channel comparison of the compositor-layer experiment's captures (spike.gd, scenario=accuracy) with Chrome's
// (chrome-reference.mjs), plus side-by-side PNGs. Run from the worktree root:
//
//   node experiments/transform3d/compare.mjs [--godot=artifacts/transform3d-spike/godot] [--chrome=artifacts/transform3d-spike/chrome]
//        [--out=artifacts/transform3d-spike/compare] [--tags=breaka-compat,stock-mobile,...] [--sides=<scenario ids>]
//
// For each tag (engine and renderer), mode ("src": Chrome's own raster of the flat card as the layer; "own": the card
// rendered by Godot into the layer), scenario and device pixel ratio it reports, in 8-bit levels, the mean, 99th
// percentile and maximum of the per-pixel largest channel difference over three regions of the projected card:
// interior (more than the edge band inside the outline), edge (within the band of it) and exterior (the rest).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { signedDistance } from './geometry.mjs';

const root = resolve(import.meta.dirname, '../..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const godotDirectory = resolve(root, argument('godot', 'artifacts/transform3d-spike/godot'));
const chromeDirectory = resolve(root, argument('chrome', 'artifacts/transform3d-spike/chrome'));
const outDirectory = resolve(root, argument('out', 'artifacts/transform3d-spike/compare'));
const tags = argument('tags', readdirSync(godotDirectory).join(',')).split(',');
const sides = argument('sides', '').split(',').filter(Boolean);
const modes = argument('modes', 'src,own').split(',');
const only = argument('only', '').split(',').filter(Boolean);
const EDGE_BAND_PX = 1.5;
const FONT = '/System/Library/Fonts/Supplemental/Arial.ttf';
mkdirSync(outDirectory, { recursive: true });

const reference = JSON.parse(readFileSync(resolve(chromeDirectory, 'reference.json'), 'utf8'));
const { card } = reference;
const flatPolygon = [[0, 0], [card.width, 0], [card.width, card.height], [0, card.height]].map(([x, y]) => ({ sx: card.left + x, sy: card.top + y }));

function decode(path) {
  const info = execFileSync('magick', ['identify', '-format', '%w %h', path]).toString().split(' ').map(Number);
  const data = execFileSync('magick', [path, '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 28 });
  return { width: info[0], height: info[1], data };
}

function stats(values) {
  if (values.length === 0) return { n: 0, mean: 0, p99: 0, max: 0 };
  const sorted = Float64Array.from(values).sort();
  return { n: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length, p99: sorted[Math.floor((sorted.length - 1) * 0.99)], max: sorted[sorted.length - 1] };
}

// Mean of the absolute difference over all channels of all pixels in a region, as "typical", and the per-pixel maximum.
function compare(chrome, godot, polygon, dpr) {
  const regions = { interior: [], edge: [], exterior: [] };
  const channelMeans = { interior: 0, edge: 0, exterior: 0 };
  for (let y = 0; y < chrome.height; y++) {
    for (let x = 0; x < chrome.width; x++) {
      const i = (y * chrome.width + x) * 4;
      const d = [0, 1, 2].map(c => Math.abs(chrome.data[i + c] - godot.data[i + c]));
      const worst = Math.max(...d);
      const distance = polygon.length >= 3 ? signedDistance(polygon, (x + 0.5) / dpr, (y + 0.5) / dpr) * dpr : Infinity;
      const region = distance < -EDGE_BAND_PX ? 'interior' : distance > EDGE_BAND_PX ? 'exterior' : 'edge';
      regions[region].push(worst);
      channelMeans[region] += (d[0] + d[1] + d[2]) / 3;
    }
  }
  const out = {};
  for (const region of Object.keys(regions)) {
    out[region] = stats(regions[region]);
    out[region].channelMean = regions[region].length ? channelMeans[region] / regions[region].length : 0;
  }
  return out;
}

const fmt = s => (s.n === 0 ? '-' : `${s.mean.toFixed(2)} / ${s.p99.toFixed(0)} / ${s.max.toFixed(0)}`);
const results = [];
for (const tag of argument('scenes', '') || argument('alt', '') ? [] : tags) {
  for (const mode of modes) {
    for (const dpr of [1, 2]) {
      for (const id of ['flat', ...Object.keys(reference.scenarios)]) {
        if (only.length && !only.includes(id)) continue;
        const godotPath = resolve(godotDirectory, tag, `${mode}-${id}-dpr${dpr}.png`);
        if (!existsSync(godotPath)) continue;
        const chromePath = resolve(chromeDirectory, id === 'flat' ? `flat-page-dpr${dpr}.png` : `${id}-dpr${dpr}.png`);
        const polygon = id === 'flat' ? flatPolygon : reference.scenarios[id].polygon;
        const result = { tag, mode, dpr, id, ...compare(decode(chromePath), decode(godotPath), polygon, dpr) };
        results.push(result);
        if (sides.includes(id) || sides.includes('all')) {
          const label = `${id} dpr${dpr} ${mode} ${tag}`;
          const diff = resolve(outDirectory, `diff-${tag}-${mode}-${id}-dpr${dpr}.png`);
          execFileSync('magick', [chromePath, godotPath, '-compose', 'difference', '-composite', '-evaluate', 'multiply', '4', diff]);
          execFileSync('magick', [
            '(', chromePath, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', 'Chrome', ')',
            '(', godotPath, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', `Godot ${mode} (${tag})`, ')',
            '(', diff, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', 'difference x4', ')',
            '+append', resolve(outDirectory, `side-${tag}-${mode}-${id}-dpr${dpr}.png`),
          ]);
          console.error(`side by side: ${label}`);
        }
      }
    }
  }
}
// The alternatives (s_alt.gd): each variant against its reference, the compositor layer at raster scale = the device pixel ratio.
const altIds = argument('alt', '').split(',').filter(Boolean);
const altResults = [];
if (altIds.length) {
  const pairs = [['group', 'tex'], ['group-straight', 'tex'], ['vertex-tex', 'tex'], ['vertex-style', 'style'], ['vertex-glyphs', 'glyphs'], ['vertex-card', 'own'], ...[1, 2, 4, 8, 16, 32, 64].map(n => [`mesh${n}`, 'tex'])];
  for (const tag of tags) for (const id of altIds) for (const dpr of [1, 2]) for (const [variant, truthKind] of pairs) {
    const godotPath = resolve(godotDirectory, tag, `alt-${variant}-${id}-dpr${dpr}.png`);
    const truthPath = resolve(godotDirectory, tag, `alt-truth-${truthKind}-${id}-dpr${dpr}.png`);
    if (!existsSync(godotPath) || !existsSync(truthPath)) continue;
    altResults.push({ tag, variant, id, dpr, ...compare(decode(truthPath), decode(godotPath), reference.scenarios[id].polygon, dpr) });
    if (sides.includes(variant) || sides.includes('all')) {
      const diff = resolve(outDirectory, `diff-alt-${tag}-${variant}-${id}-dpr${dpr}.png`);
      execFileSync('magick', [truthPath, godotPath, '-compose', 'difference', '-composite', '-evaluate', 'multiply', '4', diff]);
      const label = (path, text) => ['(', path, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', text, ')'];
      execFileSync('magick', [...label(truthPath, `reference (${truthKind})`), ...label(godotPath, `${variant} (${tag})`), ...label(diff, 'difference x4'), '+append', resolve(outDirectory, `side-alt-${tag}-${variant}-${id}-dpr${dpr}.png`)]);
    }
  }
  writeFileSync(resolve(outDirectory, 'alt-results.json'), JSON.stringify(altResults, null, 1));
  console.log('tag | variant | scenario | dpr | interior mean / p99 / max | edge mean / p99 / max');
  for (const r of altResults) console.log(`${r.tag} | ${r.variant} | ${r.id} | ${r.dpr} | ${fmt(r.interior)} | ${fmt(r.edge)}`);
}

// Whole scenes (the preserve-3d experiments, s_p3d.gd): everything either image has drawn over the page background.
const sceneNames = argument('scenes', '').split(',').filter(Boolean);
const variants = argument('variants', 'bsp,centroid,unsorted').split(',');
const sceneResults = [];
for (const tag of sceneNames.length ? tags : []) {
  for (const name of sceneNames) for (const variant of variants) for (const dpr of [1, 2]) {
    const godotPath = resolve(godotDirectory, tag, `scene-${name}-${variant}-dpr${dpr}.png`);
    if (!existsSync(godotPath)) continue;
    const chromePath = resolve(chromeDirectory, `scene-${name}-dpr${dpr}.png`);
    const chrome = decode(chromePath), godot = decode(godotPath), background = decode(resolve(chromeDirectory, `bg-dpr${dpr}.png`));
    const values = [];
    let over8 = 0, over32 = 0;
    for (let i = 0; i < chrome.data.length; i += 4) {
      const covered = [0, 1, 2].some(c => chrome.data[i + c] !== background.data[i + c] || godot.data[i + c] !== background.data[i + c]);
      if (!covered) continue;
      const worst = Math.max(...[0, 1, 2].map(c => Math.abs(chrome.data[i + c] - godot.data[i + c])));
      values.push(worst);
      if (worst > 8) over8++;
      if (worst > 32) over32++;
    }
    const entry = { tag, scene: name, variant, dpr, covered: values.length, ...stats(values), fractionOver8: over8 / values.length, fractionOver32: over32 / values.length };
    sceneResults.push(entry);
    if (sides.includes(name) || sides.includes('all')) {
      const diff = resolve(outDirectory, `diff-scene-${tag}-${name}-${variant}-dpr${dpr}.png`);
      execFileSync('magick', [chromePath, godotPath, '-compose', 'difference', '-composite', '-evaluate', 'multiply', '4', diff]);
      execFileSync('magick', [
        '(', chromePath, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', 'Chrome', ')',
        '(', godotPath, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', `Godot ${variant} (${tag})`, ')',
        '(', diff, '-gravity', 'north', '-background', '#222', '-font', FONT, '-fill', 'white', '-splice', '0x22', '-annotate', '+0+3', 'difference x4', ')',
        '+append', resolve(outDirectory, `side-scene-${tag}-${name}-${variant}-dpr${dpr}.png`),
      ]);
    }
  }
}
if (sceneResults.length) {
  writeFileSync(resolve(outDirectory, 'scene-results.json'), JSON.stringify(sceneResults, null, 1));
  console.log('tag | scene | variant | dpr | covered px | mean / p99 / max | fraction over 8 | over 32');
  for (const r of sceneResults) console.log(`${r.tag} | ${r.scene} | ${r.variant} | ${r.dpr} | ${r.covered} | ${r.mean.toFixed(2)} / ${r.p99} / ${r.max} | ${(r.fractionOver8 * 100).toFixed(2)}% | ${(r.fractionOver32 * 100).toFixed(2)}%`);
}
writeFileSync(resolve(outDirectory, 'results.json'), JSON.stringify(results, null, 1));

console.log('tag | mode | dpr | scenario | interior mean/p99/max | edge mean/p99/max | exterior max');
for (const r of results) console.log(`${r.tag} | ${r.mode} | ${r.dpr} | ${r.id} | ${fmt(r.interior)} | ${fmt(r.edge)} | ${r.exterior.n ? r.exterior.max : '-'}`);
