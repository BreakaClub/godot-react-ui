extends RefCounted
# Item 7 (continued): the truth images for the vertex() experiment's parts (alt2_truth_parts), and (d) a real quad per element in a
# 3D viewport with a camera (alt2_node3d, alt2_node3d_cost). The 3D scene is built with raw RenderingServer calls: a scenario,
# a camera with an off-centre frustum reproducing CSS perspective (the eye at distance d from the z = 0 plane, over the
# perspective-origin), one mesh instance per face with the face's layer as its albedo.

const Comp := preload("res://compositor.gd")

const NEAR := 10.0
const FAR_MARGIN := 4000.0

var h
var comp
var rs := RenderingServer
var scenes: Dictionary

func _init(driver) -> void:
	h = driver
	comp = driver.comp
	scenes = JSON.parse_string(FileAccess.get_file_as_string("res://scenes.json"))

func _result(name: String, data) -> void:
	var file := FileAccess.open("%s/%s/%s.json" % [h.out_dir, h.tag, name], FileAccess.WRITE)
	file.store_string(JSON.stringify(data, " "))
	file.close()
	print("RESULT ", name, " ", JSON.stringify(data))

# ---- the vertex experiment's reference for its style-only and text-only items ------------------------------------

func alt2_truth_parts() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(h.spec.card.width, h.spec.card.height)
	var ids: PackedStringArray = String(h.args.get("ids", "p35,steep,x25,combo,tz")).split(",")
	for dpr in [1, 2]:
		for scenario in h.spec.scenarios:
			if not ids.has(scenario.id):
				continue
			var m: Array = Comp.scenario_matrix(scenario, h.spec.card, viewport)
			for kind in ["style", "glyphs"]:
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var layer = comp.make_layer(card_size, dpr, stage.viewport)
				var item: RID = h.new_item(layer.canvas)
				if kind == "style":
					h.draw_card(item, card_size, false)
				else:
					h.font("Arial Bold").draw_string(item, Vector2(21, 47), "Perspective", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color.WHITE)
					h.font("Arial").draw_string(item, Vector2(21, 76), "A 320 by 200 card: a one pixel border,", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
					h.font("Arial").draw_string(item, Vector2(21, 96), "rounded corners, text and a translucent fill.", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
				var material: RID = comp.make_material(layer.texture, 1)
				comp.set_material_matrix(material, m, card_size)
				comp.set_quad(h.new_item(stage.canvas, 1), material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
				await h.capture(stage, "%s/%s/alt-truth-%s-%s-dpr%d.png" % [h.out_dir, h.tag, kind, scenario.id, dpr])
				rs.free_rid(material)
				h.free_tracked()
				comp.free_layer(layer)
				h.free_stage(stage)
	_result("alt2_truth_parts", { "done": true })

# ---- (d) a real 3D quad per element -----------------------------------------------------------------------------

# KNOWN DEFECT, not fixed (the coordinator stopped all Godot launches before it could be re-run): on Mobile and Forward+ the 3D
# pipeline reads ALBEDO as linear and tonemaps the viewport to sRGB, so the faces came out washed out (mean error 57 to 77 against
# Chrome; the geometry is right). On Compatibility the same shader matches Chrome (cube 1.84 mean). The shader needs an sRGB to
# linear conversion of the premultiplied colour on the RD renderers; the costs measured with it are unaffected.
const QUAD_SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled, blend_premul_alpha, depth_draw_opaque;
uniform sampler2D tex : filter_linear, repeat_disable;
void fragment() {
	vec4 c = texture(tex, UV);
	ALBEDO = c.rgb;
	ALPHA = c.a;
}
"""

# Draws the 3D viewport's texture over the stage as premultiplied colour (or, in the control, as straight colour).
const COMPOSITE_SHADER := """
shader_type canvas_item;
render_mode blend_premul_alpha;
uniform bool straight = false;
void fragment() {
	vec4 c = texture(TEXTURE, UV);
	COLOR = straight ? vec4(c.rgb * c.a, c.a) : c;
}
"""

class World:
	var scenario: RID
	var camera: RID
	var viewport: RID
	var instances: Array[RID] = []
	var meshes: Array[RID] = []
	var materials: Array[RID] = []

# The parts of the face matrices that are not the container's perspective: world = flip_y * T(-origin) * A.
func _instance_transform(affine: Array, origin: Vector2) -> Transform3D:
	var b: Array = Comp.mul([[1.0, 0.0, 0.0, 0.0], [0.0, -1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]], Comp.mul(Comp.translate(-origin.x, -origin.y, 0.0), affine))
	return Transform3D(Basis(Vector3(b[0][0], b[1][0], b[2][0]), Vector3(b[0][1], b[1][1], b[2][1]), Vector3(b[0][2], b[1][2], b[2][2])), Vector3(b[0][3], b[1][3], b[2][3]))

func _make_world(css_size: Vector2, dpr: float, perspective: float, origin: Vector2, msaa: int) -> World:
	var world := World.new()
	world.scenario = rs.scenario_create()
	world.camera = rs.camera_create()
	var scale := NEAR / perspective
	rs.camera_set_frustum(world.camera, css_size.y * scale, Vector2((css_size.x / 2.0 - origin.x) * scale, (origin.y - css_size.y / 2.0) * scale), NEAR, perspective + FAR_MARGIN)
	rs.camera_set_transform(world.camera, Transform3D(Basis(), Vector3(0.0, 0.0, perspective)))
	world.viewport = rs.viewport_create()
	rs.viewport_set_size(world.viewport, int(css_size.x * dpr), int(css_size.y * dpr))
	rs.viewport_set_scenario(world.viewport, world.scenario)
	rs.viewport_attach_camera(world.viewport, world.camera)
	rs.viewport_set_transparent_background(world.viewport, true)
	rs.viewport_set_msaa_3d(world.viewport, msaa)
	rs.viewport_set_update_mode(world.viewport, RenderingServer.VIEWPORT_UPDATE_ALWAYS)
	rs.viewport_set_active(world.viewport, true)
	return world

func _add_quad(world: World, size: Vector2, texture: RID, transform: Transform3D, shader: RID) -> void:
	var arrays := []
	arrays.resize(RenderingServer.ARRAY_MAX)
	arrays[RenderingServer.ARRAY_VERTEX] = PackedVector3Array([Vector3(0, 0, 0), Vector3(size.x, 0, 0), Vector3(size.x, size.y, 0), Vector3(0, size.y, 0)])
	arrays[RenderingServer.ARRAY_TEX_UV] = PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	arrays[RenderingServer.ARRAY_INDEX] = PackedInt32Array([0, 1, 2, 0, 2, 3])
	var mesh := rs.mesh_create()
	rs.mesh_add_surface_from_arrays(mesh, RenderingServer.PRIMITIVE_TRIANGLES, arrays)
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	rs.material_set_param(material, "tex", texture)
	var instance := rs.instance_create2(mesh, world.scenario)
	rs.instance_set_transform(instance, transform)
	rs.instance_set_surface_override_material(instance, 0, material)
	world.instances.append(instance)
	world.meshes.append(mesh)
	world.materials.append(material)

func _free_world(world: World) -> void:
	for rid in world.instances + world.meshes + world.materials:
		rs.free_rid(rid)
	rs.viewport_set_active(world.viewport, false)
	rs.free_rid(world.viewport)
	rs.free_rid(world.camera)
	rs.free_rid(world.scenario)

func _affine_of(face: Dictionary, scene: Dictionary) -> Array:
	var box: Array = scene.parent.box
	var origin := Vector2(0.5, 0.5)
	var parent_matrix: Array = Comp.box_matrix(scene.parent.transform, Rect2(box[0], box[1], box[2], box[3]), 0.0, origin, Vector2(640, 400))
	var face_matrix: Array = Comp.box_matrix(face.transform, Rect2(Vector2.ZERO, Vector2(scene.size[0], scene.size[1])), 0.0, origin, Vector2(640, 400))
	return Comp.mul(parent_matrix, face_matrix)

func alt2_node3d() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var shader := rs.shader_create()
	rs.shader_set_code(shader, QUAD_SHADER)
	var composite := rs.shader_create()
	rs.shader_set_code(composite, COMPOSITE_SHADER)
	var report := {}
	for dpr in [1, 2]:
		# The single card p35 (perspective(800px) rotateY(35deg) is perspective 800 about the card's centre, which is the viewport's), then the scenes.
		var jobs := []
		var p35: Dictionary = h.spec.scenarios[0]
		jobs.append({ "name": "p35", "perspective": 800.0, "faces": [{ "affine": Comp.box_matrix(p35.transform.slice(1), Rect2(h.spec.card.left, h.spec.card.top, h.spec.card.width, h.spec.card.height), 0.0, Vector2(0.5, 0.5), css_size), "size": Vector2(h.spec.card.width, h.spec.card.height), "colour": null }] })
		for name in ["cube", "cards"]:
			var scene: Dictionary = scenes[name]
			var faces := []
			for face in scene.faces:
				faces.append({ "affine": _affine_of(face, scene), "size": Vector2(scene.size[0], scene.size[1]), "colour": Color(face.colour[0] / 255.0, face.colour[1] / 255.0, face.colour[2] / 255.0, scene.alpha) })
			jobs.append({ "name": name, "perspective": float(scene.perspective), "faces": faces })
		for job in jobs:
			for msaa in [RenderingServer.VIEWPORT_MSAA_DISABLED, RenderingServer.VIEWPORT_MSAA_4X]:
				for straight in [false, true]:
					var stage = h.make_stage(css_size, dpr)
					h.draw_background(stage.canvas, css_size)
					var world := _make_world(css_size, dpr, job.perspective, css_size / 2.0, msaa)
					var layers := []
					for face in job.faces:
						var r: float = dpr
						var layer = comp.make_layer(face.size, r, world.viewport)
						layers.append(layer)
						var item: RID = h.new_item(layer.canvas)
						if face.colour == null:
							h.draw_card(item, face.size)
						else:
							rs.canvas_item_add_rect(item, Rect2(Vector2.ZERO, face.size), face.colour)
							for rect in [Rect2(0, 0, face.size.x, 2), Rect2(0, face.size.y - 2, face.size.x, 2), Rect2(0, 0, 2, face.size.y), Rect2(face.size.x - 2, 0, 2, face.size.y), Rect2(2, 2, 40, 40)]:
								rs.canvas_item_add_rect(item, rect, Color.WHITE)
						_add_quad(world, face.size, layer.texture, _instance_transform(face.affine, css_size / 2.0), shader)
					rs.viewport_set_parent_viewport(world.viewport, stage.viewport)
					var material := rs.material_create()
					rs.material_set_shader(material, composite)
					rs.material_set_param(material, "straight", straight)
					var quad: RID = h.new_item(stage.canvas, 1)
					rs.canvas_item_set_material(quad, material)
					rs.canvas_item_add_texture_rect(quad, Rect2(Vector2.ZERO, css_size), rs.viewport_get_texture(world.viewport))
					var mode := "n3d%s%s" % ["-msaa4" if msaa == RenderingServer.VIEWPORT_MSAA_4X else "", "-straight" if straight else ""]
					var path := "%s/%s/%s-%s-dpr%d.png" % [h.out_dir, h.tag, mode, job.name, dpr] if job.name == "p35" else "%s/%s/scene-%s-%s-dpr%d.png" % [h.out_dir, h.tag, job.name, mode, dpr]
					await h.capture(stage, path)
					rs.free_rid(material)
					h.free_tracked()
					for layer in layers:
						comp.free_layer(layer)
					_free_world(world)
					h.free_stage(stage)
	rs.free_rid(shader)
	rs.free_rid(composite)
	_result("alt2_node3d", report)

# Cost of N faces in the 3D viewport against the compositor's static case (s_cost.gd): the layers are rendered once, the
# transforms change every frame.
func alt2_node3d_cost() -> void:
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	var css_size := Vector2(1280, 800)
	var dpr := float(h.args.get("dpr", "2"))
	var shader := rs.shader_create()
	rs.shader_set_code(shader, QUAD_SHADER)
	var composite := rs.shader_create()
	rs.shader_set_code(composite, COMPOSITE_SHADER)
	var results := []
	for msaa in [RenderingServer.VIEWPORT_MSAA_DISABLED, RenderingServer.VIEWPORT_MSAA_4X]:
		for count in [1, 10, 50]:
			var stage = h.make_stage(css_size, dpr)
			rs.viewport_set_measure_render_time(stage.viewport, true)
			var world := _make_world(css_size, dpr, 800.0, css_size / 2.0, msaa)
			rs.viewport_set_measure_render_time(world.viewport, true)
			rs.viewport_set_parent_viewport(world.viewport, stage.viewport)
			var layers := []
			var card_size := Vector2(320, 200)
			for i in count:
				var layer = comp.make_layer(card_size, dpr, world.viewport, RenderingServer.VIEWPORT_UPDATE_ONCE)
				rs.viewport_set_measure_render_time(layer.viewport, true)
				layers.append(layer)
				h.draw_card(h.new_item(layer.canvas), card_size)
				_add_quad(world, card_size, layer.texture, Transform3D(), shader)
			var material := rs.material_create()
			rs.material_set_shader(material, composite)
			var quad: RID = h.new_item(stage.canvas, 1)
			rs.canvas_item_set_material(quad, material)
			rs.canvas_item_add_texture_rect(quad, Rect2(Vector2.ZERO, css_size), rs.viewport_get_texture(world.viewport))
			var wall := []
			var gpu := []
			var cpu := []
			var script := []
			var previous := Time.get_ticks_usec()
			var started := previous
			for frame in 180:
				var script_start := Time.get_ticks_usec()
				var seconds := (Time.get_ticks_usec() - started) / 1e6
				for i in count:
					var position := Vector2(40.0 + (i % 4) * 300.0, 30.0 + ((i / 4) % 4) * 190.0)
					var list := [["rotateY", fmod(seconds * 60.0 + i * 7.0, 360.0)]]
					var affine: Array = Comp.box_matrix(list, Rect2(position, card_size), 0.0, Vector2(0.5, 0.5), css_size)
					rs.instance_set_transform(world.instances[i], _instance_transform(affine, css_size / 2.0))
				var script_us := Time.get_ticks_usec() - script_start
				await rs.frame_post_draw
				var now := Time.get_ticks_usec()
				if frame >= 30:
					wall.append((now - previous) / 1000.0)
					script.append(script_us / 1000.0)
					var gpu_ms: float = rs.viewport_get_measured_render_time_gpu(stage.viewport) + rs.viewport_get_measured_render_time_gpu(world.viewport)
					var cpu_ms: float = rs.viewport_get_measured_render_time_cpu(stage.viewport) + rs.viewport_get_measured_render_time_cpu(world.viewport)
					gpu.append(gpu_ms)
					cpu.append(cpu_ms)
				previous = now
			wall.sort()
			gpu.sort()
			cpu.sort()
			script.sort()
			results.append({ "msaa": "4x" if msaa == RenderingServer.VIEWPORT_MSAA_4X else "off", "cards": count, "wall_ms_median": wall[wall.size() / 2], "gpu_ms_median": gpu[gpu.size() / 2], "cpu_ms_median": cpu[cpu.size() / 2], "script_ms_median": script[script.size() / 2] })
			rs.free_rid(material)
			h.free_tracked()
			for layer in layers:
				comp.free_layer(layer)
			_free_world(world)
			h.free_stage(stage)
			await rs.frame_post_draw
	rs.free_rid(shader)
	rs.free_rid(composite)
	var file := FileAccess.open("%s/%s/cost-node3d.json" % [h.out_dir, h.tag], FileAccess.WRITE)
	file.store_string(JSON.stringify(results, " "))
	file.close()
	for row in results:
		print("RESULT cost3d ", JSON.stringify(row))

# ---- how the shader parameters reach a layer: a material per layer or one shared material ----------------------------

# One shared material: the layer is the polygon's texture (TEXTURE) and the homography is the polygon's own vertex data,
# (s / W, t / W, 1 / W) at each vertex, which the rasteriser interpolates affinely in screen space exactly: UV carries the
# first two, COLOR.r the third. The engine multiplies COLOR by the item's modulate before the vertex shader sees it.
const SHARED_SHADER := """
shader_type canvas_item;
render_mode blend_premul_alpha;
varying vec3 a;
void vertex() {
	a = vec3(UV, COLOR.r);
}
void fragment() {
	if (a.z <= 0.0) {
		discard;
	}
	vec4 e = vec4(a.x, a.z - a.x, a.y, a.z - a.y);
	vec4 gx = dFdx(e);
	vec4 gy = dFdy(e);
	vec4 c = clamp(e / max(sqrt(gx * gx + gy * gy), vec4(1e-12)) + 0.5, 0.0, 1.0);
	COLOR = texture(TEXTURE, a.xy / a.z) * (c.x * c.y * c.z * c.w);
}
"""

func _shared_quad(item: RID, texture: RID, m: Array, size: Vector2, clip: Rect2) -> void:
	rs.canvas_item_clear(item)
	var outline := Comp.visible_polygon(m, size, clip, 1.0)
	if outline.size() < 3:
		return
	var k: Array = Comp.screen_to_plane(m, size)
	var colours := PackedColorArray()
	var uvs := PackedVector2Array()
	for point in outline:
		var s: float = k[0][0] * point.x + k[0][1] * point.y + k[0][2]
		var t: float = k[1][0] * point.x + k[1][1] * point.y + k[1][2]
		var w: float = k[2][0] * point.x + k[2][1] * point.y + k[2][2]
		uvs.append(Vector2(s, t))
		colours.append(Color(w, 0.0, 0.0, 1.0))
	rs.canvas_item_add_polygon(item, outline, colours, uvs, texture)

func alt2_shared() -> void:
	var viewport: Array = h.spec.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var card: Dictionary = h.spec.card
	var card_size := Vector2(card.width, card.height)
	var shader := rs.shader_create()
	rs.shader_set_code(shader, SHARED_SHADER)
	var shared := rs.material_create()
	rs.material_set_shader(shared, shader)
	var report := {}
	for dpr in [1, 2]:
		for scenario in h.spec.scenarios:
			if not ["p35", "steep", "tz"].has(scenario.id):
				continue
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			var r: float = h.raster_scale(m, card_size, dpr)
			for variant in ["per-layer", "shared", "per-layer-modulated", "shared-modulated"]:
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var keep: ImageTexture = h.chrome_flat(r)
				var quad: RID = h.new_item(stage.canvas, 1)
				var material := RID()
				var clip := Rect2(Vector2(-64, -64), css_size + Vector2(128, 128))
				if variant.begins_with("per-layer"):
					material = comp.make_material(keep.get_rid(), 1)
					comp.set_material_matrix(material, m, card_size)
					comp.set_quad(quad, material, m, card_size, clip)
				else:
					rs.canvas_item_set_material(quad, shared)
					rs.canvas_item_set_default_texture_filter(quad, RenderingServer.CANVAS_ITEM_TEXTURE_FILTER_LINEAR)
					_shared_quad(quad, keep.get_rid(), m, card_size, clip)
				if variant.ends_with("modulated"):
					rs.canvas_item_set_modulate(quad, Color(0.5, 0.5, 0.5, 0.5))
				await h.capture(stage, "%s/%s/alt-%s-%s-dpr%d.png" % [h.out_dir, h.tag, variant, scenario.id, dpr])
				if material.is_valid():
					rs.free_rid(material)
				h.free_tracked()
				h.free_stage(stage)
	# The cost of the calls themselves from GDScript: one material_set_param, and one polygon rebuild.
	var probe := rs.material_create()
	rs.material_set_shader(probe, shader)
	var iterations := 20000
	var start := Time.get_ticks_usec()
	for i in iterations:
		rs.material_set_param(probe, "unused", Vector3(i, 0, 0))
	report["material_set_param_us"] = float(Time.get_ticks_usec() - start) / iterations
	var item: RID = h.new_item(RID())
	var m0: Array = Comp.scenario_matrix(h.spec.scenarios[0], card, viewport)
	var clip0 := Rect2(Vector2(-64, -64), css_size + Vector2(128, 128))
	var texture := RID()
	start = Time.get_ticks_usec()
	for i in 2000:
		_shared_quad(item, texture, m0, card_size, clip0)
	report["shared_quad_rebuild_us"] = float(Time.get_ticks_usec() - start) / 2000
	var per_material: RID = comp.make_material(RID(), 1)
	start = Time.get_ticks_usec()
	for i in 2000:
		comp.set_material_matrix(per_material, m0, card_size)
		comp.set_quad(item, per_material, m0, card_size, clip0)
	report["per_layer_matrix_and_quad_us"] = float(Time.get_ticks_usec() - start) / 2000
	rs.free_rid(per_material)
	rs.free_rid(probe)
	rs.free_rid(shared)
	rs.free_rid(shader)
	h.free_tracked()
	_result("alt2_shared", report)
