extends RefCounted
# The compositor-layer experiment (docs/tracks/transforms-3d-feasibility.md): CSS transform maths, the quad a layer is
# drawn with, and the fragment shader that samples the layer's render target through the inverse homography.
# Raw RenderingServer only, so the same code runs on both engines and all three renderers.
#
# Matrices are 4 x 4 Arrays of Arrays, row-major, acting on column vectors, in CSS pixels (x right, y down, z toward the
# viewer): the same convention as geometry.mjs, which is the independent cross-check.

const W_EPSILON := 1e-5

# ---- maths ------------------------------------------------------------------------------------------------------

static func identity() -> Array:
	return [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]

static func mul(a: Array, b: Array) -> Array:
	var out := []
	for i in 4:
		var row := [0.0, 0.0, 0.0, 0.0]
		for j in 4:
			var sum := 0.0
			for k in 4:
				sum += float(a[i][k]) * float(b[k][j])
			row[j] = sum
		out.append(row)
	return out

static func translate(x: float, y: float, z: float) -> Array:
	return [[1.0, 0.0, 0.0, x], [0.0, 1.0, 0.0, y], [0.0, 0.0, 1.0, z], [0.0, 0.0, 0.0, 1.0]]

static func transform_function(name: String, value: float) -> Array:
	match name:
		"perspective":
			return [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, -1.0 / value, 1.0]]
		"translateX":
			return translate(value, 0.0, 0.0)
		"translateY":
			return translate(0.0, value, 0.0)
		"translateZ":
			return translate(0.0, 0.0, value)
		"rotateX":
			var c := cos(deg_to_rad(value))
			var s := sin(deg_to_rad(value))
			return [[1.0, 0.0, 0.0, 0.0], [0.0, c, -s, 0.0], [0.0, s, c, 0.0], [0.0, 0.0, 0.0, 1.0]]
		"rotateY":
			var c := cos(deg_to_rad(value))
			var s := sin(deg_to_rad(value))
			return [[c, 0.0, s, 0.0], [0.0, 1.0, 0.0, 0.0], [-s, 0.0, c, 0.0], [0.0, 0.0, 0.0, 1.0]]
		"rotateZ":
			var c := cos(deg_to_rad(value))
			var s := sin(deg_to_rad(value))
			return [[c, -s, 0.0, 0.0], [s, c, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]
	push_error("unsupported transform function " + name)
	return identity()

# The matrix from a box's own coordinates (its top left corner is the origin) to its parent's, for a transform list
# around the box's centre, and the parent's perspective (a distance, 0 for none) and perspective-origin (fractions).
static func box_matrix(list: Array, box: Rect2, perspective: float, origin: Vector2, container: Vector2) -> Array:
	var m := identity()
	for entry in list:
		m = mul(m, transform_function(String(entry[0]), float(entry[1])))
	var centre := box.size / 2.0
	m = mul(translate(box.position.x + centre.x, box.position.y + centre.y, 0.0), mul(m, translate(-centre.x, -centre.y, 0.0)))
	if perspective > 0.0:
		var p := Vector2(origin.x * container.x, origin.y * container.y)
		m = mul(translate(p.x, p.y, 0.0), mul(transform_function("perspective", perspective), mul(translate(-p.x, -p.y, 0.0), m)))
	return m

static func scenario_matrix(scenario: Dictionary, card: Dictionary, viewport: Array) -> Array:
	var box := Rect2(card.left, card.top, card.width, card.height)
	var origin := Vector2(0.5, 0.5)
	if scenario.has("origin"):
		origin = Vector2(scenario.origin[0], scenario.origin[1])
	return box_matrix(scenario.transform, box, float(scenario.get("perspective", 0.0)), origin, Vector2(viewport[0], viewport[1]))

# 3 x 3 helpers (Arrays of three Arrays of three floats).
static func inverse3(m: Array) -> Array:
	var a: float = m[0][0]; var b: float = m[0][1]; var c: float = m[0][2]
	var d: float = m[1][0]; var e: float = m[1][1]; var f: float = m[1][2]
	var g: float = m[2][0]; var h: float = m[2][1]; var i: float = m[2][2]
	var det := a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
	var s := 1.0 / det
	return [
		[(e * i - f * h) * s, (c * h - b * i) * s, (b * f - c * e) * s],
		[(f * g - d * i) * s, (a * i - c * g) * s, (c * d - a * f) * s],
		[(d * h - e * g) * s, (b * g - a * h) * s, (a * e - b * d) * s],
	]

# The plane z = 0 of a box: (x, y, 1) -> (X, Y, W).
static func homography(m: Array) -> Array:
	return [[m[0][0], m[0][1], m[0][3]], [m[1][0], m[1][1], m[1][3]], [m[3][0], m[3][1], m[3][3]]]

# Screen position (in the box's parent's coordinates, homogeneous with w = 1) to (s, t, 1) / W, where (s, t) are the
# box's own coordinates divided by its size: what the fragment shader needs, so it samples a texture in 0..1.
static func screen_to_plane(m: Array, size: Vector2) -> Array:
	var inv := inverse3(homography(m))
	return [
		[inv[0][0] / size.x, inv[0][1] / size.x, inv[0][2] / size.x],
		[inv[1][0] / size.y, inv[1][1] / size.y, inv[1][2] / size.y],
		[inv[2][0], inv[2][1], inv[2][2]],
	]

# Positive when the box's front faces the viewer. The local Jacobian determinant of (u, v) -> (X / W, Y / W) is
# det(H) / W^3 and visible points have W > 0, so the sign is the sign of det(H); there is no need to project the corners.
static func facing(m: Array, _size: Vector2) -> float:
	var h := homography(m)
	return h[0][0] * (h[1][1] * h[2][2] - h[1][2] * h[2][1]) - h[0][1] * (h[1][0] * h[2][2] - h[1][2] * h[2][0]) + h[0][2] * (h[1][0] * h[2][1] - h[1][1] * h[2][0])

static func project(m: Array, x: float, y: float, z: float = 0.0) -> Vector3:
	# Returns (screen x, screen y, w).
	var w: float = m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3]
	return Vector3((m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3]) / w, (m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3]) / w, w)

