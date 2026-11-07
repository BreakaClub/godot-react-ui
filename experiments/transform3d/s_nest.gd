extends RefCounted
# Item 3 of the brief: nesting and order. Scenarios called by spike.gd (scenario=nest_order, nest_clip, nest_filter_in_layer,
# nest_layer_in_filter, nest_under_clip). Each writes <out>/<tag>/<name>.json and a PNG or two, and prints one RESULT line.

const Comp := preload("res://compositor.gd")

var h   # the spike.gd SceneTree, for its helpers
var comp
var rs := RenderingServer

func _init(driver) -> void:
	h = driver
	comp = driver.comp

func _result(name: String, data: Dictionary) -> void:
	var file := FileAccess.open("%s/%s/%s.json" % [h.out_dir, h.tag, name], FileAccess.WRITE)
	file.store_string(JSON.stringify(data, " "))
	file.close()
	print("RESULT ", name, " ", JSON.stringify(data))

const GRAYSCALE := """
shader_type canvas_item;
render_mode unshaded;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear, repeat_disable;
uniform bool straight = false;
void fragment() {
	vec4 c = texture(screen_tex, SCREEN_UV);
	vec3 rgb = straight && c.a > 0.0 ? c.rgb / c.a : c.rgb;
	float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
	COLOR = vec4(vec3(l), c.a);
}
"""

# The layer in this experiment: the card of the accuracy experiment at the raster scale the fitted rule picks.
func _card_layer(stage, m: Array, dpr: float, group_wrapper := false):
	var card_size := Vector2(320, 200)
	var r: float = h.raster_scale(m, card_size, dpr)
	var layer = comp.make_layer(card_size, r, stage.viewport)
	return layer

func _identity_quad(parent_canvas: RID, texture: RID, size: Vector2) -> Array:
	var material: RID = comp.make_material(texture, 1)
	var m: Array = Comp.identity()
	comp.set_material_matrix(material, m, size)
	var item: RID = h.new_item(parent_canvas, 0)
	comp.set_quad(item, material, m, size, Rect2(Vector2(-8, -8), size + Vector2(16, 16)), 0.0)
	return [item, material]

# ---- order ------------------------------------------------------------------------------------------------------

# Stage <- L1 <- L2, every one redrawn every frame, L2's content a counter. After the frame's draw, which counter does the
# stage show? 0 is the same frame, 1 a frame late. Three ways to register the viewports.
func nest_order() -> void:
	var size := Vector2(64, 64)
	var results := {}
	for variant in ["parented-outer-first", "unparented-inner-first", "unparented-outer-first"]:
		var stage
		var l1
		var l2
		var parented: bool = variant.begins_with("parented")
		if variant == "unparented-inner-first":
			l2 = comp.make_layer(size, 1.0, RID(), RenderingServer.VIEWPORT_UPDATE_ALWAYS)
			l1 = comp.make_layer(size, 1.0, RID(), RenderingServer.VIEWPORT_UPDATE_ALWAYS)
			stage = h.make_stage(size, 1.0)
		else:
			stage = h.make_stage(size, 1.0)
			l1 = comp.make_layer(size, 1.0, stage.viewport if parented else RID(), RenderingServer.VIEWPORT_UPDATE_ALWAYS)
			l2 = comp.make_layer(size, 1.0, l1.viewport if parented else RID(), RenderingServer.VIEWPORT_UPDATE_ALWAYS)
		var content: RID = h.new_item(l2.canvas)
		var q1 := _identity_quad(l1.canvas, l2.texture, size)
		var q2 := _identity_quad(stage.canvas, l1.texture, size)
		var latencies := []
		for n in range(1, 13):
			rs.canvas_item_clear(content)
			rs.canvas_item_add_rect(content, Rect2(Vector2.ZERO, size), Color(n * 16.0 / 255.0, 0.5, 0.25))
			await rs.frame_post_draw
			var image: Image = rs.texture_2d_get(rs.viewport_get_texture(stage.viewport))
			var shown := int(roundf(image.get_pixel(32, 32).r * 255.0 / 16.0))
			latencies.append(n - shown)
		results[variant] = latencies
		for pair in [q1, q2]:
			rs.free_rid(pair[1])
		h.free_tracked()
		comp.free_layer(l1)
		comp.free_layer(l2)
		h.free_stage(stage)
	_result("nest_order", results)

