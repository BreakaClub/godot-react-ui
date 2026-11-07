extends RefCounted
# Item 7 of the brief: the alternatives to the compositor layer, one measurement each (spike.gd scenario=alt_*).
#   alt_group   (a) a canvas group with a homography material: no new target, but the group's own back buffer.
#   alt_vertex  (b) a vertex() shader projecting VERTEX with use_parent_material over the subtree: no target at all.
#   alt_cull    (b) culling: an item whose unprojected rectangle is off screen but whose projection is on screen.
#   alt_clip    (b) clips: an ancestor's axis-aligned clip applies in unprojected space.
#   alt_mesh    (c) subdivided mesh quads with CPU-projected vertices.
#   alt_node3d  (d) a real quad per element in a 3D viewport with a camera (further down).
# Outputs are <out>/<tag>/alt-<variant>-<scenario>-dpr<N>.png beside alt-truth-<kind>-<scenario>-dpr<N>.png; compare.mjs --alt reads them.

const Comp := preload("res://compositor.gd")

var h
var comp
var rs := RenderingServer

func _init(driver) -> void:
	h = driver
	comp = driver.comp

func _result(name: String, data) -> void:
	var file := FileAccess.open("%s/%s/%s.json" % [h.out_dir, h.tag, name], FileAccess.WRITE)
	file.store_string(JSON.stringify(data, " "))
	file.close()
	print("RESULT ", name, " ", JSON.stringify(data))

func _scenarios(default_ids: String) -> Array:
	var ids: PackedStringArray = String(h.args.get("ids", default_ids)).split(",")
	var out := []
	for scenario in h.spec.scenarios:
		if ids.has(scenario.id):
			out.append(scenario)
	return out

func _straight_chrome_texture(r: float) -> ImageTexture:
	var image := Image.load_from_file("%s/flat-r%s.png" % [h.chrome_dir, h.scale_name(r)])
	image.convert(Image.FORMAT_RGBA8)
	return ImageTexture.create_from_image(image)

# The reference every alternative is compared with: the compositor layer at raster scale = the device pixel ratio (which is
# what the alternatives' own textures have), drawn from Chrome's raster ("tex") or from the card drawn by Godot ("own").
func _truth(kind: String, scenario: Dictionary, dpr: float) -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(h.spec.card.width, h.spec.card.height)
	var m: Array = Comp.scenario_matrix(scenario, h.spec.card, viewport)
	var stage = h.make_stage(css_size, dpr)
	h.draw_background(stage.canvas, css_size)
	var layer = null
	var keep = null
	var texture: RID
	if kind == "tex":
		keep = h.chrome_flat(dpr)
		texture = keep.get_rid()
	else:
		layer = comp.make_layer(card_size, dpr, stage.viewport)
		h.draw_card(h.new_item(layer.canvas), card_size)
		texture = layer.texture
	var material: RID = comp.make_material(texture, 1)
	comp.set_material_matrix(material, m, card_size)
	comp.set_quad(h.new_item(stage.canvas, 1), material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
	await h.capture(stage, "%s/%s/alt-truth-%s-%s-dpr%d.png" % [h.out_dir, h.tag, kind, scenario.id, dpr])
	rs.free_rid(material)
	h.free_tracked()
	if layer != null:
		comp.free_layer(layer)
	h.free_stage(stage)

# ---- (a) a canvas group with a homography material ----------------------------------------------------------------

# The group's shader: the group's own back buffer holds the flat card where it stands; every fragment of the wrapper
# (which covers the projected outline) reads it back at the inverse homography of its position.
const GROUP_SHADER := """
shader_type canvas_item;
render_mode blend_premul_alpha;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear, repeat_disable;
uniform vec3 row_s;
uniform vec3 row_t;
uniform vec3 row_w;
uniform vec2 card_origin;
uniform vec2 card_size;
uniform float dpr;
uniform bool straight = false;
varying vec2 local;

void vertex() {
	local = VERTEX;
}

void fragment() {
	vec3 p = vec3(local, 1.0);
	vec3 q = vec3(dot(row_s, p), dot(row_t, p), dot(row_w, p));
	if (q.z <= 0.0) {
		discard;
	}
	vec4 e = vec4(q.x, q.z - q.x, q.y, q.z - q.y);
	vec4 gx = dFdx(e);
	vec4 gy = dFdy(e);
	vec4 c = clamp(e / max(sqrt(gx * gx + gy * gy), vec4(1e-12)) + 0.5, 0.0, 1.0);
	float coverage = c.x * c.y * c.z * c.w;
	vec2 st = q.xy / q.z;
	vec2 source = (card_origin + st * card_size) * dpr;
	vec4 t = texture(screen_tex, source * SCREEN_PIXEL_SIZE);
	if (straight) {
		t.rgb *= t.a;
	}
	COLOR = t * coverage;
}
"""

func alt_group() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card: Dictionary = h.spec.card
	var card_size := Vector2(card.width, card.height)
	var shader := rs.shader_create()
	rs.shader_set_code(shader, GROUP_SHADER)
	for dpr in [1, 2]:
		for scenario in _scenarios("p35,steep,x25,combo"):
			await _truth("tex", scenario, dpr)
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			var k: Array = Comp.screen_to_plane(m, card_size)
			for straight in [false, true]:
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var keep: ImageTexture = _straight_chrome_texture(dpr)
				var material := rs.material_create()
				rs.material_set_shader(material, shader)
				rs.material_set_param(material, "row_s", Vector3(k[0][0], k[0][1], k[0][2]))
				rs.material_set_param(material, "row_t", Vector3(k[1][0], k[1][1], k[1][2]))
				rs.material_set_param(material, "row_w", Vector3(k[2][0], k[2][1], k[2][2]))
				rs.material_set_param(material, "card_origin", Vector2(card.left, card.top))
				rs.material_set_param(material, "card_size", card_size)
				rs.material_set_param(material, "dpr", float(dpr))
				rs.material_set_param(material, "straight", straight)
				var wrapper: RID = h.new_item(stage.canvas, 1)
				rs.canvas_item_set_canvas_group_mode(wrapper, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, false, 0.0, false)
				rs.canvas_item_set_material(wrapper, material)
				var outline := Comp.visible_polygon(m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)), 1.0)
				var colours := PackedColorArray()
				var uvs := PackedVector2Array()
				for point in outline:
					colours.append(Color.WHITE)
					uvs.append(Vector2.ZERO)
				rs.canvas_item_add_polygon(wrapper, outline, colours, uvs)
				var content: RID = h.new_item(wrapper)
				rs.canvas_item_add_texture_rect(content, Rect2(card.left, card.top, card.width, card.height), keep.get_rid())
				await h.capture(stage, "%s/%s/alt-group%s-%s-dpr%d.png" % [h.out_dir, h.tag, "-straight" if straight else "", scenario.id, dpr])
				rs.free_rid(material)
				h.free_tracked()
				h.free_stage(stage)
	rs.free_rid(shader)
	_result("alt_group", { "done": true })