# The convex polygon a box covers on screen: the box clipped to W > epsilon, then to `clip`, with its edges moved out
# by `expand` pixels so the shader's own edge coverage has fragments to work on. Counter-clockwise or clockwise as the
# transform leaves it; empty if nothing is visible.
static func visible_polygon(m: Array, size: Vector2, clip: Rect2, expand: float) -> PackedVector2Array:
	var corners: Array[Vector2] = [Vector2(0, 0), Vector2(size.x, 0), Vector2(size.x, size.y), Vector2(0, size.y)]
	var hom: Array = []
	for corner in corners:
		hom.append([m[0][0] * corner.x + m[0][1] * corner.y + m[0][3], m[1][0] * corner.x + m[1][1] * corner.y + m[1][3], m[3][0] * corner.x + m[3][1] * corner.y + m[3][3]])
	var kept: Array[Vector2] = []
	for i in 4:
		var a: Array = hom[i]
		var b: Array = hom[(i + 1) % 4]
		var a_in: bool = a[2] > W_EPSILON
		var b_in: bool = b[2] > W_EPSILON
		if a_in:
			kept.append(Vector2(a[0] / a[2], a[1] / a[2]))
		if a_in != b_in:
			var t: float = (W_EPSILON - a[2]) / (b[2] - a[2])
			var w := W_EPSILON
			kept.append(Vector2((a[0] + (b[0] - a[0]) * t) / w, (a[1] + (b[1] - a[1]) * t) / w))
	if kept.size() < 3:
		return PackedVector2Array()
	var polygon := _expand(kept, expand)
	return _clip_to_rect(polygon, clip)

static func _area(points: Array[Vector2]) -> float:
	var sum := 0.0
	for i in points.size():
		var a := points[i]
		var b := points[(i + 1) % points.size()]
		sum += a.x * b.y - b.x * a.y
	return sum / 2.0

static func _expand(points: Array[Vector2], amount: float) -> Array[Vector2]:
	if amount == 0.0 or absf(_area(points)) < 1e-9:
		return points
	var sign_area := signf(_area(points))
	var n := points.size()
	var lines: Array = []   # point on the offset line, direction
	for i in n:
		var a := points[i]
		var b := points[(i + 1) % n]
		var d := (b - a).normalized()
		var outward := Vector2(d.y, -d.x) * sign_area
		lines.append([a + outward * amount, d])
	var out: Array[Vector2] = []
	for i in n:
		var l0: Array = lines[(i + n - 1) % n]
		var l1: Array = lines[i]
		var p0: Vector2 = l0[0]
		var d0: Vector2 = l0[1]
		var p1: Vector2 = l1[0]
		var d1: Vector2 = l1[1]
		var denom := d0.cross(d1)
		if absf(denom) < 1e-9:
			out.append(p1)
		else:
			var t := (p1 - p0).cross(d1) / denom
			out.append(p0 + d0 * t)
	return out

