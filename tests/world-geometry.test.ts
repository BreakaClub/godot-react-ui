import assert from 'node:assert/strict';
import test from 'node:test';
import { intersectQuad, quadPixelToLocal, type QuadSurface } from '../demo/src/world-geometry';

const QUAD: QuadSurface = { width: 1.5, height: 1, pixelWidth: 480, pixelHeight: 320 };
const PIXEL_TOLERANCE = 1e-9;

function near(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) <= PIXEL_TOLERANCE, `${message}: ${actual} is not ${expected}`);
}

test('a ray down the quad normal hits the centre pixel', () => {
  const hit = intersectQuad({ x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(hit);
  near(hit.x, 240, 'x');
  near(hit.y, 160, 'y');
  near(hit.distance, 3, 'distance');
  assert.equal(hit.inside, true);
});

test('local +x is the right edge and local +y the top edge', () => {
  // The top-left corner of the quad is local (-0.75, +0.5): pixel (0, 0).
  const topLeft = intersectQuad({ x: -0.75, y: 0.5, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(topLeft);
  near(topLeft.x, 0, 'top-left x');
  near(topLeft.y, 0, 'top-left y');
  assert.equal(topLeft.inside, true);
  // A quarter of the way along and down: pixel (120, 80).
  const quarter = intersectQuad({ x: -0.375, y: 0.25, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(quarter);
  near(quarter.x, 120, 'quarter x');
  near(quarter.y, 80, 'quarter y');
});

test('the right and bottom edges are outside, the left and top edges inside', () => {
  const right = intersectQuad({ x: 0.75, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(right);
  assert.equal(right.inside, false);
  near(right.x, 480, 'right edge x');
  const bottom = intersectQuad({ x: 0, y: -0.5, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(bottom);
  assert.equal(bottom.inside, false);
  const beside = intersectQuad({ x: 2, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  assert.ok(beside);
  assert.equal(beside.inside, false);
  assert.ok(beside.x > QUAD.pixelWidth, 'a hit beside the quad keeps its coordinates');
});

test('an oblique ray lands where the line meets the plane', () => {
  // From (0, 0, 2) towards (0.3, -0.2, -1) the line reaches z = 0 at t = 2: (0.6, -0.4).
  const hit = intersectQuad({ x: 0, y: 0, z: 2 }, { x: 0.3, y: -0.2, z: -1 }, QUAD);
  assert.ok(hit);
  near(hit.distance, 2, 'distance');
  near(hit.x, (0.6 / 1.5 + 0.5) * 480, 'x');
  near(hit.y, (0.5 + 0.4) * 320, 'y');
});

test('the distance is in direction lengths, so a scaled local ray gives the same pixel', () => {
  const unit = intersectQuad({ x: 0.1, y: 0.1, z: 2 }, { x: 0.1, y: -0.1, z: -1 }, QUAD);
  const scaled = intersectQuad({ x: 0.1, y: 0.1, z: 2 }, { x: 0.4, y: -0.4, z: -4 }, QUAD);
  assert.ok(unit && scaled);
  near(scaled.x, unit.x, 'x');
  near(scaled.y, unit.y, 'y');
  near(scaled.distance, unit.distance / 4, 'distance');
});

test('no hit: parallel, behind the origin, or no direction', () => {
  assert.equal(intersectQuad({ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, QUAD), undefined, 'parallel');
  assert.equal(intersectQuad({ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1e-12 }, QUAD), undefined, 'grazing');
  assert.equal(intersectQuad({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, QUAD), undefined, 'plane behind the ray');
  assert.equal(intersectQuad({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -1 }, QUAD), undefined, 'plane behind, other side');
  assert.equal(intersectQuad({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, QUAD), undefined, 'zero direction');
  assert.equal(intersectQuad({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, QUAD), undefined, 'origin on the plane');
});

test('a ray from behind the quad meets the same pixel but is not front-facing', () => {
  // The plane has no front, so the pixel is the same; the caller decides whether to route a back hit.
  const front = intersectQuad({ x: 0.2, y: 0.1, z: 1 }, { x: 0, y: 0, z: -1 }, QUAD);
  const back = intersectQuad({ x: 0.2, y: 0.1, z: -1 }, { x: 0, y: 0, z: 1 }, QUAD);
  assert.ok(front && back);
  near(back.x, front.x, 'x');
  near(back.y, front.y, 'y');
  assert.equal(front.frontFacing, true);
  assert.equal(back.frontFacing, false);
});

test('quadPixelToLocal inverts the pixel mapping', () => {
  for (const [x, y] of [[0, 0], [480, 320], [240, 160], [60, 250.5], [479.5, 0.25]] as const) {
    const local = quadPixelToLocal(QUAD, x, y);
    near(local.z, 0, 'on the plane');
    const hit = intersectQuad({ x: local.x, y: local.y, z: 5 }, { x: 0, y: 0, z: -1 }, QUAD);
    assert.ok(hit);
    near(hit.x, x, `x of (${x}, ${y})`);
    near(hit.y, y, `y of (${x}, ${y})`);
  }
});