# ---- (b) a vertex() shader projecting the subtree ---------------------------------------------------------------

const VERTEX_SHADER := """
shader_type canvas_item;
render_mode skip_vertex_transform;
uniform vec3 hx;
uniform vec3 hy;
uniform vec3 hw;
void vertex() {
	vec2 world = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
	vec3 p = vec3(world, 1.0);
	vec3 projected = vec3(dot(hx, p), dot(hy, p), dot(hw, p));
	VERTEX = projected.xy / projected.z;
}
"""

# The homography from the flat card where it stands (in the stage's CSS pixels) to the screen.
func _world_homography(m: Array, card: Dictionary) -> Array:
	var hom: Array = Comp.homography(m)
	# H * T(-left, -top)
	var out := []
	for r in 3:
		out.append([hom[r][0], hom[r][1], hom[r][2] - hom[r][0] * card.left - hom[r][1] * card.top])
	return out

func _projection_material(shader: RID, m: Array, card: Dictionary) -> RID:
	var w: Array = _world_homography(m, card)
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	rs.material_set_param(material, "hx", Vector3(w[0][0], w[0][1], w[0][2]))
	rs.material_set_param(material, "hy", Vector3(w[1][0], w[1][1], w[1][2]))
	rs.material_set_param(material, "hw", Vector3(w[2][0], w[2][1], w[2][2]))
	return material