static func _clip_to_rect(points: Array[Vector2], r: Rect2) -> PackedVector2Array:
	var current: Array[Vector2] = points
	var planes := [[Vector2(1, 0), r.position.x], [Vector2(-1, 0), -r.end.x], [Vector2(0, 1), r.position.y], [Vector2(0, -1), -r.end.y]]
	for plane in planes:
		var normal: Vector2 = plane[0]
		var offset: float = plane[1]
		var next: Array[Vector2] = []
		for i in current.size():
			var a := current[i]
			var b := current[(i + 1) % current.size()]
			var da := normal.dot(a) - offset
			var db := normal.dot(b) - offset
			if da >= 0.0:
				next.append(a)
			if (da >= 0.0) != (db >= 0.0):
				next.append(a + (b - a) * (da / (da - db)))
		current = next
		if current.size() < 3:
			return PackedVector2Array()
	return PackedVector2Array(current)

# ---- the shader ---------------------------------------------------------------------------------------------------

# A layer's inverse homography reaches the shader as three uniform rows (screen_to_plane). `local` is the vertex's
# position in the item's own space, interpolated affinely, which is exact because every ancestor transform is affine:
# so the shader needs nothing about the ancestors, the device pixel ratio or the viewport.
const SHADER := """
shader_type canvas_item;
render_mode blend_premul_alpha;

uniform sampler2D layer : filter_linear, repeat_disable;
uniform vec3 row_s;
uniform vec3 row_t;
uniform vec3 row_w;
uniform int max_taps = 8;      // per axis; 1 is one bilinear tap, which is what Chrome's compositor does
uniform float edge_aa = 1.0;   // 0 switches the analytic edge coverage off (to show what it does)

varying vec2 local;

void vertex() {
	local = VERTEX;
}

void fragment() {
	vec3 p = vec3(local, 1.0);
	vec3 q = vec3(dot(row_s, p), dot(row_t, p), dot(row_w, p));   // (s, t, 1) / W, affine in screen space
	if (q.z <= 0.0) {
		discard;
	}
	// Signed distances to the four edges of the plane rectangle in device pixels: each numerator is affine in screen
	// space, so its derivative is constant and the distance is exact.
	vec4 e = vec4(q.x, q.z - q.x, q.y, q.z - q.y);
	vec4 gx = dFdx(e);
	vec4 gy = dFdy(e);
	vec4 d = e / max(sqrt(gx * gx + gy * gy), vec4(1e-12));
	vec4 c = clamp(d + 0.5, 0.0, 1.0);
	float coverage = mix(1.0, c.x * c.y * c.z * c.w, edge_aa);
	if (coverage <= 0.0) {
		discard;
	}
	vec2 st = q.xy / q.z;
	vec2 dst_dx = (dFdx(q.xy) * q.z - q.xy * dFdx(q.z)) / (q.z * q.z);
	vec2 dst_dy = (dFdy(q.xy) * q.z - q.xy * dFdy(q.z)) / (q.z * q.z);
	vec2 size = vec2(textureSize(layer, 0));
	vec2 jx = dst_dx * size;
	vec2 jy = dst_dy * size;
	int nx = clamp(int(ceil(length(jx) - 0.05)), 1, max_taps);
	int ny = clamp(int(ceil(length(jy) - 0.05)), 1, max_taps);
	vec4 sum = vec4(0.0);
	for (int j = 0; j < ny; j++) {
		for (int i = 0; i < nx; i++) {
			vec2 offset = vec2((float(i) + 0.5) / float(nx) - 0.5, (float(j) + 0.5) / float(ny) - 0.5);
			sum += texture(layer, st + dst_dx * offset.x + dst_dy * offset.y);
		}
	}
	COLOR = sum / float(nx * ny) * (coverage * COLOR.a);
}
"""

# The largest singular value of the Jacobian of the box's map to the screen, over a grid of the box: the largest local
# magnification, which is what decides the raster scale (Chrome's choice fits round(dpr * this)).
static func max_magnification(m: Array, size: Vector2, steps := 10) -> float:
	var best := 0.0
	for i in steps + 1:
		for j in steps + 1:
			var u := size.x * i / steps
			var v := size.y * j / steps
			var x: float = m[0][0] * u + m[0][1] * v + m[0][3]
			var y: float = m[1][0] * u + m[1][1] * v + m[1][3]
			var w: float = m[3][0] * u + m[3][1] * v + m[3][3]
			if w <= W_EPSILON:
				return INF
			var a: float = (m[0][0] * w - x * m[3][0]) / (w * w)
			var b: float = (m[0][1] * w - x * m[3][1]) / (w * w)
			var c: float = (m[1][0] * w - y * m[3][0]) / (w * w)
			var d: float = (m[1][1] * w - y * m[3][1]) / (w * w)
			var f := a * a + b * b + c * c + d * d
			var det := a * d - b * c
			best = maxf(best, sqrt((f + sqrt(maxf(f * f - 4.0 * det * det, 0.0))) / 2.0))
	return best

