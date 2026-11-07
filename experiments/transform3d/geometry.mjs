// The CSS transform maths, written independently of the GDScript in compositor.gd so that the two cross-check each other:
// the corners this module projects are compared with the ones the experiment draws, and with Chrome's getBoundingClientRect().
//
// Matrices are 4 x 4, row-major, acting on column vectors (p' = M p), in CSS pixels, x right, y down, z toward the viewer.

export const identity = () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

export function multiply(a, b) {
  return a.map((_, row) => b[0].map((__, column) => a[row].reduce((sum, value, k) => sum + value * b[k][column], 0)));
}

export const translate = (x, y, z) => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];
const radians = degrees => (degrees * Math.PI) / 180;

// The matrices of the CSS transform functions (CSS Transforms 2, "Mathematical description of transform functions").
export function transformFunction(name, value) {
  switch (name) {
    case 'perspective': return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1 / value, 1]];
    case 'translateZ': return translate(0, 0, value);
    case 'translateX': return translate(value, 0, 0);
    case 'translateY': return translate(0, value, 0);
    case 'rotateX': { const c = Math.cos(radians(value)), s = Math.sin(radians(value)); return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]]; }
    case 'rotateY': { const c = Math.cos(radians(value)), s = Math.sin(radians(value)); return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]; }
    case 'rotateZ': { const c = Math.cos(radians(value)), s = Math.sin(radians(value)); return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; }
    default: throw new Error(`unsupported transform function ${name}`);
  }
}

export const cssUnit = { perspective: 'px', translateZ: 'px', translateX: 'px', translateY: 'px', rotateX: 'deg', rotateY: 'deg', rotateZ: 'deg' };
export const cssTransform = list => list.map(([name, value]) => `${name}(${value}${cssUnit[name]})`).join(' ');

// The matrix from the card's own box (origin at its top left corner, in CSS px) to the viewport, for one scenario.
export function cardMatrix(scenario, card, viewport) {
  let matrix = identity();
  for (const [name, value] of scenario.transform) matrix = multiply(matrix, transformFunction(name, value));
  const ox = card.width / 2, oy = card.height / 2;
  matrix = multiply(translate(card.left + ox, card.top + oy, 0), multiply(matrix, translate(-ox, -oy, 0)));
  if (scenario.perspective) {
    const [fx, fy] = scenario.origin ?? [0.5, 0.5];
    const px = fx * viewport[0], py = fy * viewport[1];
    matrix = multiply(translate(px, py, 0), multiply(transformFunction('perspective', scenario.perspective), multiply(translate(-px, -py, 0), matrix)));
  }
  return matrix;
}

// The 3 x 3 homography of the plane z = 0 of the card: (x, y, 1) -> (X, Y, W).
export const homography = m => [[m[0][0], m[0][1], m[0][3]], [m[1][0], m[1][1], m[1][3]], [m[3][0], m[3][1], m[3][3]]];

// The card's rectangle clipped to W > epsilon (the plane at the eye), as the polygon it covers on screen.
// Each vertex has its plane position (u, v), its homogeneous w and its screen position.
export const W_EPSILON = 1e-5;
export function projectedPolygon(m, width, height) {
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([u, v]) => ({
    u, v, x: m[0][0] * u + m[0][1] * v + m[0][3], y: m[1][0] * u + m[1][1] * v + m[1][3], w: m[3][0] * u + m[3][1] * v + m[3][3],
  }));
  const kept = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    const aIn = a.w > W_EPSILON, bIn = b.w > W_EPSILON;
    if (aIn) kept.push(a);
    if (aIn !== bIn) {
      const t = (W_EPSILON - a.w) / (b.w - a.w);
      kept.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: W_EPSILON });
    }
  }
  return kept.map(p => ({ ...p, sx: p.x / p.w, sy: p.y / p.w }));
}

// Signed area of the projected card (positive: the front faces the viewer, with y down and the corners clockwise on screen).
export function facing(m, width, height) {
  const polygon = [[0, 0], [width, 0], [width, height], [0, height]].map(([u, v]) => {
    const w = m[3][0] * u + m[3][1] * v + m[3][3];
    return { sx: (m[0][0] * u + m[0][1] * v + m[0][3]) / w, sy: (m[1][0] * u + m[1][1] * v + m[1][3]) / w };
  });
  let area = 0;
  for (let i = 0; i < 4; i++) { const a = polygon[i], b = polygon[(i + 1) % 4]; area += a.sx * b.sy - b.sx * a.sy; }
  return area / 2;
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Inside a convex polygon given by { sx, sy } vertices, by the signs of the edge functions.
export function insideConvex(polygon, px, py) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const cross = (b.sx - a.sx) * (py - a.sy) - (b.sy - a.sy) * (px - a.sx);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

// Signed distance to a convex polygon's boundary: negative inside, in the same units as the vertices.
export function signedDistance(polygon, px, py) {
  let nearest = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    nearest = Math.min(nearest, distanceToSegment(px, py, a.sx, a.sy, b.sx, b.sy));
  }
  return insideConvex(polygon, px, py) ? -nearest : nearest;
}
