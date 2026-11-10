// Measuring ink in a raster: how much of a rectangle is drawn on, and how like another rendering of the same text it is. The Web
// verifier takes a rectangle of the canvas and the same rectangle of Chrome's own rendering of the text with the same font files, and compares them here.
// Both are decoded screenshots (`{ width, height, channels, pixels }`); a rectangle is `{ x, y, width, height }` in device pixels.

import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

const WHITE = [255, 255, 255];
const CHANNEL_MAXIMUM = 255;

/** How far each pixel of `rect` is from `paper`, 0 for paper to 1 for the farthest a channel can be: the ink a pixel carries, whatever its colour. */
export function coverageOf(image, rect, paper = WHITE) {
  const map = new Float32Array(rect.width * rect.height);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const at = ((rect.y + y) * image.width + rect.x + x) * image.channels;
      let distance = 0;
      for (let channel = 0; channel < 3; channel += 1) distance = Math.max(distance, Math.abs((image.pixels[at + channel] ?? 0) - (paper[channel] ?? 0)));
      map[y * rect.width + x] = distance / CHANNEL_MAXIMUM;
    }
  }
  return map;
}

/**
 * The red ink of `rect`: for a pixel, how far red leads green and blue, as a share of what a full red (Tailwind's red-600, #dc2626) leads them by on white paper.
 * A pixel of slate ink or of paper leads by nothing or less, so a span's colour is told from the text around it.
 */
const RED_FULL_LEAD = 0xdc - 0x26;
export function redInkOf(image, rect) {
  const map = new Float32Array(rect.width * rect.height);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const at = ((rect.y + y) * image.width + rect.x + x) * image.channels;
      const lead = (image.pixels[at] ?? 0) - ((image.pixels[at + 1] ?? 0) + (image.pixels[at + 2] ?? 0)) / 2;
      map[y * rect.width + x] = Math.max(0, Math.min(1, lead / RED_FULL_LEAD));
    }
  }
  return map;
}

export function inkTotal(map) {
  let total = 0;
  for (const value of map) total += value;
  return total;
}

/** The box of the pixels with at least `threshold` ink: `{ left, top, right, bottom }` (inclusive), or `undefined` for none. */
export function inkBounds(map, width, height, threshold = 0.2) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((map[y * width + x] ?? 0) < threshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? undefined : { left, top, right, bottom };
}

/** The normalised correlation of two coverage maps of one size, the second moved by `shift` pixels: 1 for the same ink in the same places, near 0 for unrelated. */
export function correlation(first, second, width, height, shift = { x: 0, y: 0 }) {
  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = x + shift.x;
      const sy = y + shift.y;
      const a = first[y * width + x] ?? 0;
      const b = sx >= 0 && sx < width && sy >= 0 && sy < height ? (second[sy * width + sx] ?? 0) : 0;
      dot += a * b;
      firstNorm += a * a;
      secondNorm += b * b;
    }
  }
  const norm = Math.sqrt(firstNorm * secondNorm);
  return norm === 0 ? 0 : dot / norm;
}

/** The best correlation over shifts of up to `reach` pixels each way, and the shift that gave it: two renderings of a text differ by where each places a baseline. */
export function bestCorrelation(first, second, width, height, reach = 2) {
  let best = { correlation: -1, dx: 0, dy: 0 };
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const value = correlation(first, second, width, height, { x: dx, y: dy });
      if (value > best.correlation) best = { correlation: value, dx, dy };
    }
  }
  return best;
}

/** The mean colour of the pixels of `rect` that carry at least `threshold` ink, weighted by it, as `[r, g, b]`; `undefined` when there is none. */
export function inkColour(image, rect, map, threshold = 0.3) {
  const sum = [0, 0, 0];
  let weight = 0;
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const ink = map[y * rect.width + x] ?? 0;
      if (ink < threshold) continue;
      const at = ((rect.y + y) * image.width + rect.x + x) * image.channels;
      for (let channel = 0; channel < 3; channel += 1) sum[channel] += (image.pixels[at + channel] ?? 0) * ink;
      weight += ink;
    }
  }
  return weight === 0 ? undefined : sum.map(value => value / weight);
}

/** A rectangle of a raster: `rect` (in css pixels) grown by `margin`, scaled by the device pixel ratio and kept inside `image`. */
export function deviceRect(rect, ratio, margin, image) {
  const left = Math.max(0, Math.floor((rect.x - margin) * ratio));
  const top = Math.max(0, Math.floor((rect.y - margin) * ratio));
  const right = Math.min(image.width, Math.ceil((rect.x + rect.width + margin) * ratio));
  const bottom = Math.min(image.height, Math.ceil((rect.y + rect.height + margin) * ratio));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * A PNG screenshot decoded to `{ width, height, channels, pixels }` (8 bits, RGB or RGBA, not interlaced: what Chrome writes). The interaction verifier has a copy of this
 * for its own captures (`scripts/verify-interaction-web.mjs`); a verifier section cannot import that script, which runs when it is loaded.
 */
export function decodePng(buffer) {
  let offset = 8;
  let header;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colorType: body[9], interlace: body[12] };
    if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  assert.ok(header && header.depth === 8 && header.interlace === 0 && [2, 6].includes(header.colorType), `Unsupported screenshot PNG ${JSON.stringify(header)}`);
  const channels = header.colorType === 6 ? 4 : 3;
  const stride = header.width * channels;
  const raw = inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const toLeft = Math.abs(estimate - left);
        const toUp = Math.abs(estimate - up);
        const toUpLeft = Math.abs(estimate - upLeft);
        value += toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
      }
      pixels[y * stride + x] = value & 0xff;
    }
  }
  return { ...header, channels, pixels };
}