# ---- the server objects -------------------------------------------------------------------------------------------

var rs := RenderingServer
var shader: RID

var shader_mix: RID   # the control: the same shader without blend_premul_alpha (the engine's default blend)

func _init() -> void:
	shader = rs.shader_create()
	rs.shader_set_code(shader, SHADER)
	shader_mix = rs.shader_create()
	rs.shader_set_code(shader_mix, SHADER.replace("render_mode blend_premul_alpha;", ""))

# A render target with its own canvas, transparent, drawn at `scale` texels per CSS pixel. `items_parent` is the canvas.
class Layer:
	var viewport: RID
	var canvas: RID
	var texture: RID
	var size_px: Vector2i
	var css_size: Vector2

func make_layer(css_size: Vector2, scale: float, parent_viewport: RID = RID(), update_mode: int = RenderingServer.VIEWPORT_UPDATE_ONCE) -> Layer:
	var layer := Layer.new()
	layer.css_size = css_size
	layer.size_px = Vector2i(ceili(css_size.x * scale), ceili(css_size.y * scale))
	layer.viewport = rs.viewport_create()
	rs.viewport_set_size(layer.viewport, layer.size_px.x, layer.size_px.y)
	rs.viewport_set_transparent_background(layer.viewport, true)
	rs.viewport_set_clear_mode(layer.viewport, RenderingServer.VIEWPORT_CLEAR_ALWAYS)
	rs.viewport_set_update_mode(layer.viewport, update_mode)
	if parent_viewport.is_valid():
		rs.viewport_set_parent_viewport(layer.viewport, parent_viewport)
	layer.canvas = rs.canvas_create()
	rs.viewport_attach_canvas(layer.viewport, layer.canvas)
	rs.viewport_set_canvas_transform(layer.viewport, layer.canvas, Transform2D(0.0, Vector2(scale, scale), 0.0, Vector2.ZERO))
	rs.viewport_set_active(layer.viewport, true)
	layer.texture = rs.viewport_get_texture(layer.viewport)
	return layer

func free_shaders() -> void:
	rs.free_rid(shader)
	rs.free_rid(shader_mix)

func free_layer(layer: Layer) -> void:
	rs.viewport_set_active(layer.viewport, false)
	rs.free_rid(layer.viewport)
	rs.free_rid(layer.canvas)

# A material for one layer quad (shader parameters are uniforms on this material).
func make_material(texture: RID, max_taps: int = 1, edge_aa: float = 1.0, premultiplied := true) -> RID:
	var material := rs.material_create()
	rs.material_set_shader(material, shader if premultiplied else shader_mix)
	rs.material_set_param(material, "layer", texture)
	rs.material_set_param(material, "max_taps", max_taps)
	rs.material_set_param(material, "edge_aa", edge_aa)
	return material

func set_material_matrix(material: RID, m: Array, size: Vector2) -> void:
	var k := screen_to_plane(m, size)
	rs.material_set_param(material, "row_s", Vector3(k[0][0], k[0][1], k[0][2]))
	rs.material_set_param(material, "row_t", Vector3(k[1][0], k[1][1], k[1][2]))
	rs.material_set_param(material, "row_w", Vector3(k[2][0], k[2][1], k[2][2]))

# (Re)draw the quad item: the visible polygon of the box under `m`; the material holds the layer's texture.
func set_quad(item: RID, material: RID, m: Array, size: Vector2, clip: Rect2, expand: float = 1.0) -> bool:
	rs.canvas_item_clear(item)
	var polygon := visible_polygon(m, size, clip, expand)
	if polygon.size() < 3:
		return false
	rs.canvas_item_set_material(item, material)
	var white := PackedColorArray()
	var uvs := PackedVector2Array()
	for point in polygon:
		white.append(Color.WHITE)
		uvs.append(Vector2.ZERO)
	rs.canvas_item_add_polygon(item, polygon, white, uvs)
	return true