# kinds: tex (a textured rect: the seam of an affine UV), style (a StyleBoxFlat), glyphs (text), card (all of the card).
func alt_vertex() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card: Dictionary = h.spec.card
	var card_size := Vector2(card.width, card.height)
	var shader := rs.shader_create()
	rs.shader_set_code(shader, VERTEX_SHADER)
	for dpr in [1, 2]:
		for scenario in _scenarios("p35,steep,x25,combo,tz"):
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			await _truth("tex", scenario, dpr)
			await _truth("own", scenario, dpr)
			for kind in ["tex", "style", "glyphs", "card"]:
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var material := _projection_material(shader, m, card)
				var parent: RID = h.new_item(stage.canvas, 1)
				rs.canvas_item_set_material(parent, material)
				var child: RID = h.new_item(parent)
				rs.canvas_item_set_use_parent_material(child, true)
				var keep: ImageTexture = null
				var origin := Transform2D(0.0, Vector2(card.left, card.top))
				match kind:
					"tex":
						keep = _straight_chrome_texture(dpr)
						rs.canvas_item_add_texture_rect(child, Rect2(card.left, card.top, card.width, card.height), keep.get_rid())
					"style":
						rs.canvas_item_set_transform(child, origin)
						var box := StyleBoxFlat.new()
						box.bg_color = Color(30.0 / 255.0, 60.0 / 255.0, 200.0 / 255.0, 0.55)
						box.border_color = Color.WHITE
						box.set_border_width_all(1)
						box.set_corner_radius_all(16)
						box.anti_aliasing = true
						box.draw(child, Rect2(Vector2.ZERO, card_size))
					"glyphs":
						rs.canvas_item_set_transform(child, origin)
						h.font("Arial Bold").draw_string(child, Vector2(21, 47), "Perspective", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color.WHITE)
						h.font("Arial").draw_string(child, Vector2(21, 76), "A 320 by 200 card: a one pixel border,", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
						h.font("Arial").draw_string(child, Vector2(21, 96), "rounded corners, text and a translucent fill.", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
					"card":
						rs.canvas_item_set_transform(child, origin)
						h.draw_card(child, card_size)
				await h.capture(stage, "%s/%s/alt-vertex-%s-%s-dpr%d.png" % [h.out_dir, h.tag, kind, scenario.id, dpr])
				rs.free_rid(material)
				h.free_tracked()
				h.free_stage(stage)
	rs.free_rid(shader)
	_result("alt_vertex", { "done": true })

# An item whose unprojected rectangle is off screen and whose projection is on screen: drawn or culled?
func alt_cull() -> void:
	var css_size := Vector2(640, 400)
	var card_size := Vector2(320, 200)
	var shader := rs.shader_create()
	rs.shader_set_code(shader, VERTEX_SHADER)
	var scenario := { "perspective": 800, "transform": [["translateZ", -7200]] }
	var card := { "left": -1000.0, "top": 100.0, "width": 320.0, "height": 200.0 }
	var m: Array = Comp.scenario_matrix(scenario, card, [640, 400])
	var projected := Comp.visible_polygon(m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)), 0.0)
	var bounds := Rect2(projected[0], Vector2.ZERO)
	for point in projected:
		bounds = bounds.expand(point)
	var out := {}
	for variant in ["default", "custom_rect"]:
		var stage = h.make_stage(css_size, 1.0)
		var material := _projection_material(shader, m, card)
		var parent: RID = h.new_item(stage.canvas)
		rs.canvas_item_set_material(parent, material)
		var child: RID = h.new_item(parent)
		rs.canvas_item_set_use_parent_material(child, true)
		rs.canvas_item_add_rect(child, Rect2(card.left, card.top, card.width, card.height), Color.RED)
		if variant == "custom_rect":
			rs.canvas_item_set_custom_rect(child, true, bounds)
		var image: Image = await h.capture(stage, "%s/%s/alt-cull-%s.png" % [h.out_dir, h.tag, variant])
		var painted := 0
		for y in image.get_height():
			for x in image.get_width():
				if image.get_pixel(x, y).r > 0.5:
					painted += 1
		out[variant] = { "red_pixels": painted, "expected_pixels": roundi(bounds.get_area()) }
		rs.free_rid(material)
		h.free_tracked()
		h.free_stage(stage)
	rs.free_rid(shader)
	_result("alt_cull", out)

# A clipping ancestor whose rectangle is the card's own (overflow: hidden), the card projected by the vertex shader.
func alt_clip() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card: Dictionary = h.spec.card
	var shader := rs.shader_create()
	rs.shader_set_code(shader, VERTEX_SHADER)
	var out := {}
	for scenario in _scenarios("p35,steep,tz"):
		var m: Array = Comp.scenario_matrix(scenario, card, viewport)
		var counts := {}
		for variant in ["free", "clipped"]:
			var stage = h.make_stage(css_size, 1.0)
			var material := _projection_material(shader, m, card)
			var ancestor: RID = h.new_item(stage.canvas)
			if variant == "clipped":
				rs.canvas_item_set_clip(ancestor, true)
				rs.canvas_item_set_custom_rect(ancestor, true, Rect2(card.left, card.top, card.width, card.height))
			var parent: RID = h.new_item(ancestor)
			rs.canvas_item_set_material(parent, material)
			var child: RID = h.new_item(parent)
			rs.canvas_item_set_use_parent_material(child, true)
			rs.canvas_item_add_rect(child, Rect2(card.left, card.top, card.width, card.height), Color.RED)
			var image: Image = await h.capture(stage, "%s/%s/alt-clip-%s-%s.png" % [h.out_dir, h.tag, variant, scenario.id])
			var painted := 0
			for y in image.get_height():
				for x in image.get_width():
					if image.get_pixel(x, y).r > 0.5:
						painted += 1
			counts[variant] = painted
			rs.free_rid(material)
			h.free_tracked()
			h.free_stage(stage)
		out[scenario.id] = { "projected_card_pixels": counts.free, "pixels_left_after_the_ancestors_clip": counts.clipped, "lost_fraction": 1.0 - float(counts.clipped) / maxf(counts.free, 1.0) }
	rs.free_rid(shader)
	_result("alt_clip", out)