# ---- a clipped scroll container inside a layer --------------------------------------------------------------------

func nest_clip() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(320, 200)
	var scenario := { "id": "x", "perspective": 800, "transform": [["rotateY", 35]] }
	var m: Array = Comp.scenario_matrix(scenario, h.spec.card, viewport)
	var dpr := 2.0
	var stage = h.make_stage(css_size, dpr)
	h.draw_background(stage.canvas, css_size)
	var r: float = h.raster_scale(m, card_size, dpr)
	var layer = comp.make_layer(card_size, r, stage.viewport, RenderingServer.VIEWPORT_UPDATE_ALWAYS)
	var clip_rect := Rect2(20, 20, 200, 100)
	var container: RID = h.new_item(layer.canvas)
	rs.canvas_item_set_clip(container, true)
	rs.canvas_item_set_custom_rect(container, true, clip_rect)
	var scrolled: RID = h.new_item(container)
	rs.canvas_item_set_transform(scrolled, Transform2D(0.0, Vector2(0, -35)))
	for i in 24:
		rs.canvas_item_add_rect(scrolled, Rect2(0, i * 20, 300, 10), Color.html("#ffd24a") if i % 2 == 0 else Color.html("#e04060"))
	var material: RID = comp.make_material(layer.texture, 1)
	comp.set_material_matrix(material, m, card_size)
	var quad: RID = h.new_item(stage.canvas, 1)
	comp.set_quad(quad, material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
	await h.capture(stage, "%s/%s/nest-clip.png" % [h.out_dir, h.tag])
	var texture: Image = rs.texture_2d_get(layer.texture)
	texture.convert(Image.FORMAT_RGBA8)
	var outside := 0
	var inside_empty := 0
	var inside := 0
	var pixel_clip := Rect2i(Vector2i(clip_rect.position * r), Vector2i(clip_rect.size * r))
	for y in texture.get_height():
		for x in texture.get_width():
			var covered: bool = texture.get_pixel(x, y).a > 0.004
			if pixel_clip.has_point(Vector2i(x, y)):
				inside += 1
				if not covered:
					inside_empty += 1
			elif covered:
				outside += 1
	_result("nest_clip", { "raster": r, "layer_px": [texture.get_width(), texture.get_height()], "covered_outside_clip": outside, "empty_inside_clip": inside_empty, "inside_clip_px": inside })
	rs.free_rid(material)
	h.free_tracked()
	comp.free_layer(layer)
	h.free_stage(stage)

# ---- a filter (canvas group with a shader) inside a layer ---------------------------------------------------------

# The card's translucent fill inside a canvas group inside the layer: what the layer's texture holds, against what the
# group's shader should produce (grayscale of the fill, its alpha kept).
func nest_filter_in_layer() -> void:
	var out := {}
	var size := Vector2(64, 64)
	for straight in [false, true]:
		var stage = h.make_stage(size, 1.0)
		var layer = comp.make_layer(size, 1.0, stage.viewport, RenderingServer.VIEWPORT_UPDATE_ALWAYS)
		var shader := rs.shader_create()
		rs.shader_set_code(shader, GRAYSCALE)
		var material := rs.material_create()
		rs.material_set_shader(material, shader)
		rs.material_set_param(material, "straight", straight)
		var wrapper: RID = h.new_item(layer.canvas)
		rs.canvas_item_set_canvas_group_mode(wrapper, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, false, 0.0, false)
		rs.canvas_item_add_rect(wrapper, Rect2(0, 0, 64, 64), Color.WHITE)
		rs.canvas_item_set_material(wrapper, material)
		var content: RID = h.new_item(wrapper)
		rs.canvas_item_add_rect(content, Rect2(8, 8, 48, 24), Color(30.0 / 255.0, 60.0 / 255.0, 200.0 / 255.0, 0.55))
		rs.canvas_item_add_rect(content, Rect2(8, 40, 48, 16), Color(30.0 / 255.0, 60.0 / 255.0, 200.0 / 255.0, 1.0))
		await rs.frame_post_draw
		await rs.frame_post_draw
		var image: Image = rs.texture_2d_get(layer.texture)
		image.convert(Image.FORMAT_RGBA8)
		var translucent := image.get_pixel(32, 20)
		var opaque := image.get_pixel(32, 48)
		# Expected for the 55 % fill: lum(30, 60, 200) = 63.7, premultiplied by 0.55 = 35, alpha 140.
		out["straight_%s" % straight] = { "translucent_rgba": [roundi(translucent.r * 255), roundi(translucent.g * 255), roundi(translucent.b * 255), roundi(translucent.a * 255)], "opaque_rgba": [roundi(opaque.r * 255), roundi(opaque.g * 255), roundi(opaque.b * 255), roundi(opaque.a * 255)] }
		h.free_tracked()
		rs.free_rid(material)
		rs.free_rid(shader)
		comp.free_layer(layer)
		h.free_stage(stage)
	out["expected"] = { "translucent_rgba": [35, 35, 35, 140], "opaque_rgba": [64, 64, 64, 255] }
	_result("nest_filter_in_layer", out)

# ---- a layer inside a filter group --------------------------------------------------------------------------------

# The p35 card's quad inside a grayscale group. The stage is transparent (an RGBA8 back buffer for the group) or opaque
# (RGB10_A2: two bits of alpha, texture_storage.cpp:2567). The group's output is compared with the grayscale of the plain
# composite computed on the CPU, over the page background in the opaque case.
func nest_layer_in_filter() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(320, 200)
	var scenario: Dictionary = h.spec.scenarios[0]
	var m: Array = Comp.scenario_matrix(scenario, h.spec.card, viewport)
	var images := {}
	for variant in ["plain-transparent", "grouped-transparent", "grouped-opaque"]:
		var transparent: bool = variant.ends_with("transparent")
		var stage = h.make_stage(css_size, 1.0, transparent)
		if not transparent:
			h.draw_background(stage.canvas, css_size)
		var layer = comp.make_layer(card_size, 1.0, stage.viewport)
		h.draw_card(h.new_item(layer.canvas), card_size)
		var material: RID = comp.make_material(layer.texture, 1)
		comp.set_material_matrix(material, m, card_size)
		var shader := RID()
		var group_material := RID()
		var parent: RID = stage.canvas
		if variant.begins_with("grouped"):
			shader = rs.shader_create()
			rs.shader_set_code(shader, GRAYSCALE)
			group_material = rs.material_create()
			rs.material_set_shader(group_material, shader)
			rs.material_set_param(group_material, "straight", true)
			var wrapper: RID = h.new_item(stage.canvas, 1)
			rs.canvas_item_set_canvas_group_mode(wrapper, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, false, 0.0, false)
			rs.canvas_item_add_rect(wrapper, Rect2(Vector2.ZERO, css_size), Color.WHITE)
			rs.canvas_item_set_material(wrapper, group_material)
			parent = wrapper
		var quad: RID = h.new_item(parent, 1)
		comp.set_quad(quad, material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
		images[variant] = await h.capture(stage, "%s/%s/nest-layer-in-filter-%s.png" % [h.out_dir, h.tag, variant])
		rs.free_rid(material)
		if shader.is_valid():
			rs.free_rid(group_material)
			rs.free_rid(shader)
		h.free_tracked()
		comp.free_layer(layer)
		h.free_stage(stage)
	var plain: Image = images["plain-transparent"]
	var out := {}
	for variant in ["grouped-transparent", "grouped-opaque"]:
		var grouped: Image = images[variant]
		var worst := 0
		var sum := 0.0
		var count := 0
		var alpha_worst := 0
		var levels := {}
		for y in plain.get_height():
			for x in plain.get_width():
				var p := plain.get_pixel(x, y)
				if p.a <= 0.0:
					continue
				var g := grouped.get_pixel(x, y)
				var straight := Vector3(p.r, p.g, p.b) / p.a
				var grey := straight.dot(Vector3(0.2126, 0.7152, 0.0722))
				if variant == "grouped-transparent":
					alpha_worst = maxi(alpha_worst, absi(roundi(p.a * 255) - roundi(g.a * 255)))
					levels[roundi(g.a * 255)] = true
					for expected_pair in [[grey * p.a, g.r], [grey * p.a, g.g], [grey * p.a, g.b]]:
						var d := absi(roundi(expected_pair[0] * 255) - roundi(expected_pair[1] * 255))
						worst = maxi(worst, d)
						sum += d
					count += 3
				else:
					var bare := Color.html("#2f5d8a") if x < css_size.x / 2.0 else Color.html("#c9a24a")
					if y >= 190 and y < 210:
						bare = Color.html("#3b8f5a")
					var expected := Vector3(grey * p.a, grey * p.a, grey * p.a) + Vector3(bare.r, bare.g, bare.b) * (1.0 - p.a)
					for pair in [[expected.x, g.r], [expected.y, g.g], [expected.z, g.b]]:
						var d := absi(roundi(pair[0] * 255) - roundi(pair[1] * 255))
						worst = maxi(worst, d)
						sum += d
					count += 3
		out[variant] = { "pixels": count / 3, "channel_diff_mean": sum / maxi(count, 1), "channel_diff_max": worst, "alpha_diff_max": alpha_worst, "distinct_alpha_levels": levels.size() }
	_result("nest_layer_in_filter", out)

# ---- a layer under a clipped ancestor -----------------------------------------------------------------------------

func nest_under_clip() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(320, 200)
	var scenario: Dictionary = h.spec.scenarios[0]
	var m: Array = Comp.scenario_matrix(scenario, h.spec.card, viewport)
	var clip_rect := Rect2(200, 110, 160, 130)
	var images := {}
	for variant in ["free", "clipped"]:
		var stage = h.make_stage(css_size, 1.0)
		h.draw_background(stage.canvas, css_size)
		var layer = comp.make_layer(card_size, 1.0, stage.viewport)
		h.draw_card(h.new_item(layer.canvas), card_size)
		var material: RID = comp.make_material(layer.texture, 1)
		comp.set_material_matrix(material, m, card_size)
		var parent: RID = stage.canvas
		if variant == "clipped":
			var ancestor: RID = h.new_item(stage.canvas, 1)
			rs.canvas_item_set_clip(ancestor, true)
			rs.canvas_item_set_custom_rect(ancestor, true, clip_rect)
			parent = ancestor
		var quad: RID = h.new_item(parent, 1)
		comp.set_quad(quad, material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
		images[variant] = await h.capture(stage, "%s/%s/nest-under-clip-%s.png" % [h.out_dir, h.tag, variant])
		rs.free_rid(material)
		h.free_tracked()
		comp.free_layer(layer)
		h.free_stage(stage)
	var free_image: Image = images.free
	var clipped_image: Image = images.clipped
	var inside_diff := 0
	var outside_card_pixels := 0
	var outside_total := 0
	var background := Image.create(free_image.get_width(), free_image.get_height(), false, Image.FORMAT_RGBA8)
	for y in free_image.get_height():
		for x in free_image.get_width():
			var c := clipped_image.get_pixel(x, y)
			var f := free_image.get_pixel(x, y)
			if clip_rect.has_point(Vector2(x + 0.5, y + 0.5)):
				var d := maxi(maxi(absi(roundi(c.r * 255) - roundi(f.r * 255)), absi(roundi(c.g * 255) - roundi(f.g * 255))), absi(roundi(c.b * 255) - roundi(f.b * 255)))
				inside_diff = maxi(inside_diff, d)
			else:
				outside_total += 1
				# Outside the clip the clipped image must be the bare background: compare with the corner pixel of the same half.
				var bare := Color.html("#2f5d8a") if x < css_size.x / 2.0 else Color.html("#c9a24a")
				if y >= 190 and y < 210:
					bare = Color.html("#3b8f5a")
				if absi(roundi(c.r * 255) - roundi(bare.r * 255)) > 1 or absi(roundi(c.g * 255) - roundi(bare.g * 255)) > 1 or absi(roundi(c.b * 255) - roundi(bare.b * 255)) > 1:
					outside_card_pixels += 1
	_result("nest_under_clip", { "max_diff_inside_clip_vs_unclipped": inside_diff, "pixels_outside_clip_that_are_not_background": outside_card_pixels, "pixels_outside_clip": outside_total })

# ---- a layer inside a layer, real 3D in both ----------------------------------------------------------------------

func _face_content(item: RID, size: Vector2, colour: Color) -> void:
	rs.canvas_item_add_rect(item, Rect2(Vector2.ZERO, size), colour)
	for rect in [Rect2(0, 0, size.x, 2), Rect2(0, size.y - 2, size.x, 2), Rect2(0, 0, 2, size.y), Rect2(size.x - 2, 0, 2, size.y), Rect2(2, 2, 40, 40)]:
		rs.canvas_item_add_rect(item, rect, Color.WHITE)

# The outer card under perspective(800px) rotateY(30deg) and, flattened into its plane, an inner card under
# perspective(300px) rotateX(35deg). The inner layer's raster scale is the outer's times the inner's own magnification.
func nest_both() -> void:
	var scenes: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://scenes.json"))
	var nested: Dictionary = scenes.nested
	var viewport: Array = scenes.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var report := {}
	for dpr in [1, 2]:
		var stage = h.make_stage(css_size, dpr)
		h.draw_background(stage.canvas, css_size)
		var ob: Array = nested.outer.box
		var ib: Array = nested.inner.box
		var outer_size := Vector2(ob[2], ob[3])
		var inner_size := Vector2(ib[2], ib[3])
		var m_outer: Array = Comp.box_matrix(nested.outer.transform, Rect2(ob[0], ob[1], ob[2], ob[3]), 0.0, Vector2(0.5, 0.5), css_size)
		# Absolutely positioned children are placed from the padding box, inside the 2 px border.
		var m_inner: Array = Comp.box_matrix(nested.inner.transform, Rect2(ib[0] + 2.0, ib[1] + 2.0, ib[2], ib[3]), 0.0, Vector2(0.5, 0.5), outer_size)
		var r_outer: float = h.raster_scale(m_outer, outer_size, dpr)
		var r_inner: float = clampf(roundf(r_outer * Comp.max_magnification(m_inner, inner_size)), 1.0, 8.0)
		var outer = comp.make_layer(outer_size, r_outer, stage.viewport)
		var inner = comp.make_layer(inner_size, r_inner, outer.viewport)
		var c: Array = nested.outer.colour
		var d: Array = nested.inner.colour
		var outer_content: RID = h.new_item(outer.canvas)
		_face_content(outer_content, outer_size, Color(c[0] / 255.0, c[1] / 255.0, c[2] / 255.0, nested.alpha))
		_face_content(h.new_item(inner.canvas), inner_size, Color(d[0] / 255.0, d[1] / 255.0, d[2] / 255.0, nested.alpha))
		var inner_material: RID = comp.make_material(inner.texture, 1)
		comp.set_material_matrix(inner_material, m_inner, inner_size)
		var inner_quad: RID = h.new_item(outer.canvas, 1)
		comp.set_quad(inner_quad, inner_material, m_inner, inner_size, Rect2(Vector2(-64, -64), outer_size + Vector2(128, 128)))
		var outer_material: RID = comp.make_material(outer.texture, 1)
		comp.set_material_matrix(outer_material, m_outer, outer_size)
		var outer_quad: RID = h.new_item(stage.canvas, 1)
		comp.set_quad(outer_quad, outer_material, m_outer, outer_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
		await h.capture(stage, "%s/%s/scene-nested-nested-dpr%d.png" % [h.out_dir, h.tag, dpr])
		report["dpr%d" % dpr] = { "outer_raster": r_outer, "inner_raster": r_inner }
		rs.free_rid(inner_material)
		rs.free_rid(outer_material)
		h.free_tracked()
		comp.free_layer(inner)
		comp.free_layer(outer)
		h.free_stage(stage)
	_result("nest_both", report)
