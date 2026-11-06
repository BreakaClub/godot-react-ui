/**
 * The geometry of a UI panel drawn on a 3D quad: where a ray meets the quad, and which pixel of the panel's
 * `SubViewport` that is. Plain numbers only, so Node can unit test it (`tests/world-geometry.test.ts`); the
 * Godot owner (`world-main.ts`) moves a world-space ray into the quad's local space and calls this.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * A rectangle in its local `z = 0` plane, centred on the local origin, facing local `+z`: what a `QuadMesh`
 * with its default orientation is. It shows a texture of `pixelWidth` by `pixelHeight` pixels (the
 * `SubViewport` size), whose first row is the quad's top edge and whose first column is its left edge.
 */
export interface QuadSurface {
  /** Local-space extent: the mesh's `size`. */
  readonly width: number;
  readonly height: number;
  /** The panel's pixels: the `SubViewport`'s logical size, which is the coordinate space of its input. */
  readonly pixelWidth: number;
  readonly pixelHeight: number;
}

export interface QuadHit {
  /**
   * The panel pixel under the ray. Where the ray meets the quad's plane beside the quad this is outside
   * `[0, pixelWidth) x [0, pixelHeight)` and `inside` is false; a press that began on the panel keeps being
   * routed with these coordinates, as a window routes a drag that leaves it.
   */
  readonly x: number;
  readonly y: number;
  readonly inside: boolean;
  /**
   * Whether the ray met the face a `QuadMesh` draws (the side the quad's `+z` normal points to). With the
   * default back-face culling the other side shows nothing, so a hit on it must not reach the panel.
   */
  readonly frontFacing: boolean;
  /** The ray parameter of the hit: `origin + distance * direction`. */
  readonly distance: number;
}

/**
 * A direction whose `z` is this small a fraction of its length is parallel to the plane. The ratio is
 * dimensionless, so the quad's scale does not matter; it is far below anything a camera ray produces
 * (one pixel of a 16K display at 90 degrees of field of view is about 1e-4 radian).
 */
const PARALLEL_FRACTION = 1e-9;

/**
 * Meets a ray, given in the quad's local space, with the quad's plane. Returns `undefined` when the ray
 * is parallel to the plane or the plane is behind the ray's origin; there is no hit to route then.
 *
 * Working in local space needs no plane equation: the plane is `z = 0`, so `origin.z + t * direction.z = 0`
 * gives `t`, and scale or shear in the quad's transform is already inside the local ray.
 */
export function intersectQuad(origin: Vec3, direction: Vec3, quad: QuadSurface): QuadHit | undefined {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length === 0 || Math.abs(direction.z) <= PARALLEL_FRACTION * length) return undefined;
  const distance = -origin.z / direction.z;
  if (distance <= 0) return undefined;
  const localX = origin.x + distance * direction.x;
  const localY = origin.y + distance * direction.y;
  // +x is the right edge and +y the top edge in local space; pixel rows grow downwards.
  const x = (localX / quad.width + 0.5) * quad.pixelWidth;
  const y = (0.5 - localY / quad.height) * quad.pixelHeight;
  const inside = x >= 0 && x < quad.pixelWidth && y >= 0 && y < quad.pixelHeight;
  return { x, y, inside, frontFacing: direction.z < 0, distance };
}

/** The inverse of the pixel mapping: the quad-local point of a panel pixel, on the `z = 0` plane. */
export function quadPixelToLocal(quad: QuadSurface, x: number, y: number): Vec3 {
  return {
    x: (x / quad.pixelWidth - 0.5) * quad.width,
    y: (0.5 - y / quad.pixelHeight) * quad.height,
    z: 0,
  };
}