# ---- (c) subdivided mesh quads ----------------------------------------------------------------------------------

# Chrome's raster of the card as a grid of n x n quads (two triangles each) with CPU-projected vertices and a linear UV
# inside each triangle, no vertex shader and no layer. Also the worst UV error in screen pixels, from the maths.
func alt_mesh() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card: Dictionary = h.spec.card
	var card_size := Vector2(card.width, card.height)
	var report := {}
	for dpr in [1, 2]:
		for scenario in _scenarios("p35,steep,tz"):
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			await _truth("tex", scenario, dpr)
			for n_cells in [1, 2, 4, 8, 16, 32, 64]:
				var n: int = n_cells
				var points := PackedVector2Array()
				var uvs := PackedVector2Array()
				var colours := PackedColorArray()
				for j in n + 1:
					for i in n + 1:
						var u: float = card.width * float(i) / n
						var v: float = card.height * float(j) / n
						var p: Vector3 = Comp.project(m, u, v)
						points.append(Vector2(p.x, p.y))
						uvs.append(Vector2(float(i) / n, float(j) / n))
						colours.append(Color.WHITE)
				var indices := PackedInt32Array()
				for j in n:
					for i in n:
						var a: int = j * (n + 1) + i
						indices.append_array([a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1])
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var keep: ImageTexture = _straight_chrome_texture(dpr)
				var item: RID = h.new_item(stage.canvas, 1)
				rs.canvas_item_add_triangle_array(item, indices, points, colours, uvs, PackedInt32Array(), PackedFloat32Array(), keep.get_rid())
				await h.capture(stage, "%s/%s/alt-mesh%d-%s-dpr%d.png" % [h.out_dir, h.tag, n, scenario.id, dpr])
				h.free_tracked()
				h.free_stage(stage)
				# The worst error of the affine UV across a cell, in screen pixels: sample each cell's interior.
				var worst := 0.0
				for j in n:
					for i in n:
						for sample in [Vector2(0.5, 0.5), Vector2(0.25, 0.75), Vector2(0.75, 0.25), Vector2(0.5, 0.1), Vector2(0.1, 0.5)]:
							var fu: float = (i + sample.x) / n
							var fv: float = (j + sample.y) / n
							var exact: Vector3 = Comp.project(m, card.width * fu, card.height * fv)
							# What the affine interpolation across the cell's triangle puts at this UV: the triangle holding the sample.
							var p00: Vector3 = Comp.project(m, card.width * float(i) / n, card.height * float(j) / n)
							var p10: Vector3 = Comp.project(m, card.width * float(i + 1) / n, card.height * float(j) / n)
							var p01: Vector3 = Comp.project(m, card.width * float(i) / n, card.height * float(j + 1) / n)
							var p11: Vector3 = Comp.project(m, card.width * float(i + 1) / n, card.height * float(j + 1) / n)
							var affine: Vector2
							if sample.x + sample.y <= 1.0:
								affine = Vector2(p00.x, p00.y) + (Vector2(p10.x, p10.y) - Vector2(p00.x, p00.y)) * sample.x + (Vector2(p01.x, p01.y) - Vector2(p00.x, p00.y)) * sample.y
							else:
								affine = Vector2(p11.x, p11.y) + (Vector2(p01.x, p01.y) - Vector2(p11.x, p11.y)) * (1.0 - sample.x) + (Vector2(p10.x, p10.y) - Vector2(p11.x, p11.y)) * (1.0 - sample.y)
							worst = maxf(worst, Vector2(exact.x, exact.y).distance_to(affine))
				report["%s-dpr%d-n%d" % [scenario.id, dpr, n]] = { "vertices": (n + 1) * (n + 1), "triangles": 2 * n * n, "worst_uv_error_css_px": worst }
	_result("alt_mesh", report)
