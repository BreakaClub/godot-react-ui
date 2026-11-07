// Hit testing against Chrome: the card's hit grid from Chrome's elementFromPoint (chrome-reference.mjs, every 8 CSS px) against
// the inverse homography with the card's rounded corners, for each scenario. Run from the worktree root:
//   node experiments/transform3d/hit-test.mjs [--chrome=artifacts/transform3d-spike/chrome]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cardMatrix, homography, signedDistance } from './geometry.mjs';

const root = resolve(import.meta.dirname, '../..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const chromeDirectory = resolve(root, argument('chrome', 'artifacts/transform3d-spike/chrome'));
const reference = JSON.parse(readFileSync(resolve(chromeDirectory, 'reference.json'), 'utf8'));
const spec = JSON.parse(readFileSync(resolve(import.meta.dirname, 'scenarios.json'), 'utf8'));
const { card, viewport } = spec;
const RADIUS = 16;
const STEP = 8;

function inverse3([[a, b, c], [d, e, f], [g, h, i]]) {
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [[(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det], [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det], [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]];
}

// The plane point under a screen point, or null when the point sees the plane from behind the eye.
function planePoint(inv, x, y) {
  const q = [0, 1, 2].map(r => inv[r][0] * x + inv[r][1] * y + inv[r][2]);
  return q[2] > 0 ? [q[0] / q[2], q[1] / q[2]] : null;
}

function insideRoundedCard(u, v) {
  if (u < 0 || v < 0 || u > card.width || v > card.height) return false;
  const cx = u < RADIUS ? RADIUS : u > card.width - RADIUS ? card.width - RADIUS : u;
  const cy = v < RADIUS ? RADIUS : v > card.height - RADIUS ? card.height - RADIUS : v;
  return Math.hypot(u - cx, v - cy) <= RADIUS;
}

console.log('scenario | grid points | Chrome hits | ours | disagreements | worst distance of a disagreement from the card outline (screen px)');
for (const scenario of spec.scenarios) {
  const entry = reference.scenarios[scenario.id];
  const chromeHits = new Set(entry.perDpr[1].hits.map(([x, y]) => `${x},${y}`));
  const m = cardMatrix(scenario, card, viewport);
  const inv = inverse3(homography(m));
  let ours = 0, disagree = 0, worst = 0, count = 0;
  const hidden = scenario.backface === 'hidden';
  const det = (() => { const h = homography(m); return h[0][0] * (h[1][1] * h[2][2] - h[1][2] * h[2][1]) - h[0][1] * (h[1][0] * h[2][2] - h[1][2] * h[2][0]) + h[0][2] * (h[1][0] * h[2][1] - h[1][1] * h[2][0]); })();
  for (let y = STEP / 2; y < viewport[1]; y += STEP) for (let x = STEP / 2; x < viewport[0]; x += STEP) {
    count++;
    const p = planePoint(inv, x, y);
    const mine = p !== null && insideRoundedCard(p[0], p[1]) && !(hidden && det < 0);
    const chrome = chromeHits.has(`${x},${y}`);
    if (mine) ours++;
    if (mine !== chrome) {
      disagree++;
      const polygon = entry.polygon;
      if (polygon.length >= 3) worst = Math.max(worst, Math.abs(signedDistance(polygon, x, y)));
    }
  }
  console.log(`${scenario.id} | ${count} | ${chromeHits.size} | ${ours} | ${disagree} | ${worst.toFixed(2)}`);
}
