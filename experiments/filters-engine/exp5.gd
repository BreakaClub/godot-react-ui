extends SceneTree
# Does an ancestor's scissor clip apply to a canvas group's children and to its composite?

var holder: Node2D
var rs := RenderingServer
var freed: Array = []

func _initialize() -> void:
	holder = Node2D.new()
	root.add_child(holder)
	await process_frame
	for variant in ["plain-child", "group", "group-with-material", "composite-fills", "wrapper-clips", "plain-fill-material", "own-command"]:
		await _run(variant)
	quit()

func _item(parent: RID, index: int) -> RID:
	var item := rs.canvas_item_create()
	rs.canvas_item_set_parent(item, parent)
	rs.canvas_item_set_draw_index(item, index)
	freed.append(item)
	return item

func _run(variant: String) -> void:
	var parent := holder.get_canvas_item()
	var bg := _item(parent, 0)
	rs.canvas_item_add_rect(bg, Rect2(0, 0, 640, 360), Color(0.4, 0.45, 0.55))
	# The clipper: clip on, custom rect = its padding box (40,40)-(200,140).
	var clipper := _item(parent, 1)
	rs.canvas_item_set_transform(clipper, Transform2D(0.0, Vector2(40, 40)))
	rs.canvas_item_set_custom_rect(clipper, true, Rect2(0, 0, 160, 100))
	rs.canvas_item_set_clip(clipper, true)
	var host := clipper
	if variant == "plain-fill-material":
		var shader3 := rs.shader_create()
		rs.shader_set_code(shader3, "shader_type canvas_item;\nvoid fragment() { COLOR = vec4(0.0, 0.0, 0.0, 1.0); }\n")
		var material3 := rs.material_create()
		rs.material_set_shader(material3, shader3)
		var filler := _item(clipper, 0)
		rs.canvas_item_add_rect(filler, Rect2(-40, -40, 400, 260), Color.WHITE)
		rs.canvas_item_set_material(filler, material3)
	if variant != "plain-child":
		var wrap := _item(clipper, 0)
		rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 0.0, false)
		if variant == "own-command":
			# The wrapper draws its own rectangle (so the engine does not clear() it each frame) and fit_empty is off.
			rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, false, 0.0, false)
			rs.canvas_item_add_rect(wrap, Rect2(-40, -40, 400, 260), Color.WHITE)
			var shader4 := rs.shader_create()
			rs.shader_set_code(shader4, "shader_type canvas_item;\nvoid fragment() { COLOR = vec4(0.0, 0.0, 0.0, 1.0); }\n")
			var material4 := rs.material_create()
			rs.material_set_shader(material4, shader4)
			rs.canvas_item_set_material(wrap, material4)
		if variant == "composite-fills" or variant == "wrapper-clips":
			# The composite paints black everywhere in its rect, whatever the buffer holds: a pure test of the composite's scissor.
			var shader2 := rs.shader_create()
			rs.shader_set_code(shader2, "shader_type canvas_item;\nvoid fragment() { COLOR = vec4(0.0, 0.0, 0.0, 1.0); }\n")
			var material2 := rs.material_create()
			rs.material_set_shader(material2, shader2)
			rs.canvas_item_set_material(wrap, material2)
			if variant == "wrapper-clips":
				# The wrapper clips to the visible part of the ancestors' clip, in its own frame (the clipper's, at (40,40)).
				rs.canvas_item_set_custom_rect(wrap, true, Rect2(0, 0, 160, 100))
				rs.canvas_item_set_clip(wrap, true)
			var bounds := _item(wrap, 1)
			rs.canvas_item_set_custom_rect(bounds, true, Rect2(-40, -40, 400, 260))
			rs.canvas_item_add_rect(bounds, Rect2(0, 0, 1, 1), Color(0, 0, 0, 0))
		if variant == "group-with-material":
			var shader := rs.shader_create()
			rs.shader_set_code(shader, "shader_type canvas_item;\nuniform sampler2D t : hint_screen_texture, filter_linear;\nvoid fragment() { vec4 c = textureLod(t, SCREEN_UV, 0.0); COLOR = c; }\n")
			var material := rs.material_create()
			rs.material_set_shader(material, shader)
			rs.canvas_item_set_material(wrap, material)
		host = wrap
	# Content that reaches far outside the clipper: a black box (150,10)-(300,90) in clipper space.
	var content := _item(host, 0)
	rs.canvas_item_add_rect(content, Rect2(150, 10, 150, 80), Color.BLACK)
	await process_frame
	await process_frame
	rs.force_draw()
	var image := root.get_texture().get_image()
	print(variant, ": inside clip (195,80)=", image.get_pixel(195, 80).r, " beyond clip right (250,80)=", image.get_pixel(250, 80).r, " (page grey 0.4; clipped means 0.4 beyond x=200)")
	for item in freed:
		rs.free_rid(item)
	freed.clear()
